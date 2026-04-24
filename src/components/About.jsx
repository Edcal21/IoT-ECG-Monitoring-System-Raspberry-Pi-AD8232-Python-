export const About = () => (
  <section id="about" className="py-24 bg-white">
    <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
      
      {/* Texto */}
      <div>
        <span className="text-emerald-500 font-semibold uppercase tracking-widest text-sm">
          Sobre Medinic
        </span>

        <h2 className="mt-4 text-4xl font-bold text-slate-900 leading-tight">
          Tecnología biomédica aplicada al monitoreo cardíaco en tiempo real
        </h2>

        <p className="mt-6 text-lg text-slate-600 leading-relaxed">
          Medinic es una plataforma IoT desarrollada para la adquisición,
          procesamiento y visualización de señales electrocardiográficas (ECG)
          en tiempo real utilizando Raspberry Pi 4 y el conversor ADS1115.
        </p>

        <p className="mt-4 text-lg text-slate-600 leading-relaxed">
          Integra backend en FastAPI, transmisión mediante WebSocket y análisis
          de métricas como BPM, RMSSD y SDNN, orientado a aplicaciones clínicas
          y de investigación biomédica.
        </p>
      </div>

      {/* Caja destacada */}
      <div className="bg-slate-900 rounded-2xl p-10 shadow-xl border border-slate-800">
        <h3 className="text-xl font-semibold text-white mb-6">
          Objetivo del Proyecto
        </h3>

        <ul className="space-y-4 text-slate-300">
          <li>✔ Monitoreo continuo de señal ECG</li>
          <li>✔ Procesamiento digital en edge computing</li>
          <li>✔ Cálculo de métricas de variabilidad cardíaca</li>
          <li>✔ Plataforma escalable para aplicaciones médicas</li>
        </ul>
      </div>

    </div>
  </section>
);
