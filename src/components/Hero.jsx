
export const Hero = ({ onMonitorClick }) => (

  <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
    {/* Glow decorativo (no molesta, se ve premium) */}
    <div className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-32 right-[-120px] h-[360px] w-[360px] rounded-full bg-sky-500/10 blur-3xl" />

    <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="max-w-3xl">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-xs text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          IoT Biomédico · ECG en tiempo real
        </div>

        {/* Title */}

          <h1 className="mt-6 text-3xl font-extrabold tracking-tight md:text-5xl">          MEDINIC{" "}
          <span className="block mt-2 text-2xl font-semibold text-emerald-300 md:text-3xl">
            Plataforma de Monitoreo ECG
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-base leading-relaxed text-slate-300 md:text-xl">
          Adquisición y visualización de señal electrocardiográfica en tiempo real,
          basada en <span className="text-white/90 font-semibold">Raspberry Pi 4</span> y{" "}
          <span className="text-white/90 font-semibold">ADS1115</span>, con backend FastAPI y streaming WebSocket.
        </p>

        {/* CTA */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={onMonitorClick}
            className="rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.99]"
          >
            Ver Monitor ECG
          </button>

          <a
            href="#about"
            className="rounded-xl border border-slate-700 bg-slate-900/30 px-6 py-3 font-semibold text-slate-200 transition hover:bg-slate-900/60"
          >
            Conocer el proyecto
          </a>
        </div>

        {/* Mini info pills */}
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
            <p className="text-xs font-bold text-slate-400">Streaming</p>
            <p className="mt-1 text-sm text-slate-200">WebSocket estable</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
            <p className="text-xs font-bold text-slate-400">Procesamiento</p>
            <p className="mt-1 text-sm text-slate-200">HR + HRV (RMSSD, SDNN)</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
            <p className="text-xs font-bold text-slate-400">Edge Node</p>
            <p className="mt-1 text-sm text-slate-200">Raspberry Pi 4</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);
