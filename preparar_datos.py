import pandas as pd
import os

# --- Configuración ---
archivo_excel = 'Catalogo_Normalizado.xlsx' # El archivo que creaste
carpeta_salida = 'datos' # La carpeta donde irán los JSON

# Las 8 hojas que normalizamos
hojas_a_exportar = [
    'Portada',
    'Clases',
    'Subclases',
    'Objetos',
    'Atributos',
    'Link_Objeto_Atributo',
    'Dominios',
    'Fuentes',
    'Productor'
]

# --- Ejecución ---
if not os.path.exists(carpeta_salida):
    os.makedirs(carpeta_salida)

print(f"Leyendo '{archivo_excel}'...")

try:
    xls = pd.ExcelFile(archivo_excel)

    for nombre_hoja in hojas_a_exportar:
        if nombre_hoja in xls.sheet_names:
            print(f"Procesando hoja: '{nombre_hoja}'...")
            
            # Leemos TODAS las columnas como texto (string)
            df = pd.read_excel(xls, sheet_name=nombre_hoja, dtype=str)
            
            # Reemplazamos los 'nan' por celdas vacías
            df = df.fillna('') 

            archivo_json = os.path.join(carpeta_salida, f"{nombre_hoja.lower()}.json")
            
            # ---- AQUÍ ESTÁ LA CORRECCIÓN ----
            # Se eliminó el argumento 'encoding'
            df.to_json(
                archivo_json,
                orient='records',
                indent=4,
                force_ascii=False 
            )
        else:
            print(f"ADVERTENCIA: No se encontró la hoja '{nombre_hoja}' en el Excel.")

    print(f"\n¡Éxito! Archivos JSON guardados en la carpeta '{carpeta_salida}'.")

except FileNotFoundError:
    print(f"ERROR: No se encontró el archivo '{archivo_excel}'.")
    print("Asegúrate de que el archivo esté en la misma carpeta que el script.")
except Exception as e:
    print(f"Ocurrió un error: {e}")