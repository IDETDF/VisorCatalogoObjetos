import pandas as pd
import os

archivo_excel = 'Catalogo_Normalizado.xlsx'
carpeta_salida = 'datos'
hojas_a_exportar = [
    'Portada',
    'Clases',
    'Subclases',
    'Objetos',
    'Atributos',
    'Link_Objeto_Atributo',
    'Dominios',
    'Fuentes',
    'Productor',
    'Versiones'
]


def normalizar_codigo(valor, longitud):
    """Normaliza códigos jerárquicos numéricos con ceros a la izquierda (zfill)."""
    s = str(valor).strip() if valor is not None else ''
    if not s or s.lower() == 'nan':
        return ''
    if s.endswith('.0') and s[:-2].isdigit():
        s = s[:-2]
    return s.zfill(longitud) if s.isdigit() else s


def normalizar_registros(nombre_hoja, registros):
    """Aplica invariantes de normalización de códigos y etiquetas semánticas sobre una lista de dicts."""
    hoja_key = nombre_hoja.strip().lower()
    salida = []
    for fila in registros:
        item = dict(fila)
        if hoja_key == 'clases':
            if 'ID_Clase' in item:
                item['ID_Clase'] = normalizar_codigo(item['ID_Clase'], 2)
        elif hoja_key == 'subclases':
            if 'ID_Clase_FK' in item:
                item['ID_Clase_FK'] = normalizar_codigo(item['ID_Clase_FK'], 2)
            if 'ID_Subclase' in item:
                item['ID_Subclase'] = normalizar_codigo(item['ID_Subclase'], 4)
        elif hoja_key == 'objetos':
            if 'ID_Subclase_FK' in item:
                item['ID_Subclase_FK'] = normalizar_codigo(item['ID_Subclase_FK'], 4)
            if 'ID_Objeto' in item:
                item['ID_Objeto'] = normalizar_codigo(item['ID_Objeto'], 6)
        elif hoja_key == 'link_objeto_atributo':
            if 'ID_Objeto_FK' in item:
                item['ID_Objeto_FK'] = normalizar_codigo(item['ID_Objeto_FK'], 6)
        elif hoja_key == 'dominios':
            atr_fk = str(item.get('ID_Atributo_FK', '')).strip()
            cod = str(item.get('Codigo', '')).strip()
            eti = str(item.get('Etiqueta', '')).strip()
            if atr_fk == 'SNL':
                if cod == '0' or eti.lower() == 'false':
                    item['Etiqueta'] = 'No'
                elif cod == '1' or eti.lower() == 'true':
                    item['Etiqueta'] = 'Sí'
        salida.append(item)
    return salida


def normalizar_dataframe(nombre_hoja, df):
    """Aplica la normalización sobre un DataFrame de pandas."""
    df = df.fillna('')
    registros = df.to_dict(orient='records')
    normalizados = normalizar_registros(nombre_hoja, registros)
    return pd.DataFrame(normalizados, columns=df.columns)


def exportar_excel_a_json(ruta_excel=archivo_excel, ruta_salida=carpeta_salida):
    if not os.path.exists(ruta_salida):
        os.makedirs(ruta_salida)

    print(f"Leyendo '{ruta_excel}'...")

    try:
        xls = pd.ExcelFile(ruta_excel)

        for nombre_hoja in hojas_a_exportar:
            if nombre_hoja in xls.sheet_names:
                print(f"Procesando hoja: '{nombre_hoja}'...")

                df = pd.read_excel(xls, sheet_name=nombre_hoja, dtype=str)
                df = normalizar_dataframe(nombre_hoja, df)

                archivo_json = os.path.join(ruta_salida, f"{nombre_hoja.lower()}.json")

                df.to_json(
                    archivo_json,
                    orient='records',
                    indent=4,
                    force_ascii=False
                )
            else:
                print(f"ADVERTENCIA: No se encontró la hoja '{nombre_hoja}' en el Excel.")

        print(f"\n¡Éxito! Archivos JSON guardados en la carpeta '{ruta_salida}'.")

    except FileNotFoundError:
        print(f"ERROR: No se encontró el archivo '{ruta_excel}'.")
        print("Asegúrate de que el archivo esté en la misma carpeta que el script.")
    except Exception as e:
        print(f"Ocurrió un error: {e}")


if __name__ == '__main__':
    exportar_excel_a_json()
