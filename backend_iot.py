
from fastapi.middleware.cors import CORSMiddleware
import RPi.GPIO as GPIO
from postprocess_ecg import process_window

import os
import time
import json
import threading
import logging
from logging.handlers import RotatingFileHandler
from collections import deque
from typing import Deque, Optional, Dict, Any
import asyncio
import numpy as np

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request

# ====== HARDWARE (Blinka) ======
import board
import busio
import adafruit_ads1x15.ads1115 as ADS
from adafruit_ads1x15.analog_in import AnalogIn


# ============================================================
# CONFIG
# ============================================================
DEVICE_NAME = "raspi-ecg-edge"
I2C_ADDRESS = 0x48
ADC_CHANNEL = 0  # A0
ADC_DATA_RATE = 250  # SPS interno del ADS1115

# Buffer y análisis
BUFFER_S = 25.0         # segundos en buffer
WINDOW_S = 10.0         # ventana (para decidir qué parte del buffer analizar)
UPDATE_EVERY_S = 2.0    # cada cuánto recalcula métricas
FS_TARGET = 250.0       # re-muestreo para análisis (en process_window)

# Detector (parámetros que consume process_window)
THR_NORM = 0.12

# API key para endpoints/WS
API_KEY = os.getenv("ECG_API_KEY", "devkey-123")

# ====== GPIO (Lead-off + Shutdown) ======
GPIO_LO_PLUS = 17   # Pin 11
GPIO_LO_MINUS = 27  # Pin 13
GPIO_SDN = 26       # Pin 37 (TU PIN)

# En muchos módulos: LO+ / LO- = 1 cuando hay electrodo desconectado
LEAD_OFF_ACTIVE_HIGH = True

# Apagar el AD8232 cuando detecta lead-off
AUTO_SHUTDOWN_ON_LEAD_OFF = True

# Debounce: lecturas consecutivas para confirmar cambio
LEAD_OFF_DEBOUNCE_N = 3


# ============================================================
# LOGGING
# ============================================================
os.makedirs("logs", exist_ok=True)
logger = logging.getLogger("iot_backend")
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = RotatingFileHandler("logs/backend.log", maxBytes=2_000_000, backupCount=5)
    fmt = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    handler.setFormatter(fmt)
    logger.addHandler(handler)

def log_event(event: str, extra: str = ""):
    logger.info(f"event={event} {extra}".strip())


# ============================================================
# SHARED STATE
# ============================================================
class SharedState:
    def __init__(self):
        self.lock = threading.Lock()
        self.buf_t: Deque[float] = deque()
        self.buf_v: Deque[float] = deque()

        self.last_metrics: Dict[str, Any] = {
            "device": DEVICE_NAME,
            "ts": None,
            "fs_est": None,

            "hr_median": None,
            "hr_mean": None,
            "rpeaks": 0,
            "quality": "unknown",
            "note": "",

            "rr_s": [],
            "sdnn_ms": None,
            "rmssd_ms": None,
            "pnn50": None,

            # NUEVO: lead-off + SDN
            "lead_off": None,
            "lo_plus": None,
            "lo_minus": None,
            "sdn": None,
        }

        self.running = False
        self.hw_ok = False
        self.hw_error = ""
        self.clients = 0

STATE = SharedState()


# ============================================================
# GPIO HELPERS
# ============================================================
def gpio_setup():
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)

    # Entradas LO+/LO- (evita pines flotantes)
    GPIO.setup(GPIO_LO_PLUS, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
    GPIO.setup(GPIO_LO_MINUS, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

    # Salida SDN
    GPIO.setup(GPIO_SDN, GPIO.OUT)
    GPIO.output(GPIO_SDN, GPIO.HIGH)  # AD8232 activo

def read_lead_off() -> Dict[str, bool]:
    lo_p = GPIO.input(GPIO_LO_PLUS)
    lo_m = GPIO.input(GPIO_LO_MINUS)

    if LEAD_OFF_ACTIVE_HIGH:
        lead_off = bool(lo_p or lo_m)
    else:
        # alternativa si tu módulo trabaja active-low (raro, pero existe)
        lead_off = not (bool(lo_p) and bool(lo_m))

    return {"lead_off": lead_off, "lo_plus": bool(lo_p), "lo_minus": bool(lo_m)}

def set_sdn(enabled: bool):
    GPIO.output(GPIO_SDN, GPIO.HIGH if enabled else GPIO.LOW)


# ============================================================
# HELPERS
# ============================================================
def require_api_key(request: Request):
    key = request.headers.get("x-api-key", "")
    if key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

def estimate_fs(t: np.ndarray) -> Optional[float]:
    if len(t) < 20:
        return None
    dt = np.diff(t)
    dt = dt[dt > 0]
    if len(dt) < 10:
        return None
    return float(1.0 / np.mean(dt))

def compute_metrics_from_window(t: np.ndarray, v: np.ndarray) -> Dict[str, Any]:
    """
    Llama a process_window() (postprocess_ecg.py) para calcular HR + HRV.
    """
    return process_window(t, v, fs=FS_TARGET, thr_norm=THR_NORM)


# ============================================================
# ACQUISITION THREAD
# ============================================================
def acquisition_worker():
    log_event("acq_start")

    try:
        i2c = busio.I2C(board.SCL, board.SDA)
        ads = ADS.ADS1115(i2c, address=I2C_ADDRESS)
        ads.data_rate = ADC_DATA_RATE
        chan = AnalogIn(ads, ADC_CHANNEL)

        STATE.hw_ok = True
        STATE.hw_error = ""
        log_event("hw_ok", f"addr=0x{I2C_ADDRESS:02X} ch={ADC_CHANNEL} dr={ADC_DATA_RATE}")
    except Exception as e:
        STATE.hw_ok = False
        STATE.hw_error = str(e)
        log_event("hw_error", f"msg={STATE.hw_error}")
        return

    STATE.running = True
    t_start = time.perf_counter()
    t_last_metrics = 0.0

    # Debounce counters
    lead_off_count = 0
    lead_on_count = 0

    while STATE.running:
        now = time.perf_counter() - t_start
        val = float(chan.voltage)

        # Guardar en buffer
        with STATE.lock:
            STATE.buf_t.append(now)
            STATE.buf_v.append(val)

            while STATE.buf_t and (STATE.buf_t[-1] - STATE.buf_t[0]) > BUFFER_S:
                STATE.buf_t.popleft()
                STATE.buf_v.popleft()

        # Actualizar métricas cada UPDATE_EVERY_S
        if now - t_last_metrics >= UPDATE_EVERY_S:
            t_last_metrics = now

            # 1) Lead-off + SDN (debounced)
            lo = {"lead_off": None, "lo_plus": None, "lo_minus": None}
            sdn_state: Optional[bool] = None
            lead_off_confirmed = False

            try:
                lo = read_lead_off()

                if lo["lead_off"]:
                    lead_off_count += 1
                    lead_on_count = 0
                else:
                    lead_on_count += 1
                    lead_off_count = 0

                lead_off_confirmed = (lead_off_count >= LEAD_OFF_DEBOUNCE_N)
                lead_on_confirmed = (lead_on_count >= LEAD_OFF_DEBOUNCE_N)

                if AUTO_SHUTDOWN_ON_LEAD_OFF and lead_off_confirmed:
                    set_sdn(False)
                    sdn_state = False
                elif lead_on_confirmed:
                    set_sdn(True)
                    sdn_state = True
                else:
                    # Mantener estado actual si no hay confirmación aún
                    sdn_state = bool(GPIO.input(GPIO_SDN))

            except Exception as e:
                log_event("lead_off_error", f"msg={str(e)}")

            # 2) Copiar buffer para análisis
            with STATE.lock:
                t_arr = np.array(STATE.buf_t, dtype=float)
                v_arr = np.array(STATE.buf_v, dtype=float)

            fs_est = estimate_fs(t_arr)

            # Última ventana WINDOW_S
            if len(t_arr) > 0:
                t1 = t_arr[-1]
                m = t_arr >= (t1 - WINDOW_S)
                t_win = t_arr[m]
                v_win = v_arr[m]
            else:
                t_win = t_arr
                v_win = v_arr

            # 3) Si lead-off confirmado: no calcules HR/HRV (evita basura)
            if lead_off_confirmed:
                metrics = {
                    "hr_median": None,
                    "hr_mean": None,
                    "rpeaks": 0,
                    "quality": "leads_off",
                    "note": "electrodes disconnected",
                    "rr_s": [],
                    "sdnn_ms": None,
                    "rmssd_ms": None,
                    "pnn50": None,
                }
            else:
                metrics = compute_metrics_from_window(t_win, v_win)

            # 4) Publicar estado
            with STATE.lock:
                STATE.last_metrics.update({
                    "device": DEVICE_NAME,
                    "ts": time.time(),
                    "fs_est": fs_est,
                    **metrics,
                    "lead_off": lo["lead_off"],
                    "lo_plus": lo["lo_plus"],
                    "lo_minus": lo["lo_minus"],
                    "sdn": sdn_state,
                })

        # evita CPU al 100%
        time.sleep(0.0005)

    log_event("acq_stop")


def start_acquisition():
    if STATE.running:
        return
    th = threading.Thread(target=acquisition_worker, daemon=True)
    th.start()


# ============================================================
# FASTAPI APP
# ============================================================
app = FastAPI(title="ECG IoT Backend", version="0.3.0")

# NUEVO: Configuración de CORS para que tu celular pueda conectar
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"ok": True, "service": "ECG IoT Backend"}

@app.get("/health")
def health():
    return {"ok": True, "device": DEVICE_NAME}



@app.on_event("startup")
def on_startup():
    log_event("startup")
    try:
        gpio_setup()
        log_event("gpio_ok", f"lo+=GPIO{GPIO_LO_PLUS} lo-=GPIO{GPIO_LO_MINUS} sdn=GPIO{GPIO_SDN}")
    except Exception as e:
        log_event("gpio_error", f"msg={str(e)}")
    start_acquisition()

@app.on_event("shutdown")
def on_shutdown():
    log_event("shutdown")
    STATE.running = False
    try:
        GPIO.cleanup()
    except Exception:
        pass

# ... (Tus imports y configuración inicial se mantienen iguales hasta la línea 345) ...

@app.websocket("/ws/ecg")
async def ws_ecg(websocket: WebSocket):
    api_key = websocket.query_params.get("api_key", "")
    if api_key != API_KEY:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    with STATE.lock:
        STATE.clients += 1
    log_event("ws_connect", f"clients={STATE.clients}")
    
    try:
        while True:
            # 1. Espera activa para no saturar el CPU
            await asyncio.sleep(0.1) 

            with STATE.lock:
                metrics = dict(STATE.last_metrics)
                # Convertimos de Deque a Numpy para procesar
                t_arr = np.array(STATE.buf_t, dtype=float)
                v_arr = np.array(STATE.buf_v, dtype=float)

            # 2. Lógica de segmentación (Lo que faltaba para que no de error)
            if len(t_arr) > 0:
                t_last = t_arr[-1]
                # Tomamos los últimos 2 segundos para la gráfica del monitor
                mask = t_arr >= (t_last - 2.0)
                t2 = t_arr[mask]
                v2 = v_arr[mask]

                # 3. Limitación de puntos para fluidez en el celular
                max_pts = 400
                if len(t2) > max_pts:
                    indices = np.linspace(0, len(t2) - 1, max_pts).astype(int)
                    t2 = t2[indices]
                    v2 = v2[indices]
            else:
                t2, v2 = np.array([]), np.array([])

            # 4. Envío del paquete de datos
            payload = {
                "device": DEVICE_NAME,
                "metrics": metrics,
                "samples": {
                    "t": t2.tolist(), 
                    "v": v2.tolist()
                },
            }
            await websocket.send_json(payload)

    except WebSocketDisconnect:
        log_event("ws_disconnect")
    except Exception as e:
        log_event("ws_error", f"msg={str(e)}")
    finally:
        with STATE.lock:
            STATE.clients = max(0, STATE.clients - 1)
        log_event("ws_cleanup", f"clients_remaining={STATE.clients}")

# Elimina la función asyncio_sleep del final, ya no es necesaria con el import global
