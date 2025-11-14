document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Variables Globales ---
    let db = {
        clases: [],
        subclases: [],
        objetos: [],
        atributos: [],
        link: [],
        dominios: [],
        portada: [],
        fuentes: [],
        productor: []
    };

    // --- 2. Selectores del DOM ---
    const listaClases = document.getElementById('lista-clases');
    const listaSubclases = document.getElementById('lista-subclases');
    const listaObjetos = document.getElementById('lista-objetos');
    
    // Selectores Modal Objeto
    const modal = document.getElementById('modal-objeto');
    const modalCerrar = document.getElementById('modal-cerrar');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalDefinicion = document.getElementById('modal-definicion');
    const modalGeometria = document.getElementById('modal-geometria');
    const modalTbody = document.getElementById('modal-tbody-atributos');

    // Selectores Modal Info
    const btnInfo = document.getElementById('btn-info');
    const modalInfo = document.getElementById('modal-info');
    const modalInfoCerrar = document.getElementById('modal-info-cerrar');
    const modalInfoCuerpo = document.getElementById('modal-info-cuerpo');

    // === Selectores Buscador (NUEVO) ===
    const buscador = document.getElementById('buscador');
    const searchResults = document.getElementById('search-results');

    // --- 3. Función de Utilidad: Normalizar Texto (NUEVO) ---
    function normalizeText(text) {
        if (!text) return '';
        return text
            .toLowerCase()
            .normalize("NFD") // Descompone acentos (ej. "ó" -> "o" + "´")
            .replace(/[\u0300-\u036f]/g, ""); // Elimina los caracteres de acento
    }

    // --- 4. Función Principal: Cargar datos y configurar eventos ---
    async function iniciarApp() {
        try {
            const [
                clasesRes, subclasesRes, objetosRes, atributosRes, linkRes, dominiosRes, 
                portadaRes, fuentesRes, productorRes
            ] = await Promise.all([
                fetch('datos/clases.json'),
                fetch('datos/subclases.json'),
                fetch('datos/objetos.json'),
                fetch('datos/atributos.json'),
                fetch('datos/link_objeto_atributo.json'),
                fetch('datos/dominios.json'),
                fetch('datos/portada.json'),
                fetch('datos/fuentes.json'),
                fetch('datos/productor.json')
            ]);

            db.clases = await clasesRes.json();
            db.subclases = await subclasesRes.json();
            db.objetos = await objetosRes.json();
            db.atributos = await atributosRes.json();
            db.link = await linkRes.json();
            db.dominios = await dominiosRes.json();
            db.portada = await portadaRes.json();
            db.fuentes = await fuentesRes.json();
            db.productor = await productorRes.json();
            
            // === OPTIMIZACIÓN DE BÚSQUEDA (NUEVO) ===
            // Pre-calculamos los nombres normalizados para una búsqueda instantánea
            db.objetos.forEach(objeto => {
                objeto.Nombre_Normalizado = normalizeText(objeto.Nombre_Objeto);
            });
            db.subclases.forEach(subclase => {
                subclase.Nombre_Normalizado = normalizeText(subclase.Nombre_Subclase);
            });
            // ===========================================
            
            renderizarClases();

        } catch (error) {
            console.error("Error fatal al cargar los datos:", error);
            alert("No se pudieron cargar los datos del catálogo. Revisa la consola (F12) para más detalles.");
        }

        // --- 5. Configurar Event Listeners ---
        
        // Listeners de Navegación
        listaClases.addEventListener('click', manejarClicClase);
        listaSubclases.addEventListener('click', manejarClicSubclase);
        listaObjetos.addEventListener('click', manejarClicObjeto);
        
        // Listeners Modales
        modalCerrar.addEventListener('click', () => modal.style.display = "none");
        btnInfo.addEventListener('click', mostrarModalInfo);
        modalInfoCerrar.addEventListener('click', () => modalInfo.style.display = "none");

        // === Listeners Buscador (NUEVO) ===
        buscador.addEventListener('keyup', handleSearch); // Busca en tiempo real
        searchResults.addEventListener('click', handleResultClick); // Al hacer clic en un resultado

        // Listeners de Cierre de Modales/Resultados
        window.addEventListener('click', (e) => {
            // Cierra modales si se hace clic fuera
            if (e.target == modal) { modal.style.display = "none"; }
            if (e.target == modalInfo) { modalInfo.style.display = "none"; }
            
            // Cierra resultados de búsqueda si se hace clic fuera
            if (e.target.id !== 'buscador' && e.target.closest('#search-results') === null) {
                searchResults.style.display = 'none';
            }
        });
    }

    // --- 6. Funciones de "Renderizado" (Navegación) ---

    function renderizarClases() {
        listaClases.innerHTML = '';
        listaSubclases.innerHTML = '';
        listaObjetos.innerHTML = '';
        for (const clase of db.clases) {
            listaClases.innerHTML += `<li data-id="${clase.ID_Clase}">
                <img src="static/${clase.Nombre_Clase}.svg" class="icono-lista">
                ${clase.Nombre_Clase} (${clase.ID_Clase})
            </li>`;
        }
    }

    function renderizarSubclases(idClasePadre) {
        listaSubclases.innerHTML = '';
        listaObjetos.innerHTML = '';
        const subclasesFiltradas = db.subclases.filter(s => s.ID_Clase_FK === idClasePadre);
        for (const subclase of subclasesFiltradas) {
            listaSubclases.innerHTML += `<li data-id="${subclase.ID_Subclase}">${subclase.Nombre_Subclase} (${subclase.ID_Subclase})</li>`;
        }
    }

    function renderizarObjetos(idSubclasePadre) {
        listaObjetos.innerHTML = '';
        const objetosFiltrados = db.objetos.filter(o => o.ID_Subclase_FK === idSubclasePadre);
        for (const objeto of objetosFiltrados) {
            listaObjetos.innerHTML += `<li data-id="${objeto.ID_Objeto}">${objeto.Nombre_Objeto} (${objeto.ID_Objeto})</li>`;
        }
    }

    // --- 7. Funciones "Manejadoras" (Navegación) ---

    function manejarClicClase(e) {
        if (e.target.tagName === 'LI') {
            quitarSeleccion(listaClases);
            e.target.classList.add('seleccionado');
            const idClase = e.target.dataset.id;
            renderizarSubclases(idClase);
        }
    }

    function manejarClicSubclase(e) {
        if (e.target.tagName === 'LI') {
            quitarSeleccion(listaSubclases);
            e.target.classList.add('seleccionado');
            const idSubclase = e.target.dataset.id;
            renderizarObjetos(idSubclase);
        }
    }

    function manejarClicObjeto(e) {
        if (e.target.tagName === 'LI') {
            quitarSeleccion(listaObjetos);
            e.target.classList.add('seleccionado');
            const idObjeto = e.target.dataset.id;
            mostrarModalObjeto(idObjeto);
        }
    }

    // --- 8. Lógica del Buscador (NUEVO) ---

    function handleSearch(e) {
        const searchTerm = normalizeText(e.target.value);
        searchResults.innerHTML = ''; // Limpiar resultados anteriores

        if (searchTerm.length < 2) { // No buscar si es muy corto
            searchResults.style.display = 'none';
            return;
        }

        let html = '';
        let count = 0;
        const maxResults = 15; // Límite de resultados

        // 1. Buscar en Objetos (más importante)
        const objetosMatch = db.objetos.filter(o => o.Nombre_Normalizado.includes(searchTerm));
        for (const objeto of objetosMatch) {
            if (count >= maxResults) break;
            html += `<li data-id="${objeto.ID_Objeto}" data-type="objeto">
                ${objeto.Nombre_Objeto} <span>(Objeto)</span>
            </li>`;
            count++;
        }

        // 2. Buscar en Subclases (si aún hay espacio)
        const subclasesMatch = db.subclases.filter(s => s.Nombre_Normalizado.includes(searchTerm));
        for (const subclase of subclasesMatch) {
            if (count >= maxResults) break;
            html += `<li data-id="${subclase.ID_Subclase}" data-type="subclase">
                ${subclase.Nombre_Subclase} <span>(Subclase)</span>
            </li>`;
            count++;
        }
        
        if (html === '') {
            html = '<li class="no-results">No se encontraron resultados</li>';
        }

        searchResults.innerHTML = html;
        searchResults.style.display = 'block';
    }

    function handleResultClick(e) {
        const li = e.target.closest('li'); // Obtener el <li> aunque se haga clic en el <span>
        if (!li || li.classList.contains('no-results')) return; // No hacer nada si no hay ID

        const id = li.dataset.id;
        const type = li.dataset.type;

        if (type === 'objeto') {
            // Si es un objeto, abrimos el modal directamente
            mostrarModalObjeto(id);
        }
        
        if (type === 'subclase') {
            // Si es una subclase, forzamos la navegación de 3 columnas
            const subclase = db.subclases.find(s => s.ID_Subclase === id);
            if (subclase) {
                // 1. Renderizar clases y "cliquear" la correcta
                renderizarClases();
                quitarSeleccion(listaClases); // Limpiar por si acaso
                document.querySelector(`#lista-clases li[data-id="${subclase.ID_Clase_FK}"]`).classList.add('seleccionado');
                
                // 2. Renderizar subclases y "cliquear" la correcta
                renderizarSubclases(subclase.ID_Clase_FK);
                quitarSeleccion(listaSubclases); // Limpiar por si acaso
                document.querySelector(`#lista-subclases li[data-id="${id}"]`).classList.add('seleccionado');

                // 3. Renderizar los objetos de esa subclase
                renderizarObjetos(id);
            }
        }

        // Limpiar y ocultar el buscador
        searchResults.style.display = 'none';
        buscador.value = '';
    }

    // --- 9. Lógica del Modal de Objeto ---

    function mostrarModalObjeto(idObjeto) {
        const objeto = db.objetos.find(o => o.ID_Objeto === idObjeto);
        if (!objeto) return;

        modalTitulo.textContent = objeto.Nombre_Objeto;
        modalDefinicion.textContent = objeto.Definicion;
        modalGeometria.textContent = objeto.Geometria;
        modalTbody.innerHTML = '';

        const linksAtributos = db.link.filter(l => l.ID_Objeto_FK === idObjeto);

        for (const link of linksAtributos) {
            const atributo = db.atributos.find(a => a.ID_Atributo === link.ID_Atributo_FK);
            if (!atributo) continue;
            
            let dominiosHtml = "N/A";
            
            if (atributo.Tiene_Dominio === 'SI') {
                const valoresDominio = db.dominios.filter(d => d.ID_Atributo_FK === atributo.ID_Atributo);
                dominiosHtml = "<ul>";
                for (const valor of valoresDominio) {
                    dominiosHtml += `<li><b>${valor.Codigo}</b>: ${valor.Etiqueta}</li>`;
                }
                dominiosHtml += "</ul>";
            } else {
                dominiosHtml = `<i>${atributo.Tipo_Atributo || 'N/A'}</i>`;
            }

            modalTbody.innerHTML += `
                <tr>
                    <td data-label="Atributo">${atributo.Nombre_Atributo} (${atributo.ID_Atributo})</td>
                    <td data-label="Definición">${atributo.Definicion}</td>
                    <td data-label="Tipo">${atributo.Tipo_Atributo}</td>
                    <td data-label="Dominio (Valores)">${dominiosHtml}</td>
                    <td data-label="Obs.">${atributo.Observaciones || ''}</td>
                </tr>
            `;
        }
        modal.style.display = "block";
    }

    // --- 10. Lógica del Modal de Info ---
    
    function mostrarModalInfo() {
        modalInfoCuerpo.innerHTML = ''; // Limpiar el modal
        
        // 1. Rellenar con datos simples de la portada
        for (const item of db.portada) {
            if (item.Clave && item.Valor) { 
                modalInfoCuerpo.innerHTML += `
                    <p>
                        <strong>${item.Clave}</strong> 
                        <span>${item.Valor}</span>
                    </p>
                `;
            }
        }

        // 2. Rellenar con datos del Productor
        if (db.productor && db.productor.length > 0) {
            modalInfoCuerpo.innerHTML += `<h3>Productor</h3>`;
            
            for (const item of db.productor) {
                modalInfoCuerpo.innerHTML += `
                    <p>
                        <strong>Nombre</strong>
                        <span>${item.NOMBRE || ''}</span>
                    </p>
                    <p>
                        <strong>Dirección</strong>
                        <span>${item.DIRECCIÓN || ''}</span>
                    </p>
                    <p>
                        <strong>Ubicación</strong>
                        <span>${item.CIUDAD || ''}, ${item.PROVINCIA || ''} (${item.PAIS || ''})</span>
                    </p>
                    <p>
                        <strong>Teléfono</strong>
                        <span>${item.TELÉFONO || ''}</span>
                    </p>
                    <p>
                        <strong>Email</strong>
                        <span><a href="mailto:${item['E-MAIL'] || ''}">${item['E-MAIL'] || ''}</a></span>
                    </p>
                    <p>
                        <strong>Sitio Web</strong>
                        <span><a href="${item['SITIO WEB'] || '#'}" target="_blank">${item['SITIO WEB'] || ''}</a></span>
                    </p>
                `;
            }
        }

        // 3. Rellenar con la lista de Fuentes
        if (db.fuentes && db.fuentes.length > 0) {
            modalInfoCuerpo.innerHTML += `<h3>Fuentes Principales</h3>`;
            let fuentesHtml = '<ul>';
            for (const item of db.fuentes) {
                fuentesHtml += `<li><a href="${item.Web || item.WEB || '#'}" target="_blank">${item.Nombre || item.NOMBRE || 'Fuente'}</a></li>`;
            }
            fuentesHtml += '</ul>';
            modalInfoCuerpo.innerHTML += fuentesHtml;
        }
        
        modalInfo.style.display = "block";
    }

    // --- 11. Funciones de Utilidad (Navegación) ---
    function quitarSeleccion(lista) {
        const seleccionado = lista.querySelector('li.seleccionado');
        if (seleccionado) {
            seleccionado.classList.remove('seleccionado');
        }
    }

    // --- Iniciar la aplicación ---
    iniciarApp();
});