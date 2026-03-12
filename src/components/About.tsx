export function About() {
  return (
<section id="about" className="py-20 bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">

<h2 className="text-4xl font-bold mb-6 text-emerald-400">            🧠 ¿Qué es Medinic?
          </h2>
          <p className="text-xl text-slate-300 leading-relaxed">
            Medinic es una plataforma de monitoreo cardiovascular que integra dispositivos biomédicos, inteligencia artificial y notificaciones en tiempo real para ayudar a médicos y pacientes a prevenir eventos cardíacos graves.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 pt-8 text-left">
            {/* Punto 1: Hardware */}
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0 mt-1">
                <svg className="w-4 h-4 text-[#7ABBE6]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-slate-200 font-medium">Funciona con sensores AD8232 y Raspberry Pi 4.</p>
            </div>

            {/* Punto 2: Procesamiento */}
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0 mt-1">
                <svg className="w-4 h-4 text-[#7ABBE6]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-gray-700 font-medium">Procesa la señal ECG y detecta irregularidades como fibrilación auricular, bloqueos AV o arritmias.</p>
            </div>

            {/* Punto 3: Alertas */}
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0 mt-1">
                <svg className="w-4 h-4 text-[#7ABBE6]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-gray-700 font-medium">Genera alertas por WhatsApp o correo electrónico al instante.</p>
            </div>

            {/* Punto 4: Dashboard Médico */}
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0 mt-1">
                <svg className="w-4 h-4 text-[#7ABBE6]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-gray-700 font-medium">Permite al doctor revisar el historial, HRV y agregar diagnósticos.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
