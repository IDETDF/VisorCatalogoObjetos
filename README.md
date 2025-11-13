# Visor del Catálogo de Objetos Geográficos - IDETDF

<p align="center">
  <img src="static/logo.png" alt="Logo IDETDF" width="150">
</p>

Este proyecto es un visor web estático para el **Catálogo de Objetos Geográficos de la Infraestructura de Datos Espaciales de Tierra del Fuego (IDETDF)**.

Su objetivo es proveer una interfaz rápida, moderna y fácil de navegar para consultar clases, subclases, objetos y sus atributos, reemplazando la necesidad de navegar el archivo Excel maestro.

**[Ver Demo en Vivo](https://idetdf.github.io/VisorCatalogoObjetos/)**

---

## ✨ Características Principales

* **Navegación Intuitiva:** Interfaz de tres columnas (Clase > Subclase > Objeto) que permite un filtrado simple.
* **Vista de Detalle:** Un modal (ventana emergente) muestra la ficha completa de cada objeto, incluyendo su definición, geometría y la tabla de atributos.
* **Información Completa:** Muestra todos los atributos de un objeto, incluyendo su definición, tipo de dato, observaciones y la lista completa de valores de dominio (si aplica).
* **100% Estático:** Construido con HTML, CSS y JavaScript puros. No requiere bases de datos ni *backend*, lo que lo hace extremadamente rápido y fácil de desplegar.
* **Fuente de Datos Sencilla:** Toda la información se lee desde archivos `.json` generados a partir de un único archivo Excel.

---

## 🛠️ Stack Tecnológico

* **Frontend:** HTML5, CSS3 (con variables), JavaScript (ES6+ `async/await`, `fetch`).
* **Preparación de Datos:** Python 3 y `pandas` para convertir el Excel a JSON.
* **Fuente Maestra:** Microsoft Excel (`.xlsx`).
* **Despliegue:** GitHub Pages.

---

## 🗂️ Estructura del Proyecto
* **Datos**: Carpeta con todos los archivos .json que contienen la información
* **Static**: Carpeta con los archivos estaticos (imagenes e iconos).
* **Catalogo Normalizado.xlsx**: Archivo base del catalogo de objetos geograficos.
* **app.js**: archivo JavaScript que contiene la funcionalidad de la pagina.
* **index.html**: archivo html con la estructura de la pagina.
* **preparar_datos.py**: script Python para extraer la informacion del excel base "Catalogo Normalizado.xlsx" y transformarlo en los .json utilizados en la pagina.
* **style.css**: archivo css con los estilos de la pagina.


## 🔄 Cómo Actualizar el Catálogo

Este es el flujo de trabajo principal para mantener los datos actualizados.

### 1. Editar la Fuente Maestra

Realiza todos los cambios, correcciones o adiciones de datos **directamente en el archivo `Catalogo_Normalizado.xlsx`**.

### 2. Regenerar los Datos JSON

Una vez guardados los cambios en el Excel, abre una terminal en la carpeta del proyecto y ejecuta el script de Python:
py preparar_datos.py

### 3. Subir los Cambios a GitHub
Sube los archivos actualizados (tanto el Catalogo_Normalizado.xlsx como los .json modificados) al repositorio.

* Añadir todos los cambios
git add .

* Crear un commit descriptivo
git commit -m "Actualización de datos: se añadió el objeto 'Nuevo Objeto'"

* Subir los cambios a la rama principal
git push origin main
