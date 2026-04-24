import os
import time
import logging
from logging.handlers import RotatingFileHandler

import streamlit as st
import subprocess
import sys
import tempfile
import pandas as pd

# =========================
# LOGGING SETUP
# =========================
def setup_logger():
    os.makedirs("logs", exist_ok=True)
    logger = logging.getLogger("ecg_app")
    logger.setLevel(logging.INFO)

    # Evita handlers duplicados si Streamlit recarga
    if not logger.handlers:
        handler = RotatingFileHandler("logs/app.log", maxBytes=2_000_000, backupCount=5)
        fmt = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
        handler.setFormatter(fmt)
        logger.addHandler(handler)

    return logger

logger = setup_logger()

# =========================
# HELPERS
# =========================
def get_client_meta():
    # Streamlit no siempre expone IP real directo; depende de despliegue (nginx, cloud).
    # Si usas reverse proxy, puedes pasar headers. En local, puede venir vacío.
    headers = st.context.headers if hasattr(st, "context") else {}
    ip = headers.get("x-forwarded-for", "").split(",")[0].strip() if headers else ""
    ua = headers.get("user-agent", "") if headers else ""
    return ip or "unknown-ip", ua or "unknown-ua"

def read_credentials():
    # 1) Streamlit secrets (recomendado)
    user = None
    pwd = None
    if "APP_USER" in st.secrets and "APP_PASS" in st.secrets:
        user = st.secrets["APP_USER"]
        pwd = st.secrets["APP_PASS"]

    # 2) fallback env vars
    user = user or os.getenv("APP_USER")
    pwd = pwd or os.getenv("APP_PASS")

    if not user or not pwd:
        raise RuntimeError("No hay credenciales configuradas. Define APP_USER y APP_PASS en secrets.toml o variables de entorno.")
    return user, pwd

def init_session():
    st.session_state.setdefault("auth_ok", False)
    st.session_state.setdefault("fail_count", 0)
    st.session_state.setdefault("cooldown_until", 0.0)
    st.session_state.setdefault("username", "")

def log_event(event: str, username: str = "-", extra: str = ""):
    ip, ua = get_client_meta()
    logger.info(f"event={event} user={username} ip={ip} ua={ua} {extra}".strip())

def do_logout():
    log_event("logout", st.session_state.get("username", "-"))
    st.session_state["auth_ok"] = False
    st.session_state["username"] = ""

# =========================
# UI: LOGIN
# =========================
def login_view():
    st.title("ECG Monitor — Login")
    st.caption("Acceso restringido")

    now = time.time()
    cooldown_until = st.session_state["cooldown_until"]
    if now < cooldown_until:
        remaining = int(cooldown_until - now)
        st.warning(f"Demasiados intentos fallidos. Intenta de nuevo en {remaining}s.")
        return

    with st.form("login_form", clear_on_submit=False):
        username = st.text_input("Usuario", placeholder="admin")
        password = st.text_input("Contraseña", type="password", placeholder="••••••••")
        submit = st.form_submit_button("Ingresar")

    if submit:
        cfg_user, cfg_pass = read_credentials()

        if username == cfg_user and password == cfg_pass:
            st.session_state["auth_ok"] = True
            st.session_state["username"] = username
            st.session_state["fail_count"] = 0
            st.session_state["cooldown_until"] = 0.0
            log_event("login_success", username)
            st.rerun()
        else:
            st.session_state["fail_count"] += 1
            log_event("login_failed", username or "-", extra=f"fail_count={st.session_state['fail_count']}")

            # Cooldown progresivo
            if st.session_state["fail_count"] >= 5:
                st.session_state["cooldown_until"] = time.time() + 60  # 1 minuto
                st.session_state["fail_count"] = 0

            st.error("Credenciales incorrectas.")

# =========================
# UI: APP (PROTEGIDA)
# =========================
def app_view():
    st.title("ECG Monitor — Dashboard")
    st.caption(f"Sesión activa: **{st.session_state['username']}**")

    col1, col2 = st.columns([1, 1])
    with col2:
        if st.button("Cerrar sesión", use_container_width=True):
            do_logout()
            st.rerun()

    st.divider()

    # Aquí iría tu monitor en vivo:
    # - gráfico ECG (últimos 10–20 s)
    # - HR mediana
    # - estado electrodos/ruido
    #
    # Por ahora dejo placeholders.
    st.subheader("Estado")
    st.metric("HR (mediana)", "— bpm")
    st.metric("Calidad señal", "—")

    st.subheader("ECG (últimos segundos)")
    st.info("Conecta aquí tu stream/buffer de adquisición (FastAPI/WebSocket o proceso local).")

    # Ejemplo: zona de logs visibles (opcional)
    with st.expander("Ver últimas líneas del log"):
        try:
            with open("logs/app.log", "r", encoding="utf-8") as f:
                lines = f.readlines()[-50:]
            st.code("".join(lines))
        except FileNotFoundError:
            st.write("Aún no hay logs.")

    # ===== Integración con postprocess_ecg.py =====
    st.subheader("Postproceso / Extracción de R-peaks")
    with st.expander("Procesar archivo raw o subir uno"):
        uploaded = st.file_uploader("Sube CSV raw (Tiempo_s,Voltaje_V)", type=["csv"] )
        use_default = st.checkbox("Usar archivo por defecto (captura_ecg_real.csv)", value=True)

        if uploaded is not None:
            save_path = "captura_ecg_real.csv"
            with open(save_path, "wb") as f:
                f.write(uploaded.getbuffer())
            st.success(f"Archivo subido y guardado como {save_path}")
            use_default = True

        if st.button("Ejecutar postprocess", use_container_width=True):
            with st.spinner("Procesando con postprocess_ecg..."):
                df_f = None
                df_r = None
                proc = None
                # Intentar import directo (más rápido y limpio)
                try:
                    import postprocess_ecg
                    arg_infile = "captura_ecg_real.csv" if uploaded is not None else None
                    df_f, df_r = postprocess_ecg.process(infile=arg_infile)
                except Exception as exc_import:
                    # Fallback: ejecutar como subprocess si import falla
                    try:
                        proc = subprocess.run([sys.executable, "postprocess_ecg.py"], capture_output=True, text=True, check=False)
                    except Exception as e:
                        st.error(f"No se pudo ejecutar el script: {e}")
                        proc = None

            # Mostrar resultados si se obtuvieron por import
            if df_f is not None and df_r is not None:
                st.success("Postproceso completado — resultados cargados (import).")
                if "Tiempo_s" in df_f.columns and "Voltaje_V" in df_f.columns:
                    chart_df = df_f.set_index("Tiempo_s")["Voltaje_V"]
                    st.line_chart(chart_df)
                st.subheader("R-peaks detectados")
                st.dataframe(df_r)
                if "HR_bpm" in df_r.columns and not df_r["HR_bpm"].dropna().empty:
                    med = float(df_r["HR_bpm"].dropna().median())
                    st.metric("HR (mediana)", f"{med:.1f} bpm")
            else:
                # Si usamos subprocess, mostrar su output y leer archivos generados
                if proc is not None:
                    out = proc.stdout or ""
                    err = proc.stderr or ""
                    if out:
                        st.code(out)
                    if err:
                        st.code("STDERR:\n" + err)

                    if proc.returncode != 0:
                        st.error(f"Postproceso finalizó con código {proc.returncode}.")
                    else:
                        try:
                            df_f = pd.read_csv("ecg_250Hz_filtrado.csv")
                            df_r = pd.read_csv("rpeaks_250Hz.csv")
                            st.success("Postproceso completado — resultados cargados (subprocess).")
                            if "Tiempo_s" in df_f.columns and "Voltaje_V" in df_f.columns:
                                chart_df = df_f.set_index("Tiempo_s")["Voltaje_V"]
                                st.line_chart(chart_df)
                            st.subheader("R-peaks detectados")
                            st.dataframe(df_r)
                            if "HR_bpm" in df_r.columns and not df_r["HR_bpm"].dropna().empty:
                                med = float(df_r["HR_bpm"].dropna().median())
                                st.metric("HR (mediana)", f"{med:.1f} bpm")
                        except FileNotFoundError:
                            st.error("No se encontraron los archivos de salida esperados (ecg_250Hz_filtrado.csv / rpeaks_250Hz.csv).")
                        except Exception as e:
                            st.error(f"Error leyendo resultados: {e}")
                else:
                    st.error("No se pudieron obtener resultados del postproceso.")

# =========================
# MAIN
# =========================
def main():
    st.set_page_config(page_title="ECG Monitor", layout="wide")
    init_session()

    if not st.session_state["auth_ok"]:
        login_view()
    else:
        app_view()

if __name__ == "__main__":
    main()
