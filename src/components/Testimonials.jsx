export const Testimonials = () => (
  <section className="py-24 bg-slate-50">
    <div className="max-w-6xl mx-auto px-6">
      <div className="text-center">
        <p className="text-emerald-600 font-semibold uppercase tracking-widest text-sm">
          Validación
        </p>
        <h2 className="mt-4 text-4xl font-bold text-slate-900">
          Opiniones y enfoque clínico
        </h2>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          Este proyecto está diseñado con una mentalidad biomédica: claridad,
          estabilidad y datos útiles para monitoreo en tiempo real.
        </p>
      </div>

      <div className="mt-14 grid gap-8 md:grid-cols-3">
        {/* Card 1 */}
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
          <p className="text-slate-700 leading-relaxed">
            “La interfaz es clara y prioriza lo importante. Un buen enfoque para
            visualización clínica en tiempo real.”
          </p>
          <div className="mt-6">
            <p className="font-semibold text-slate-900">Revisión técnica</p>
            <p className="text-sm text-slate-500">Enfoque UX biomédico</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
          <p className="text-slate-700 leading-relaxed">
            “Muy interesante que combine edge computing + WebSocket. Se siente
            como una plataforma real, no solo una demo.”
          </p>
          <div className="mt-6">
            <p className="font-semibold text-slate-900">Evaluación de arquitectura</p>
            <p className="text-sm text-slate-500">IoT + Backend</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
          <p className="text-slate-700 leading-relaxed">
            “El monitor ECG y las métricas HR/HRV son un plus fuerte. Buen
            potencial para investigación y prototipos.”
          </p>
          <div className="mt-6">
            <p className="font-semibold text-slate-900">Observación académica</p>
            <p className="text-sm text-slate-500">HR, HRV y señal</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);
