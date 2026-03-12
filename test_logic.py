import numpy as np
from postprocess_ecg import process_window
import time

# 1. Generar una señal sintética de 10 segundos a 250Hz
fs = 250.0
t = np.linspace(0, 10, int(10 * fs))
# Simulamos una señal con ruido y picos cada 0.8s (75 BPM)
v = 0.5 * np.sin(2 * np.pi * 1 * t) + 0.2 * np.random.normal(size=len(t))
for i in range(0, len(t), int(0.8 * fs)):
    v[i:i+5] = 2.0 # Simulamos picos R

print("Iniciando prueba de procesamiento...")
start = time.perf_counter()
results = process_window(t, v, fs=fs)
end = time.perf_counter()

print(f"--- Resultados ---")
print(f"Tiempo de ejecución: {end - start:.4f} segundos")
print(f"BPM detectado: {results['hr_median']}")
print(f"Diagnóstico IA: {results['diagnosis']}")
print(f"Confianza: {results['confidence']}")
