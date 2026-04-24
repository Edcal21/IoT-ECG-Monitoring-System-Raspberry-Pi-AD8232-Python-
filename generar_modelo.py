import tensorflow as tf
import numpy as np

# 1. Definir arquitectura idéntica a la del backend
def build_model():
    # Rama A: Señal (2500 muestras)
    input_ecg = tf.keras.layers.Input(shape=(2500, 1), name="ecg_signal")
    x = tf.keras.layers.Conv1D(32, 15, activation='relu')(input_ecg)
    x = tf.keras.layers.GlobalAveragePooling1D()(x)
    
    # Rama B: Features (6 valores)
    input_feat = tf.keras.layers.Input(shape=(6,), name="handcrafted_features")
    y = tf.keras.layers.Dense(16, activation='relu')(input_feat)
    
    combined = tf.keras.layers.concatenate([x, y])
    output = tf.keras.layers.Dense(3, activation='softmax')(combined)
    
    return tf.keras.models.Model(inputs=[input_ecg, input_feat], outputs=output)

# 2. Crear y convertir
model = build_model()
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_model = converter.convert()

# 3. GUARDAR COMO BINARIO
with open('modelo_ecg.tflite', 'wb') as f:
    f.write(tflite_model)

print("¡Archivo modelo_ecg.tflite BINARIO generado con éxito!")
