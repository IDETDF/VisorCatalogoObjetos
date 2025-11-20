document.addEventListener('DOMContentLoaded', () => {

    let db = {
        clases: [], subclases: [], objetos: [], atributos: [],
        link: [], dominios: [], portada: [], fuentes: [], productor: [], versiones: []
    };
    let currentObjectId = null;
    let currentSubclaseId = null;
    let filtroDBYF = false;

    const listaClases = document.getElementById('lista-clases');
    const listaSubclases = document.getElementById('lista-subclases');
    const listaObjetos = document.getElementById('lista-objetos');
    
    const modal = document.getElementById('modal-objeto');
    const modalCerrar = document.getElementById('modal-cerrar');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalDefinicion = document.getElementById('modal-definicion');
    const modalGeometria = document.getElementById('modal-geometria');
    const modalTbody = document.getElementById('modal-tbody-atributos');

    const btnInfo = document.getElementById('btn-info');
    const modalInfo = document.getElementById('modal-info');
    const modalInfoCerrar = document.getElementById('modal-info-cerrar');
    const modalInfoCuerpo = document.getElementById('modal-info-cuerpo');

    const buscador = document.getElementById('buscador');
    const searchResults = document.getElementById('search-results');
    // const btnDescargarFicha = document.getElementById('btn-descargar-ficha');
    
    const switchDBYF = document.getElementById('filtro-dbyf');

    function normalizeText(text) {
        if (!text) return '';
        return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    async function iniciarApp() {
        try {
            const [
                clasesRes, subclasesRes, objetosRes, atributosRes, linkRes, dominiosRes, 
                portadaRes, fuentesRes, productorRes, versionesRes
            ] = await Promise.all([
                fetch('datos/clases.json'), fetch('datos/subclases.json'),
                fetch('datos/objetos.json'), fetch('datos/atributos.json'),
                fetch('datos/link_objeto_atributo.json'), fetch('datos/dominios.json'),
                fetch('datos/portada.json'), fetch('datos/fuentes.json'),
                fetch('datos/productor.json'), fetch('datos/versiones.json')
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
            db.versiones = await versionesRes.json();
            
            db.objetos.forEach(o => { o.Nombre_Normalizado = normalizeText(o.Nombre_Objeto); });
            db.subclases.forEach(s => { s.Nombre_Normalizado = normalizeText(s.Nombre_Subclase); });
            
            renderizarClases();

        } catch (error) {
            console.error("Error:", error);
        }

        listaClases.addEventListener('click', manejarClicClase);
        listaSubclases.addEventListener('click', manejarClicSubclase);
        listaObjetos.addEventListener('click', manejarClicObjeto);
        
        modalCerrar.addEventListener('click', () => {
            modal.style.display = "none";
            // btnDescargarFicha.style.display = "none";
        });
        btnInfo.addEventListener('click', mostrarModalInfo);
        modalInfoCerrar.addEventListener('click', () => modalInfo.style.display = "none");

        buscador.addEventListener('keyup', handleSearch);
        searchResults.addEventListener('click', handleResultClick);

        // btnDescargarFicha.addEventListener('click', () => {
        //     if (currentObjectId) descargarFicha(currentObjectId);
        // });

        switchDBYF.addEventListener('change', (e) => {
            filtroDBYF = e.target.checked;
            
            if (currentSubclaseId) {
                renderizarObjetos(currentSubclaseId);
            }
            
            if (buscador.value.trim() !== '') {
                buscador.dispatchEvent(new Event('keyup')); 
            }
        });

        window.addEventListener('click', (e) => {
            // if (e.target == modal) { modal.style.display = "none"; btnDescargarFicha.style.display = "none"; }
            if (e.target == modal) { modal.style.display = "none";}
            if (e.target == modalInfo) { modalInfo.style.display = "none"; }
            if (e.target.id !== 'buscador' && e.target.closest('#search-results') === null) {
                searchResults.style.display = 'none';
            }
        });
    }

    
    function renderizarClases() {
        listaClases.innerHTML = '';
        listaSubclases.innerHTML = '';
        listaObjetos.innerHTML = '';
        currentSubclaseId = null; // Reset
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
        currentSubclaseId = null; // Reset
        const subclasesFiltradas = db.subclases.filter(s => s.ID_Clase_FK === idClasePadre);
        for (const subclase of subclasesFiltradas) {
            listaSubclases.innerHTML += `<li data-id="${subclase.ID_Subclase}">${subclase.Nombre_Subclase} (${subclase.ID_Subclase})</li>`;
        }
    }

    function renderizarObjetos(idSubclasePadre) {
        currentSubclaseId = idSubclasePadre; 
        listaObjetos.innerHTML = '';
        
        let objetosFiltrados = db.objetos.filter(o => o.ID_Subclase_FK === idSubclasePadre);

        if (filtroDBYF) {
            objetosFiltrados = objetosFiltrados.filter(o => o.DBYF === 'SI');
        }

        if (objetosFiltrados.length === 0) {
            listaObjetos.innerHTML = '<li class="vacio">No hay objetos DBYF en esta subclase</li>';
            return;
        }

        for (const objeto of objetosFiltrados) {
            listaObjetos.innerHTML += `<li data-id="${objeto.ID_Objeto}">${objeto.Nombre_Objeto} (${objeto.ID_Objeto})</li>`;
        }
    }

    function manejarClicClase(e) {
        if (e.target.closest('li')) { 
            const li = e.target.closest('li');
            quitarSeleccion(listaClases);
            li.classList.add('seleccionado');
            renderizarSubclases(li.dataset.id);
        }
    }

    function manejarClicSubclase(e) {
        if (e.target.tagName === 'LI') {
            quitarSeleccion(listaSubclases);
            e.target.classList.add('seleccionado');
            renderizarObjetos(e.target.dataset.id);
        }
    }

    function manejarClicObjeto(e) {
        if (e.target.closest('li') && !e.target.classList.contains('vacio')) {
            const li = e.target.closest('li');
            quitarSeleccion(listaObjetos);
            li.classList.add('seleccionado');
            mostrarModalObjeto(li.dataset.id);
        }
    }

    function handleSearch(e) {
        const searchTerm = normalizeText(e.target.value);
        searchResults.innerHTML = '';
        if (searchTerm.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        let html = '';
        let count = 0;
        const maxResults = 15;
        
        let objetosMatch = db.objetos.filter(o => o.Nombre_Normalizado.includes(searchTerm));
        
        if (filtroDBYF) {
            objetosMatch = objetosMatch.filter(o => o.DBYF === 'SI');
        }

        for (const objeto of objetosMatch) {
            if (count >= maxResults) break;
            html += `<li data-id="${objeto.ID_Objeto}" data-type="objeto">
                ${objeto.Nombre_Objeto} <span>(Objeto)</span>
            </li>`;
            count++;
        }

        if (!filtroDBYF) {
            const subclasesMatch = db.subclases.filter(s => s.Nombre_Normalizado.includes(searchTerm));
            for (const subclase of subclasesMatch) {
                if (count >= maxResults) break;
                html += `<li data-id="${subclase.ID_Subclase}" data-type="subclase">
                    ${subclase.Nombre_Subclase} <span>(Subclase)</span>
                </li>`;
                count++;
            }
        }
        
        if (html === '') {
            html = '<li class="no-results">No se encontraron resultados</li>';
        }
        searchResults.innerHTML = html;
        searchResults.style.display = 'block';
    }

    
    function handleResultClick(e) {
        const li = e.target.closest('li');
        if (!li || li.classList.contains('no-results')) return;
        const id = li.dataset.id;
        const type = li.dataset.type;
        if (type === 'objeto') { mostrarModalObjeto(id); }
        if (type === 'subclase') {
            const subclase = db.subclases.find(s => s.ID_Subclase === id);
            if (subclase) {
                renderizarClases();
                renderizarSubclases(subclase.ID_Clase_FK);
                renderizarObjetos(id);
            }
        }
        searchResults.style.display = 'none';
        buscador.value = '';
    }

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

    function mostrarModalInfo() {
        modalInfoCuerpo.innerHTML = '';
        
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

        if (db.fuentes && db.fuentes.length > 0) {
            modalInfoCuerpo.innerHTML += `<h3>Fuentes Principales</h3>`;
            let fuentesHtml = '<ul>';
            for (const item of db.fuentes) {
                fuentesHtml += `<li><a href="${item.Web || item.WEB || '#'}" target="_blank">${item.Nombre || item.NOMBRE || 'Fuente'}</a></li>`;
            }
            fuentesHtml += '</ul>';
            modalInfoCuerpo.innerHTML += fuentesHtml;
        }

        if (db.versiones && db.versiones.length > 0) {
            modalInfoCuerpo.innerHTML += `<h3>Control de Versiones</h3>`;
            
            let tablaVersiones = `
                <div class="tabla-versiones-container">
                    <table class="tabla-versiones">
                        <thead>
                            <tr>
                                <th>Versión</th>
                                <th>Autor</th>
                                <th>Colaboradores</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            for (const v of db.versiones) {
                const version = v['Versión'] || v['Version'] || v['VERSION'] || '';
                const autor = v['Autor'] || v['AUTOR'] || '';
                const colabs = v['Colaboradores'] || v['COLABORADORES'] || '';

                tablaVersiones += `
                    <tr>
                        <td class="col-version" data-label="Versión">${version}</td>
                        
                        <td class="col-autor" data-label="Autor">
                            ${autor}
                        </td>
                        <td class="col-colab" data-label="Colaboradores">
                            ${colabs}
                        </td>
                    </tr>
                `;
            }
            
            tablaVersiones += `</tbody></table></div>`;
            modalInfoCuerpo.innerHTML += tablaVersiones;
        }
        
        modalInfo.style.display = "block";
    }

    function quitarSeleccion(lista) {
        const seleccionado = lista.querySelector('li.seleccionado');
        if (seleccionado) {
            seleccionado.classList.remove('seleccionado');
        }
    }

    iniciarApp();
});