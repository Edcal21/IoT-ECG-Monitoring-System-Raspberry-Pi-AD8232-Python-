# Sistema IoT de Monitoreo ECG con Raspberry Pi y AD8232

Sistema de monitoreo ECG en tiempo real basado en Raspberry Pi y el sensor AD8232, con visualización web, gestión de sesiones por paciente, exportación automática de registros y generación de reportes clínicos en PDF.

## Descripción general

Este proyecto fue desarrollado como un prototipo académico y de ingeniería orientado a la adquisición, visualización, almacenamiento y análisis de señales electrocardiográficas (ECG) en tiempo real. El sistema permite capturar la señal desde un sensor AD8232 conectado a una Raspberry Pi, procesarla localmente y mostrarla a través de una interfaz web moderna para su monitoreo.

Además, el sistema incorpora funciones de control de calidad de señal, detección de desconexión de electrodos, exportación estructurada de registros y generación automática de reportes en formato PDF.

## Características principales

- Visualización ECG en tiempo real desde navegador web
- Inicio y cierre de sesiones de monitoreo por paciente
- Detección de calidad de señal y estado de electrodos
- Filtrado y procesamiento de la señal ECG
- Extracción de métricas fisiológicas básicas
- Clasificación/interpretación automática experimental
- Exportación automática de registros en formato estructurado
- Generación de imágenes clínicas del trazado ECG
- Generación de reportes PDF por sesión
- Monitoreo del estado del sistema en la Raspberry Pi
- Funcionamiento local en red sin depender de la nube

## Estructura del proyecto

```text
mi-proyecto-ecg/
├── Backend/
│   ├── backend_iot.py
│   ├── postprocess_ecg.py
│   ├── export_physionet_style.py
│   ├── session_store.py
│   ├── patient_store.py
│   ├── data/
│   └── venv/
├── Frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── README.md

