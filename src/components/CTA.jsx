export const CTA = ({ onAction }) => (
  <section className="py-24 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
    <div className="max-w-5xl mx-auto px-6 text-center">

      <h2 className="text-4xl md:text-5xl font-bold leading-tight">
        ¿Listo para comenzar el monitoreo inteligente?
      </h2>

      <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
        Accede al sistema de monitoreo ECG en tiempo real y analiza métricas
        avanzadas de variabilidad cardíaca con tecnología IoT biomédica.
      </p>

      <div className="mt-10 flex justify-center gap-4 flex-wrap">
        <button
          onClick={onAction}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 py-4 rounded-xl shadow-lg transition duration-300 active:scale-95"
        >
          Iniciar Monitor ECG
        </button>

        <a
          href="#about"
          className="border border-slate-600 hover:border-emerald-400 px-8 py-4 rounded-xl font-semibold text-slate-200 transition"
        >
          Conocer más
        </a>
      </div>

    </div>
  </section>
);
