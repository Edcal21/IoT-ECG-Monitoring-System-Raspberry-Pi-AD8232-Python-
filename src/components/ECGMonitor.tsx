import React, { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowLeft, Heart, Plug, Power, Signal, User, Zap, Bell } from "lucide-react";
// Si NO estás usando logout, puedes dejar solo la llamada o quitar el hook.
import { useAuth } from "../contexts/AuthContext";

type Metrics = {
  hr_median?: number | null;
  hr_mean?: number | null;
  rpeaks?: number | null;
  fs_est?: number | null;
  rmssd_ms?: number | null;
  sdnn_ms?: number | null;
  pnn50?: number | null;
  quality?: string | null;
  note?: string | null;

  // Backend nuevo
  lead_off?: boolean | null;
  lo_plus?: boolean | null;
  lo_minus?: boolean | null;
  sdn?: boolean | null;

  // Opcionales futuros (si luego los mandas desde backend)
  snr_db?: number | null;
  artifacts_pct?: number | null;

  ts?: number | null;
  device?: string | null;
};

type Samples = {
  t?: number[];
  v?: number[];
};

type Payload = {
  device?: string;
  metrics: Metrics;
  samples: Samples;
};

type AlertItem = {
  id: number;
  message: string;
  time: string;
  type: "warning" | "info" | "error";
};

type ConnectionState = "disconnected" | "connecting" | "connected";

const API_KEY = "devkey-123";
const WS_URL = `ws://${window.location.hostname}:8000/ws/ecg?api_key=${API_KEY}`;

function fmtBool(v: boolean | null | undefined) {
  if (v === true) return "1";
  if (v === false) return "0";
  return "--";
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function ECGMonitor({ onBack }: { onBack: () => void }) {
  const { logout } = useAuth();
  // useAuth(); // si no lo usas, comenta esta línea y el import.

  // Estado WS
  const [isConnected, setIsConnected] = useState(false);
  const [data, setData] = useState<Payload>({
    metrics: {},
    samples: { t: [], v: [] },
  });

  // UI / demo device
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState(85);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showAlerts, setShowAlerts] = useState(false);

  const [alerts, setAlerts] = useState<AlertItem[]>([
    { id: 1, message: "Calidad de señal óptima", time: "10:15", type: "info" },
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<number | null>(null);

  // ===== WebSocket =====
  useEffect(() => {
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => setIsConnected(true);

    socket.onmessage = (event) => {
      try {
        const payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        const normalized: Payload = {
          device: payload?.device ?? "raspi-ecg-edge",
          metrics: payload?.metrics ?? {},
          samples: {
            t: payload?.samples?.t ?? [],
            v: payload?.samples?.v ?? [],
          },
        };

        setData(normalized);
      } catch (e) {
        console.error("WS parse error:", e);
      }
    };

    socket.onclose = () => setIsConnected(false);
    socket.onerror = () => setIsConnected(false);

    return () => socket.close();
  }, []);

  // ===== Lead-off / Electrodos =====
  const m = data.metrics ?? {};

  const leadOff = useMemo(() => {
    if (m.lead_off === true) return true;
    if (m.quality === "leads_off") return true;
    if (m.lead_off === false) return false;
    return null;
  }, [m.lead_off, m.quality]);

  const leadOffConfirmed = m.lead_off === true || m.quality === "leads_off";

  const leadStatusLabel = useMemo(() => {
    if (leadOff === true) return "ELECTRODOS DESCONECTADOS";
    if (leadOff === false) return "ELECTRODOS OK";
    return "ELECTRODOS: --";
  }, [leadOff]);

  const leadStatusClass = useMemo(() => {
    if (leadOff === true) return "text-red-400";
    if (leadOff === false) return "text-emerald-400";
    return "text-slate-400";
  }, [leadOff]);

  // ===== Métricas robustas =====
  const hr = leadOffConfirmed ? null : (m.hr_median ?? null);
  const rmssd = leadOffConfirmed ? null : (m.rmssd_ms ?? null);
  const fs = m.fs_est ?? null;
  const rpeaks = leadOffConfirmed ? null : (m.rpeaks ?? null);

  // ===== Calidad (si backend no manda aún, fallback demo) =====
  const snrDb = (m.snr_db ?? 29);
  const artifactsPct = (m.artifacts_pct ?? 3);
  const electrodeLoose = leadOffConfirmed;

  // ===== Botones demo (solo frontend) =====
  const connectDevice = () => {
    setConnectionState("connecting");
    setTimeout(() => {
      setConnectionState("connected");
      setAlerts((prev) => [
        {
          id: Date.now(),
          message: "Dispositivo conectado (demo)",
          time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
          type: "info",
        },
        ...prev.slice(0, 9),
      ]);
    }, 1200);
  };

  const disconnectDevice = () => {
    setConnectionState("disconnected");
    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setRecordingTime(0);
  };

  const startRecording = () => {
    if (connectionState !== "connected") {
      setAlerts((prev) => [
        {
          id: Date.now(),
          message: "Conecta el dispositivo primero (demo)",
          time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
          type: "warning",
        },
        ...prev.slice(0, 9),
      ]);
      return;
    }

    setIsRecording(true);
    setIsPaused(false);
    setRecordingTime(0);

    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;

    setRecordings((prev) => prev + 1);
    setAlerts((prev) => [
      {
        id: Date.now(),
        message: `Grabación guardada (demo): ${formatTime(recordingTime)}`,
        time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        type: "info",
      },
      ...prev.slice(0, 9),
    ]);
  };

  const togglePause = () => setIsPaused((p) => !p);

  const exportData = () => {
    setAlerts((prev) => [
      {
        id: Date.now(),
        message: "Exportar (demo): se generará CSV cuando conectes backend",
        time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        type: "info",
      },
      ...prev.slice(0, 9),
    ]);
  };

  const showHistoryFn = () => {
    setAlerts((prev) => [
      {
        id: Date.now(),
        message: "Historial HRV (demo): pendientes de backend/DB",
        time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        type: "info",
      },
      ...prev.slice(0, 9),
    ]);
  };

  // Batería demo
  useEffect(() => {
    const batteryInterval = window.setInterval(() => {
      if (connectionState === "connected") {
        setBatteryLevel((prev) => Math.max(0, prev - 0.1));
      }
    }, 60000);

    return () => window.clearInterval(batteryInterval);
  }, [connectionState]);

  // ===== Dibujo ECG (usa WS real) =====
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;

    // Fondo
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, width, height);

    // Rejilla
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 0.5;

    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    const v = data.samples?.v ?? [];
    if (!v || v.length === 0) return;

    const drawColor = leadOffConfirmed ? "#f59e0b" : "#10b981";
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 2;

    const gainScale = 100 * zoomLevel; // zoom aplicado
    const vCenter = 1.65;

    ctx.beginPath();
    const step = width / v.length;
    for (let i = 0; i < v.length; i++) {
      const y = height / 2 - (v[i] - vCenter) * gainScale;
      if (i === 0) ctx.moveTo(0, y);
      else ctx.lineTo(i * step, y);
    }
    ctx.stroke();

    // Overlay si lead-off
    if (leadOffConfirmed) {
      ctx.fillStyle = "rgba(2, 6, 23, 0.55)";
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 18px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillText("ELECTRODOS DESCONECTADOS", 20, 40);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas";
      ctx.fillText("Conectá RA / LA / RL para continuar medición", 20, 60);
    }
  }, [data, leadOffConfirmed, zoomLevel]);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <div className="mx-auto max-w-7xl px-4 py-6">

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <button
            onClick={() => { logout(); onBack?.(); }}
            className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-white flex items-center gap-2 transition-all"
          >
            <ArrowLeft size={18} /> Volver
          </button>

          <div className="flex flex-col items-end">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className={isConnected ? "text-emerald-400 animate-pulse" : "text-slate-600"} />
              MONITOR MEDINIC
            </h2>

            <span className={`text-[10px] font-bold ${isConnected ? "text-emerald-500" : "text-red-500"}`}>
              {isConnected ? "● TRANSMISIÓN ACTIVA" : "○ BUSCANDO RASPBERRY..."}
            </span>

            <div className="mt-2 flex items-center gap-3 text-[10px] font-mono">
              <span className={`flex items-center gap-1 ${leadStatusClass}`}>
                <Plug size={14} /> {leadStatusLabel}
              </span>

              <span className="text-slate-400 flex items-center gap-1">
                <Power size={14} />
                SDN:{" "}
                <span className="text-white">
                  {m.sdn === null || m.sdn === undefined ? "--" : m.sdn ? "ON" : "OFF"}
                </span>
              </span>

              <button
                onClick={() => setShowAlerts((s) => !s)}
                className="ml-2 inline-flex items-center gap-1 text-slate-300 hover:text-white"
                title="Alertas"
              >
                <Bell size={14} />
                <span className="text-[10px]">{alerts.length}</span>
              </button>
            </div>

            <div className="mt-1 text-[10px] font-mono text-slate-400">
              LO+: <span className="text-white">{fmtBool(m.lo_plus)}</span>{" "}
              LO-: <span className="text-white">{fmtBool(m.lo_minus)}</span>{" "}
              Q: <span className="text-white">{m.quality ?? "--"}</span>
            </div>

            <div className="mt-1 text-[10px] font-mono text-slate-400">
              Batería (demo): <span className={batteryLevel > 20 ? "text-emerald-300" : "text-red-300"}>{Math.round(batteryLevel)}%</span>
            </div>
          </div>
        </div>

        {/* Alertas */}
        {showAlerts && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 px-5 py-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-200">Alertas recientes</div>
              <button
                onClick={() => setShowAlerts(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto text-sm">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-slate-200">{a.message}</div>
                    <div className="text-[11px] text-slate-500">{a.time}</div>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                    a.type === "error" ? "border-red-500/30 text-red-300 bg-red-500/10"
                    : a.type === "warning" ? "border-amber-500/30 text-amber-300 bg-amber-500/10"
                    : "border-sky-500/30 text-sky-300 bg-sky-500/10"
                  }`}>
                    {a.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accesos rápidos */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={showHistoryFn}
            className="h-16 rounded-xl border border-slate-800 bg-slate-900/20 hover:bg-slate-900/35 text-slate-300 text-xs flex flex-col items-center justify-center gap-1"
          >
            <span>🕘</span>
            <span>Historial HRV</span>
          </button>

          <button
            onClick={exportData}
            className="h-16 rounded-xl border border-slate-800 bg-slate-900/20 hover:bg-slate-900/35 text-slate-300 text-xs flex flex-col items-center justify-center gap-1"
          >
            <span>⬇️</span>
            <span>Exportar</span>
          </button>

          <button
            onClick={() => setShowAlerts((s) => !s)}
            className="relative h-16 rounded-xl border border-slate-800 bg-slate-900/20 hover:bg-slate-900/35 text-slate-300 text-xs flex flex-col items-center justify-center gap-1"
          >
            <span>🔔</span>
            <span>Alertas</span>
            {alerts.length > 0 && (
              <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] grid place-items-center">
                {alerts.length}
              </span>
            )}
          </button>
        </div>

        {/* Patient card + Controles */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-[#445A99]/60 grid place-items-center">
              <User size={18} className="text-white/90" />
            </div>
            <div>
              <div className="font-semibold">Paciente Demo</div>
              <div className="text-xs text-white/60">ID: MED-2025-001</div>
            </div>
          </div>

          {/* Controles demo */}
          <div className="w-full md:w-auto">
            {connectionState === "disconnected" ? (
              <button
                onClick={connectDevice}
                className="w-full md:w-72 h-12 rounded-xl border border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/25 flex items-center justify-center gap-2"
              >
                <span className="text-lg">🔴</span>
                <span>Conectar Dispositivo</span>
              </button>
            ) : connectionState === "connecting" ? (
              <button
                disabled
                className="w-full md:w-72 h-12 rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-300 flex items-center justify-center gap-2"
              >
                <span>🟡</span>
                <span>Conectando...</span>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="w-full md:w-72 h-12 rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 flex items-center justify-center gap-2">
                  <span>🟢</span>
                  <span>Dispositivo Conectado</span>
                  {isRecording && (
                    <span className="ml-2 text-xs text-red-300">● {formatTime(recordingTime)}</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 md:w-72">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      className="col-span-2 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      ▶ Iniciar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={togglePause}
                        className="h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {isPaused ? "▶" : "⏸"}
                      </button>
                      <button
                        onClick={stopRecording}
                        className="h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white"
                      >
                        ■ Detener
                      </button>
                    </>
                  )}

                  <button
                    onClick={disconnectDevice}
                    className="h-12 rounded-xl border border-slate-700 bg-slate-900/20 hover:bg-slate-900/35 text-slate-200"
                    title="Desconectar"
                  >
                    ⛔
                  </button>
                </div>
              </div>
            )}
          </div>

          <span className="self-start md:self-auto rounded-full bg-green-500/15 text-green-300 border border-green-500/25 px-3 py-1 text-xs font-semibold">
            demo
          </span>
        </div>

        {/* ECG card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden shadow-2xl mb-6">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Signal size={16} className="text-emerald-300" />
              <span className="font-semibold">Señal ECG - Tiempo Real</span>
            </div>

            <div className="flex items-center gap-2 text-white/70 text-sm">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="px-2 py-1 rounded-lg hover:bg-slate-800"
                title="Alejar"
              >
                −
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.min(2, z + 0.25))}
                className="px-2 py-1 rounded-lg hover:bg-slate-800"
                title="Acercar"
              >
                +
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden aspect-video md:aspect-auto md:h-80">
              <canvas ref={canvasRef} width={800} height={400} className="w-full h-full" />
            </div>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center shadow-lg">
            <Heart className={`mx-auto mb-2 ${isConnected ? "text-red-500 animate-pulse" : "text-slate-600"}`} />
            <p className="text-3xl font-black leading-none">
              {hr !== null && hr !== undefined ? Math.round(hr) : "--"}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">BPM</p>
          </div>

          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center shadow-lg">
            <Zap className="mx-auto mb-2 text-blue-400" />
            <p className="text-3xl font-black leading-none">
              {rmssd !== null && rmssd !== undefined ? Math.round(rmssd) : "--"}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">RMSSD (ms)</p>
          </div>

          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center shadow-lg">
            <Signal className="mx-auto mb-2 text-emerald-400" />
            <p className="text-3xl font-black leading-none">
              {fs !== null && fs !== undefined ? Math.round(fs) : "--"}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">SPS</p>
          </div>

          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center shadow-lg">
            <Activity className="mx-auto mb-2 text-amber-400" />
            <p className="text-3xl font-black leading-none">
              {rpeaks !== null && rpeaks !== undefined ? rpeaks : "--"}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Picos R</p>
          </div>
        </div>

        {/* Calidad de señal */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 px-5 py-4 mt-6">
          <div className="flex items-center gap-2 text-slate-300 text-sm mb-3">
            <Signal size={16} />
            <span className="font-semibold">Calidad de Señal</span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">SNR (Signal-to-Noise)</span>
              <div className="flex items-center gap-2">
                <span className="text-white">{Math.round(snrDb)} dB</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs border ${
                    snrDb > 22
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                      : snrDb > 18
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/25"
                      : "bg-red-500/15 text-red-300 border-red-500/25"
                  }`}
                >
                  {snrDb > 22 ? "Excelente" : snrDb > 18 ? "Bueno" : "Bajo"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">Artefactos detectados</span>
              <div className="flex items-center gap-2">
                <span className="text-white">{Math.round(artifactsPct)}%</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs border ${
                    artifactsPct < 5
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                      : artifactsPct < 10
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/25"
                      : "bg-red-500/15 text-red-300 border-red-500/25"
                  }`}
                >
                  {artifactsPct < 5 ? "Bajo" : artifactsPct < 10 ? "Medio" : "Alto"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">Electrodo suelto</span>
              <div className="flex items-center gap-2">
                <span className="text-white">{electrodeLoose ? "Sí" : "No"}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs border ${
                    electrodeLoose
                      ? "bg-red-500/15 text-red-300 border-red-500/25"
                      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                  }`}
                >
                  {electrodeLoose ? "Verificar" : "OK"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Información del dispositivo */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 px-5 py-4 mt-6">
          <div className="text-sm text-slate-300 font-semibold mb-3">Información del Dispositivo</div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Dispositivo:</span>
              <span className="text-white">AD8232 ECG Sensor</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Gateway:</span>
              <span className="text-white">Raspberry Pi 4</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Frecuencia muestreo:</span>
              <span className="text-white">{fs ?? 360} Hz</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Estado:</span>
              <span
                className={
                  connectionState === "connected"
                    ? "text-emerald-400"
                    : connectionState === "connecting"
                    ? "text-amber-400"
                    : "text-slate-500"
                }
              >
                {connectionState === "connected"
                  ? "🟢 Conectado"
                  : connectionState === "connecting"
                  ? "🟡 Conectando..."
                  : "🔴 Desconectado"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Grabaciones:</span>
              <span className="text-white">{recordings}</span>
            </div>
          </div>
        </div>

        {/* Nota backend */}
        <div className="mt-4 text-center text-[11px] text-slate-400">
          {m.note ? <span className="font-mono">note: {m.note}</span> : null}
        </div>

        <p className="mt-6 text-center text-[10px] text-slate-600 font-mono tracking-widest uppercase">
          Nodo: {window.location.hostname}:8000 | Tesis de Ingeniería Electrónica
        </p>
      </div>
    </div>
  );
}
