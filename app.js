document.addEventListener('DOMContentLoaded', () => {

    async function getBase64ImageFromUrl(imageUrl) {
        try {
            const res = await fetch(imageUrl);
            const blob = await res.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64Full = reader.result;
                    const img = new Image();
                    img.onload = () => {
                        resolve({
                            base64: base64Full.split(',')[1],
                            fullData: base64Full,
                            width: img.width,
                            height: img.height
                        });
                    };
                    img.src = base64Full;
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.warn("No se pudo cargar la imagen", error);
            return null;
        }
    }

    let db = {
        clases: [], subclases: [], objetos: [], atributos: [],
        link: [], dominios: [], portada: [], fuentes: [], productor: [], versiones: []
    };
    let currentObjectId = null;
    let currentSubclaseId = null;
    let filtroDBYF = false;
    let filtroDisponibles = true;

    // Elementos Interfaz Principal
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
    const btnDescargarFicha = document.getElementById('btn-descargar-ficha');

    const switchDBYF = document.getElementById('filtro-dbyf');
    const switchDisponibles = document.getElementById('filtro-disponibles');
    const btnVerMapa = document.getElementById('btn-ver-mapa');
    const btnValidarSigce = document.getElementById('btn-validar-sigce');

    // Elementos Formulario Catalogador
    const btnAbrirCatalogador = document.getElementById('btn-abrir-catalogador');
    const btnAbrirPropuesta = document.getElementById('btn-abrir-propuesta');
    const modalCatalogador = document.getElementById('modal-catalogador') || document.getElementById('modal-catalogar');
    const modalCatCerrar = document.getElementById('modal-cat-cerrar');
    const modalCatTitulo = document.getElementById('modal-cat-titulo');
    const btnCancelarCat = document.getElementById('btn-cancelar-cat');
    const formCatalogador = document.getElementById('form-catalogador');
    const btnSubmitCatalogador = document.getElementById('btn-submit-catalogador');

    const btnModoExistente = document.getElementById('btn-modo-existente');
    const btnModoPropuesta = document.getElementById('btn-modo-propuesta');
    const inputModoOperacion = document.getElementById('cat-modo-operacion');
    const bloqueExistenteCabecera = document.getElementById('bloque-existente-cabecera');
    const bloquePropuestaMetadatos = document.getElementById('bloque-propuesta-metadatos');
    const grupoCatOG = document.getElementById('grupo-cat-og');

    const selClase = document.getElementById('cat-clase');
    const selSubclase = document.getElementById('cat-subclase');
    const selOG = document.getElementById('cat-og') || document.getElementById('cat-objeto');
    const infoDefClase = document.getElementById('cat-clase-def-info');
    const infoDefSubclase = document.getElementById('cat-subclase-def-info');

    const bloqueOtroClase = document.getElementById('cat-clase-otro-bloque');
    const inputClaseOtroCod = document.getElementById('cat-clase-otro-cod');
    const inputClaseOtroNom = document.getElementById('cat-clase-otro-nom');
    const inputClaseOtroDef = document.getElementById('cat-clase-otro-def');

    const bloqueOtroSubclase = document.getElementById('cat-subclase-otro-bloque');
    const inputSubclaseOtroCod = document.getElementById('cat-subclase-otro-cod');
    const inputSubclaseOtroNom = document.getElementById('cat-subclase-otro-nom');
    const inputSubclaseOtroDef = document.getElementById('cat-subclase-otro-def');

    const bloqueOtroOG = document.getElementById('cat-og-otro-bloque');
    const inputOGOtroCod = document.getElementById('cat-og-otro-cod');
    const inputOGOtroNom = document.getElementById('cat-og-otro-nom');

    const txtDefinicion = document.getElementById('cat-definicion');
    const txtGeometria = document.getElementById('cat-geometria');
    const selOGDbyf = document.getElementById('cat-og-dbyf');

    const contenedorSimbologias = document.getElementById('contenedor-simbologias');
    const btnAgregarSimbologia = document.getElementById('btn-agregar-simbologia');

    const contenedorAtributos = document.getElementById('contenedor-atributos');
    const btnAgregarAtributo = document.getElementById('btn-agregar-atributo');

    // Elementos Selector Modal de Atributos Existentes
    const btnBuscarAtrCatalogo = document.getElementById('btn-buscar-atributo-catalogo');
    const modalSelAtr = document.getElementById('modal-selector-atributos');
    const modalSelAtrCerrar = document.getElementById('modal-sel-atr-cerrar');
    const buscadorAtrCatalogo = document.getElementById('buscador-atr-catalogo');
    const listaAtrCatalogo = document.getElementById('lista-atributos-catalogo');

    let contadorAtributos = 0;
    let contadorDominios = 0;
    let contadorSimbologias = 1;
    let modoCatalogadorActual = 'existente';
    let snapshotOriginalOG = null;

    function buildSigceUrl(idObjeto) {
        const cleanId = String(idObjeto || '').trim().padStart(6, '0');
        return `/SIGCE/?objeto=${encodeURIComponent(cleanId)}`;
    }

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
            inicializarCatalogador();

        } catch (error) {
            console.error("Error al cargar la base de datos:", error);
        }

        listaClases.addEventListener('click', manejarClicClase);
        listaSubclases.addEventListener('click', manejarClicSubclase);
        listaObjetos.addEventListener('click', manejarClicObjeto);

        modalCerrar.addEventListener('click', () => {
            modal.style.display = "none";
            btnDescargarFicha.style.display = "none";
            btnVerMapa.style.display = "none";
            if (btnValidarSigce) btnValidarSigce.style.display = "none";
        });

        btnInfo.addEventListener('click', mostrarModalInfo);
        modalInfoCerrar.addEventListener('click', () => modalInfo.style.display = "none");

        buscador.addEventListener('keyup', handleSearch);
        searchResults.addEventListener('click', handleResultClick);

        btnDescargarFicha.addEventListener('click', () => {
            if (currentObjectId) descargarFicha(currentObjectId);
        });

        switchDBYF.addEventListener('change', (e) => {
            filtroDBYF = e.target.checked;
            if (currentSubclaseId) renderizarObjetos(currentSubclaseId);
            if (buscador.value.trim() !== '') buscador.dispatchEvent(new Event('keyup'));
        });

        switchDisponibles.addEventListener('change', (e) => {
            filtroDisponibles = e.target.checked;
            if (currentSubclaseId) renderizarObjetos(currentSubclaseId);
            if (buscador.value.trim() !== '') buscador.dispatchEvent(new Event('keyup'));
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = "none";
                btnDescargarFicha.style.display = "none";
                btnVerMapa.style.display = "none";
                if (btnValidarSigce) btnValidarSigce.style.display = "none";
            }
            if (e.target === modalInfo) { modalInfo.style.display = "none"; }
            if (e.target === modalCatalogador) { modalCatalogador.style.display = "none"; }
            if (modalSelAtr && e.target === modalSelAtr) { modalSelAtr.style.display = "none"; }
            if (e.target.id !== 'buscador' && e.target.closest('#search-results') === null) {
                searchResults.style.display = 'none';
            }
        });
    }

    function renderizarClases() {
        listaClases.innerHTML = '';
        listaSubclases.innerHTML = '';
        listaObjetos.innerHTML = '';
        currentSubclaseId = null;
        for (const clase of db.clases) {
            listaClases.innerHTML += `<li data-id="${clase.ID_Clase}">
                <img src="static/${clase.Nombre_Clase}.svg" class="icono-lista" alt="">
                ${clase.Nombre_Clase} (${clase.ID_Clase})
            </li>`;
        }
    }

    function renderizarSubclases(idClasePadre) {
        listaSubclases.innerHTML = '';
        listaObjetos.innerHTML = '';
        currentSubclaseId = null;
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
        if (filtroDisponibles) {
            objetosFiltrados = objetosFiltrados.filter(o => o.Link && o.Link.trim() !== "");
        }

        if (objetosFiltrados.length === 0) {
            listaObjetos.innerHTML = '<li class="vacio">No hay objetos con estos filtros</li>';
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
        if (filtroDBYF) objetosMatch = objetosMatch.filter(o => o.DBYF === 'SI');
        if (filtroDisponibles) objetosMatch = objetosMatch.filter(o => o.Link && o.Link.trim() !== "");

        for (const objeto of objetosMatch) {
            if (count >= maxResults) break;
            html += `<li data-id="${objeto.ID_Objeto}" data-type="objeto">
                ${objeto.Nombre_Objeto} <span>(Objeto)</span>
            </li>`;
            count++;
        }

        if (!filtroDBYF && !filtroDisponibles) {
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
        currentObjectId = idObjeto;
        const objeto = db.objetos.find(o => o.ID_Objeto === idObjeto);
        if (!objeto) return;

        modalTitulo.textContent = objeto.Nombre_Objeto;
        modalDefinicion.textContent = objeto.Definicion;
        modalGeometria.textContent = objeto.Geometria;
        modalTbody.innerHTML = '';

        const urlLink = objeto.Link || "";
        const tieneLink = (urlLink.trim() !== "");

        if (tieneLink) {
            btnVerMapa.style.display = "inline-flex";
            btnDescargarFicha.style.display = "inline-flex";
            btnVerMapa.onclick = () => { window.open(urlLink, '_blank', 'noopener,noreferrer'); };
        } else {
            btnVerMapa.style.display = "none";
            btnDescargarFicha.style.display = "none";
        }

        if (btnValidarSigce) {
            btnValidarSigce.style.display = "inline-flex";
            const sigceUrl = buildSigceUrl(objeto.ID_Objeto);
            btnValidarSigce.dataset.sigceUrl = sigceUrl;
            btnValidarSigce.onclick = () => {
                window.open(sigceUrl, '_blank', 'noopener,noreferrer');
            };
        }

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
                    <p><strong>Nombre</strong><span>${item.NOMBRE || ''}</span></p>
                    <p><strong>Dirección</strong><span>${item.DIRECCIÓN || ''}</span></p>
                    <p><strong>Ubicación</strong><span>${item.CIUDAD || ''}, ${item.PROVINCIA || ''} (${item.PAIS || ''})</span></p>
                    <p><strong>Teléfono</strong><span>${item.TELÉFONO || ''}</span></p>
                    <p><strong>Email</strong><span><a href="mailto:${item['E-MAIL'] || ''}">${item['E-MAIL'] || ''}</a></span></p>
                    <p><strong>Sitio Web</strong><span><a href="${item['SITIO WEB'] || '#'}" target="_blank">${item['SITIO WEB'] || ''}</a></span></p>
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
                        <td class="col-autor" data-label="Autor">${autor}</td>
                        <td class="col-colab" data-label="Colaboradores">${colabs}</td>
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
        if (seleccionado) seleccionado.classList.remove('seleccionado');
    }

    async function descargarFicha(idObjeto) {
        const objeto = db.objetos.find(o => o.ID_Objeto === idObjeto);
        if (!objeto) return;
        const subclase = db.subclases.find(s => s.ID_Subclase === objeto.ID_Subclase_FK);
        const clase = db.clases.find(c => c.ID_Clase === subclase.ID_Clase_FK);
        const linksAtributos = db.link.filter(l => l.ID_Objeto_FK === idObjeto);
        const idAtributos = linksAtributos.map(l => l.ID_Atributo_FK);

        const atributos = db.atributos.filter(a => idAtributos.includes(a.ID_Atributo)).sort((a,b) => a.ID_Atributo.localeCompare(b.ID_Atributo));
        const dominios = db.dominios.filter(d => idAtributos.includes(d.ID_Atributo_FK));

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Ficha Objeto', { views: [{ showGridLines: false }] });

        ws.columns = [
            { width: 25 }, { width: 15 }, { width: 50 }, { width: 20 }, { width: 15 }, { width: 30 }
        ];

        for(let i=1; i<=6; i++) { ws.getRow(i).height = 24.8; }

        const colorGris = 'FF353535';
        const colorNaranja = 'FFFD8D00';
        const colorGrisClaro = 'FFEFEFEF';
        const colorNegro = 'FF000000';
        const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        const styleCell = (cell, fontObj, fillHex, alignObj, borderObj) => {
            cell.font = { name: 'Arial', size: 10, ...fontObj };
            if(fillHex) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillHex } };
            if(alignObj) cell.alignment = alignObj;
            if(borderObj) cell.border = borderObj;
        };

        ws.mergeCells('A1:F6');
        const logoData = await getBase64ImageFromUrl('static/logoExcel.png');
        if (logoData) {
            const imageId = workbook.addImage({ base64: logoData.base64, extension: 'png' });
            ws.addImage(imageId, { tl: { col: 0, row: 0 }, br: { col: 6, row: 6 }, editAs: 'oneCell' });
        }

        ws.mergeCells('A7:F10');
        const celdaTitulo = ws.getCell('A7');
        celdaTitulo.value = `FICHA DE OG ${objeto.Nombre_Objeto.toUpperCase()}\nCATÁLOGO DE OBJETOS GEOGRÁFICOS\nINFRAESTRUCTURA DE DATOS ESPACIALES DE TIERRA DEL FUEGO AIAS`;
        styleCell(celdaTitulo, { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }, colorGris, { horizontal: 'center', vertical: 'middle', wrapText: true }, borderStyle);

        let currentRow = 11;
        const addDatoCodigo = (label, codigo, nombre) => {
            const row = ws.getRow(currentRow);
            const cellLabel = row.getCell(1); cellLabel.value = label;
            styleCell(cellLabel, { bold: true, color: { argb: colorGris } }, colorGrisClaro, { vertical: 'middle' }, borderStyle);

            const cellCode = row.getCell(2); cellCode.value = codigo;
            styleCell(cellCode, { bold: true }, null, { horizontal: 'center', vertical: 'middle' }, borderStyle);

            ws.mergeCells(currentRow, 3, currentRow, 6);
            const cellName = row.getCell(3); cellName.value = nombre;
            styleCell(cellName, null, null, { vertical: 'middle', wrapText: true }, borderStyle);
            currentRow++;
        };

        addDatoCodigo("Clase", clase.ID_Clase, clase.Nombre_Clase);
        addDatoCodigo("Subclase", subclase.ID_Subclase, subclase.Nombre_Subclase);
        addDatoCodigo("Objeto Geográfico (OG)", objeto.ID_Objeto, objeto.Nombre_Objeto);

        const rowGeo = ws.getRow(currentRow);
        const cellGeoLbl = rowGeo.getCell(1); cellGeoLbl.value = "Geometría";
        styleCell(cellGeoLbl, { bold: true, color: { argb: colorGris } }, colorGrisClaro, { vertical: 'middle' }, borderStyle);
        ws.mergeCells(currentRow, 2, currentRow, 6);
        const cellGeoVal = rowGeo.getCell(2); cellGeoVal.value = objeto.Geometria;
        styleCell(cellGeoVal, null, null, { vertical: 'middle', wrapText: true }, borderStyle);
        currentRow++;

        const rowDef = ws.getRow(currentRow);
        rowDef.height = 56.25;
        const cellDefLbl = rowDef.getCell(1); cellDefLbl.value = "Definición";
        styleCell(cellDefLbl, { bold: true, color: { argb: colorGris } }, colorGrisClaro, { vertical: 'middle' }, borderStyle);
        ws.mergeCells(currentRow, 2, currentRow, 6);
        const cellDefVal = rowDef.getCell(2); cellDefVal.value = objeto.Definicion;
        styleCell(cellDefVal, null, null, { vertical: 'middle', wrapText: true }, borderStyle);
        currentRow++;

        const rowSim = ws.getRow(currentRow);
        rowSim.height = 67.5;
        const cellSimLbl = rowSim.getCell(1); cellSimLbl.value = "SIMBOLOGÍA";
        styleCell(cellSimLbl, { bold: true, color: { argb: colorGris } }, null, { vertical: 'middle', horizontal: 'center' }, borderStyle);
        const cellSimImg = rowSim.getCell(2); cellSimImg.value = "";
        styleCell(cellSimImg, null, null, null, borderStyle);
        ws.mergeCells(currentRow, 3, currentRow, 6);
        const cellSimInfo = rowSim.getCell(3); cellSimInfo.value = "(Información suplementaria)";
        styleCell(cellSimInfo, { italic: true, color: { argb: 'FF999999' } }, null, { vertical: 'middle', horizontal: 'center' }, borderStyle);
        currentRow++;

        ws.addRow([]);
        currentRow++;

        ws.mergeCells(currentRow, 1, currentRow, 6);
        const cellTituloAtr = ws.getCell(`A${currentRow}`);
        cellTituloAtr.value = "LISTA DE ATRIBUTOS";
        styleCell(cellTituloAtr, { bold: true, color: { argb: 'FFFFFFFF' } }, colorGris, { horizontal: 'center', vertical: 'middle' }, borderStyle);
        currentRow++;

        const headers = ["CÓDIGO", "NOMBRE", "DEFINICIÓN", "TIPO DE ATRIBUTO", "DOMINIO", "OBSERVACIONES"];
        const rowHeader = ws.getRow(currentRow);
        headers.forEach((text, idx) => {
            const cell = rowHeader.getCell(idx + 1); cell.value = text;
            styleCell(cell, { bold: true, color: { argb: colorNegro } }, colorNaranja, { horizontal: 'center', vertical: 'middle' }, borderStyle);
        });
        currentRow++;

        atributos.forEach(a => {
            const row = ws.getRow(currentRow);
            const values = [a.ID_Atributo, a.Nombre_Atributo, a.Definicion, a.Tipo_Atributo, a.Tiene_Dominio, a.Observaciones];
            values.forEach((val, idx) => {
                const cell = row.getCell(idx + 1); cell.value = val;
                styleCell(cell, null, null, { vertical: 'top', wrapText: true }, borderStyle);
            });
            currentRow++;
        });

        currentRow++;

        atributos.forEach(attr => {
            const domsDelAtributo = dominios.filter(d => d.ID_Atributo_FK === attr.ID_Atributo);
            if (domsDelAtributo.length > 0) {
                ws.mergeCells(currentRow, 1, currentRow, 6);
                const cellTitDom = ws.getCell(`A${currentRow}`);
                cellTitDom.value = `VALORES DE DOMINIO ${attr.Nombre_Atributo.toUpperCase()} (${attr.ID_Atributo})`;
                styleCell(cellTitDom, { bold: true, color: { argb: 'FFFFFFFF' } }, colorGris, { horizontal: 'center', vertical: 'middle' }, borderStyle);
                currentRow++;

                const rowHeadDom = ws.getRow(currentRow);
                const cCod = rowHeadDom.getCell(1); cCod.value = "CÓDIGO";
                styleCell(cCod, { bold: true, color: { argb: colorNegro } }, colorNaranja, { horizontal: 'center' }, borderStyle);

                const cEti = rowHeadDom.getCell(2); cEti.value = "ETIQUETA";
                styleCell(cEti, { bold: true, color: { argb: colorNegro } }, colorNaranja, { horizontal: 'center' }, borderStyle);

                ws.mergeCells(currentRow, 3, currentRow, 5);
                const cDef = rowHeadDom.getCell(3); cDef.value = "DEFINICIÓN";
                styleCell(cDef, { bold: true, color: { argb: colorNegro } }, colorNaranja, { horizontal: 'center' }, borderStyle);

                const cObs = rowHeadDom.getCell(6); cObs.value = "OBSERVACIONES";
                styleCell(cObs, { bold: true, color: { argb: colorNegro } }, colorNaranja, { horizontal: 'center' }, borderStyle);
                currentRow++;

                domsDelAtributo.forEach(d => {
                    const rowVal = ws.getRow(currentRow);
                    const cellValCod = rowVal.getCell(1); cellValCod.value = d.Codigo;
                    styleCell(cellValCod, null, null, { vertical: 'top', wrapText: true, horizontal: 'center' }, borderStyle);

                    const cellValEti = rowVal.getCell(2); cellValEti.value = d.Etiqueta;
                    styleCell(cellValEti, null, null, { vertical: 'top', wrapText: true }, borderStyle);

                    ws.mergeCells(currentRow, 3, currentRow, 5);
                    const cellValDef = rowVal.getCell(3); cellValDef.value = d.Definicion;
                    styleCell(cellValDef, null, null, { vertical: 'top', wrapText: true }, borderStyle);

                    const cellValObs = rowVal.getCell(6); cellValObs.value = d.Observaciones || "";
                    styleCell(cellValObs, null, null, { vertical: 'top', wrapText: true }, borderStyle);
                    currentRow++;
                });

                ws.addRow([]);
                currentRow++;
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const cleanName = normalizeText(objeto.Nombre_Objeto).replace(/ /g, '_');
        saveAs(new Blob([buffer]), `Ficha_${objeto.ID_Objeto}_${cleanName}.xlsx`);
    }

    // ==========================================
    //   LÓGICA DEL CATALOGADOR Y GENERADOR PDF
    // ==========================================

    function sanitizarNombreArchivo(texto) {
        if (!texto) return 'SinNombre';
        return String(texto)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'SinNombre';
    }

    function leerArchivoComoDataURL(file) {
        return new Promise((resolve) => {
            if (!file) {
                resolve(null);
                return;
            }
            let resuelto = false;
            const finalizar = (val) => {
                if (!resuelto) {
                    resuelto = true;
                    resolve(val || null);
                }
            };
            const reader = new FileReader();
            reader.onload = (evt) => finalizar(evt && evt.target ? evt.target.result : reader.result);
            reader.onloadend = () => finalizar(reader.result);
            reader.onerror = () => finalizar(null);
            reader.readAsDataURL(file);
        });
    }

    function precargarMetadatosPropuesta() {
        const prod = (db.productor && db.productor[0]) ? db.productor[0] : {};
        const buscarPortada = (clave) => {
            const item = (db.portada || []).find(p => normalizeText(p.Clave) === normalizeText(clave));
            return item ? item.Valor : '';
        };

        const setIfEmpty = (id, defaultVal) => {
            const el = document.getElementById(id);
            if (el && !String(el.value || '').trim()) {
                el.value = defaultVal;
            }
        };

        setIfEmpty('prop-prod-nombre', prod.NOMBRE || 'INFRAESTRUCTURA DE DATOS ESPACIALES DE TIERRA DEL FUEGO, ANTÁRTIDA E ISLAS DEL ATLÁNTICO SUR');
        setIfEmpty('prop-prod-direccion', prod['DIRECCIÓN'] || 'Coordinación IDETDF: Gob. Paz 841, Ushuaia.');
        setIfEmpty('prop-prod-pais', prod.PAIS || 'REPÚBLICA ARGENTINA');
        setIfEmpty('prop-prod-provincia', prod.PROVINCIA || 'Tierra del Fuego, Antártida e Islas del Atlántico Sur');
        setIfEmpty('prop-prod-ciudad', prod.CIUDAD || 'Ushuaia');
        setIfEmpty('prop-prod-web', prod['SITIO WEB'] || 'https://ide.tierradelfuego.gob.ar/');
        setIfEmpty('prop-prod-contacto', prod.CONTACTO || 'Camila Cantero - Coordinación técnica IDETDF');
        setIfEmpty('prop-prod-cargo', prod.CARGO || 'Directora de Información Geográfica e IDE');
        setIfEmpty('prop-prod-telefono', prod['TELÉFONO'] || '');
        setIfEmpty('prop-prod-email', prod['E-MAIL'] || 'ide.tdf@gmail.com');

        setIfEmpty('prop-portada-titulo', 'PROPUESTA AL CATÁLOGO DE OBJETOS GEOGRÁFICOS DE LA INFRAESTRUCTURA DE DATOS ESPACIALES DE LA PROVINCIA DE TIERRA DEL FUEGO AIAS');
        setIfEmpty('prop-portada-alcance', buscarPortada('Alcance') || 'Facilitar el manejo de la información Geoespacial de forma homologada y descentralizada que contribuya a garantizar la interoperabilidad y calidad de la información generada en el ámbito provincial.');
        setIfEmpty('prop-portada-campo', buscarPortada('Campo de aplicación') || 'Generación, uso y visualización de Datos Geoespaciales de Tierra del Fuego, Antártida e Islas del Atlántico Sur');
        setIfEmpty('prop-portada-fecha', new Date().toISOString().slice(0, 10));
        setIfEmpty('prop-portada-lenguaje', buscarPortada('Lenguaje') || 'ESPAÑOL - ES');
    }

    function sincronizarControlesMetadatosPropuesta(esPropuesta) {
        if (!bloquePropuestaMetadatos) return;
        bloquePropuestaMetadatos.style.display = esPropuesta ? 'block' : 'none';
        const obligatoriosIds = new Set([
            'prop-prod-nombre', 'prop-prod-direccion', 'prop-prod-pais',
            'prop-prod-provincia', 'prop-prod-ciudad', 'prop-prod-contacto',
            'prop-prod-email', 'prop-portada-titulo', 'prop-portada-alcance',
            'prop-portada-campo', 'prop-portada-fecha', 'prop-portada-lenguaje'
        ]);
        const controles = bloquePropuestaMetadatos.querySelectorAll('input, textarea, select');
        controles.forEach(ctrl => {
            ctrl.disabled = !esPropuesta;
            ctrl.required = Boolean(esPropuesta && obligatoriosIds.has(ctrl.id));
        });
    }

    function sincronizarBloqueClaseOtro(activo) {
        if (!bloqueOtroClase) return;
        bloqueOtroClase.style.display = activo ? 'block' : 'none';
        [inputClaseOtroCod, inputClaseOtroNom, inputClaseOtroDef].forEach(inp => {
            if (inp) {
                inp.disabled = !activo;
                inp.required = Boolean(activo);
            }
        });
    }

    function sincronizarBloqueSubclaseOtro(activo) {
        if (!bloqueOtroSubclase) return;
        bloqueOtroSubclase.style.display = activo ? 'block' : 'none';
        [inputSubclaseOtroCod, inputSubclaseOtroNom, inputSubclaseOtroDef].forEach(inp => {
            if (inp) {
                inp.disabled = !activo;
                inp.required = Boolean(activo);
            }
        });
    }

    function sincronizarBloqueOGOtro(activo) {
        if (!bloqueOtroOG) return;
        bloqueOtroOG.style.display = activo ? 'grid' : 'none';
        if (inputOGOtroCod) {
            inputOGOtroCod.disabled = !activo;
            inputOGOtroCod.required = Boolean(activo);
        }
        if (inputOGOtroNom) {
            inputOGOtroNom.disabled = !activo;
            inputOGOtroNom.required = Boolean(activo);
        }
    }

    function cambiarModoCatalogador(modo) {
        modoCatalogadorActual = (modo === 'propuesta') ? 'propuesta' : 'existente';
        if (inputModoOperacion) {
            inputModoOperacion.value = modoCatalogadorActual;
        }

        const esPropuesta = (modoCatalogadorActual === 'propuesta');

        if (btnModoExistente) {
            if (!esPropuesta) btnModoExistente.classList.add('activo');
            else btnModoExistente.classList.remove('activo');
            btnModoExistente.dataset.activo = String(!esPropuesta);
            if (typeof btnModoExistente.setAttribute === 'function') {
                btnModoExistente.setAttribute('aria-selected', String(!esPropuesta));
            }
        }
        if (btnModoPropuesta) {
            if (esPropuesta) btnModoPropuesta.classList.add('activo');
            else btnModoPropuesta.classList.remove('activo');
            btnModoPropuesta.dataset.activo = String(esPropuesta);
            if (typeof btnModoPropuesta.setAttribute === 'function') {
                btnModoPropuesta.setAttribute('aria-selected', String(esPropuesta));
            }
        }

        if (modalCatTitulo) {
            modalCatTitulo.textContent = esPropuesta
                ? 'Propuestas al Catálogo de Objetos Geográficos (IDETDF)'
                : 'Catalogar Objeto Existente';
        }
        if (btnSubmitCatalogador) {
            btnSubmitCatalogador.textContent = esPropuesta
                ? '📄 Generar PDF Propuesta'
                : '📄 Generar PDF Catalogación';
        }

        const inpTitulo = document.getElementById('cat-capa-titulo');
        const inpResp = document.getElementById('cat-responsable');
        if (bloqueExistenteCabecera) {
            bloqueExistenteCabecera.style.display = esPropuesta ? 'none' : 'grid';
        }
        if (inpTitulo) {
            inpTitulo.disabled = esPropuesta;
            inpTitulo.required = !esPropuesta;
        }
        if (inpResp) {
            inpResp.disabled = esPropuesta;
            inpResp.required = !esPropuesta;
        }

        if (esPropuesta) {
            precargarMetadatosPropuesta();
        }
        sincronizarControlesMetadatosPropuesta(esPropuesta);

        if (grupoCatOG) {
            grupoCatOG.style.display = esPropuesta ? 'none' : 'flex';
        }
        if (selOG) {
            selOG.disabled = esPropuesta;
            selOG.required = !esPropuesta;
            if (esPropuesta) selOG.value = '';
        }

        if (selClase) {
            selClase.disabled = false;
            selClase.required = true;
        }
        if (selSubclase) {
            selSubclase.disabled = false;
            selSubclase.required = true;
        }
        if (selOGDbyf) {
            selOGDbyf.disabled = false;
            selOGDbyf.required = true;
        }

        snapshotOriginalOG = null;
        if (contenedorAtributos) {
            contenedorAtributos.innerHTML = '';
            contadorAtributos = 0;
        }
        if (contenedorSimbologias) {
            const itemsSimb = contenedorSimbologias.querySelectorAll('.simbologia-item');
            itemsSimb.forEach((it, idx) => {
                if (idx === 0) {
                    const inpD = it.querySelector('.simb-descripcion');
                    if (inpD) inpD.value = '';
                    const selV = it.querySelector('.simb-vinculo-dominio');
                    if (selV) selV.value = '';
                    const inpF = it.querySelector('.simb-img-input');
                    if (inpF) {
                        inpF.value = '';
                        if (Array.isArray(inpF.files)) inpF.files = [];
                    }
                } else {
                    it.remove();
                }
            });
            contadorSimbologias = 1;
        }
        if (txtDefinicion) txtDefinicion.value = '';

        sincronizarBloqueClaseOtro(false);
        sincronizarBloqueSubclaseOtro(false);
        sincronizarBloqueOGOtro(esPropuesta);

        poblarComboClases();
        actualizarOpcionesVinculoSimbologia();
    }

    if (typeof window !== 'undefined') {
        window.cambiarModoCatalogador = cambiarModoCatalogador;
    }

    function inicializarCatalogador() {
        if (btnAbrirCatalogador) {
            btnAbrirCatalogador.addEventListener('click', () => {
                modalCatalogador.style.display = 'block';
                cambiarModoCatalogador('existente');
            });
        }

        if (btnAbrirPropuesta) {
            btnAbrirPropuesta.addEventListener('click', () => {
                modalCatalogador.style.display = 'block';
                cambiarModoCatalogador('propuesta');
            });
        }

        if (btnModoExistente) {
            btnModoExistente.addEventListener('click', () => cambiarModoCatalogador('existente'));
        }
        if (btnModoPropuesta) {
            btnModoPropuesta.addEventListener('click', () => cambiarModoCatalogador('propuesta'));
        }

        modalCatCerrar.addEventListener('click', () => modalCatalogador.style.display = 'none');
        btnCancelarCat.addEventListener('click', () => modalCatalogador.style.display = 'none');

        selClase.addEventListener('change', manejarCambioClaseForm);
        selSubclase.addEventListener('change', manejarCambioSubclaseForm);
        selOG.addEventListener('change', manejarCambioOGForm);

        btnAgregarAtributo.addEventListener('click', () => {
            agregarCardAtributo(null, [], false);
        });

        if (btnAgregarSimbologia) {
            btnAgregarSimbologia.addEventListener('click', () => {
                agregarItemSimbologia();
            });
        }

        // Selector modal de atributos del catálogo
        if (btnBuscarAtrCatalogo) {
            btnBuscarAtrCatalogo.addEventListener('click', abrirSelectorAtributosCatalogo);
        }
        if (modalSelAtrCerrar) {
            modalSelAtrCerrar.addEventListener('click', () => { modalSelAtr.style.display = 'none'; });
        }
        if (buscadorAtrCatalogo) {
            buscadorAtrCatalogo.addEventListener('input', filtrarListaAtributosCatalogo);
        }

        formCatalogador.addEventListener('submit', procesarGeneracionPDF);
    }

    function sincronizarEstadoDominiosCard(contDomSec, contDomVals, activo) {
        if (!contDomSec || !contDomVals) return;
        contDomSec.style.display = activo ? 'block' : 'none';
        const filasInputs = contDomVals.querySelectorAll('input');
        filasInputs.forEach(inp => {
            inp.disabled = !activo;
            if (inp.classList.contains('dom-cod') || inp.classList.contains('dom-eti')) {
                inp.required = Boolean(activo);
            } else {
                inp.required = false;
            }
        });
    }

    function actualizarInfoDefinicionClase(idClase) {
        if (!infoDefClase) return;
        if (!idClase) {
            infoDefClase.style.display = 'none';
            infoDefClase.innerHTML = '';
            return;
        }
        if (idClase === 'NUEVA_CLASE' || idClase === 'OTRO') {
            infoDefClase.innerHTML = `<strong>Nueva Clase (Propuesta):</strong> Complete el código sugerido, nombre y definición conceptual de la nueva clase en el bloque inferior.`;
            infoDefClase.style.display = 'block';
            return;
        }
        const claseObj = db.clases.find(c => c.ID_Clase === idClase);
        if (claseObj && claseObj.Definicion) {
            infoDefClase.innerHTML = `<strong>Definición de Clase (${claseObj.ID_Clase} - ${claseObj.Nombre_Clase}):</strong> ${claseObj.Definicion}`;
            infoDefClase.style.display = 'block';
        } else {
            infoDefClase.style.display = 'none';
            infoDefClase.innerHTML = '';
        }
    }

    function actualizarInfoDefinicionSubclase(idSub) {
        if (!infoDefSubclase) return;
        if (!idSub) {
            infoDefSubclase.style.display = 'none';
            infoDefSubclase.innerHTML = '';
            return;
        }
        if (idSub === 'NUEVA_SUBCLASE' || idSub === 'OTRO') {
            infoDefSubclase.innerHTML = `<strong>Nueva Subclase (Propuesta):</strong> Complete el código sugerido, nombre formal y definición de la nueva subclase en el bloque inferior.`;
            infoDefSubclase.style.display = 'block';
            return;
        }
        const subObj = db.subclases.find(s => s.ID_Subclase === idSub);
        if (subObj && subObj.Definicion) {
            infoDefSubclase.innerHTML = `<strong>Definición de Subclase (${subObj.ID_Subclase} - ${subObj.Nombre_Subclase}):</strong> ${subObj.Definicion}`;
            infoDefSubclase.style.display = 'block';
        } else {
            infoDefSubclase.style.display = 'none';
            infoDefSubclase.innerHTML = '';
        }
    }

    function sanitizarControlesOcultosYValidar(formEl) {
        if (!formEl) return true;
        const controles = formEl.querySelectorAll('input, select, textarea');
        controles.forEach(ctrl => {
            if (ctrl.type === 'hidden') return;
            let oculto = false;
            let curr = ctrl;
            while (curr && curr !== formEl) {
                if (curr.style && curr.style.display === 'none') {
                    oculto = true;
                    break;
                }
                if (curr.classList && curr.classList.contains('hidden')) {
                    oculto = true;
                    break;
                }
                curr = curr.parentElement;
            }
            if (oculto) {
                ctrl.required = false;
                ctrl.disabled = true;
            }
        });

        for (const ctrl of controles) {
            if (ctrl.disabled || ctrl.type === 'hidden') continue;
            if (ctrl.required && !String(ctrl.value || '').trim()) {
                if (typeof ctrl.scrollIntoView === 'function') {
                    ctrl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                if (typeof ctrl.focus === 'function') {
                    ctrl.focus();
                }
                if (typeof ctrl.reportValidity === 'function') {
                    ctrl.reportValidity();
                }
                return false;
            }
        }
        return true;
    }

    function poblarComboClases() {
        selClase.innerHTML = '<option value="">Seleccione una clase...</option>';
        selClase.required = true;
        selClase.disabled = false;

        db.clases.forEach(c => {
            selClase.innerHTML += `<option value="${c.ID_Clase}">${c.ID_Clase} - ${c.Nombre_Clase}</option>`;
        });

        if (modoCatalogadorActual === 'propuesta') {
            selClase.innerHTML += '<option value="NUEVA_CLASE">+ Proponer Nueva Clase</option>';
        }

        manejarCambioClaseForm();
    }

    function manejarCambioClaseForm() {
        const idClase = selClase.value;
        const esPropuesta = (modoCatalogadorActual === 'propuesta');
        const esNuevaClase = esPropuesta && (idClase === 'NUEVA_CLASE' || idClase === 'OTRO');

        sincronizarBloqueClaseOtro(esNuevaClase);
        actualizarInfoDefinicionClase(idClase);

        selSubclase.innerHTML = '<option value="">Seleccione una subclase...</option>';
        selSubclase.required = true;
        selSubclase.disabled = false;

        if (idClase && !esNuevaClase) {
            const subs = db.subclases.filter(s => s.ID_Clase_FK === idClase);
            subs.forEach(s => {
                selSubclase.innerHTML += `<option value="${s.ID_Subclase}">${s.ID_Subclase} - ${s.Nombre_Subclase}</option>`;
            });
        }

        if (esPropuesta) {
            selSubclase.innerHTML += `<option value="NUEVA_SUBCLASE"${esNuevaClase ? ' selected' : ''}>+ Proponer Nueva Subclase</option>`;
            if (esNuevaClase) {
                selSubclase.value = 'NUEVA_SUBCLASE';
            }
        }

        manejarCambioSubclaseForm();
    }

    function manejarCambioSubclaseForm() {
        const idSub = selSubclase.value;
        const esPropuesta = (modoCatalogadorActual === 'propuesta');
        const esNuevaSub = esPropuesta && (idSub === 'NUEVA_SUBCLASE' || idSub === 'OTRO');

        sincronizarBloqueSubclaseOtro(esNuevaSub);
        actualizarInfoDefinicionSubclase(idSub);

        if (esPropuesta) {
            if (grupoCatOG) grupoCatOG.style.display = 'none';
            if (selOG) {
                selOG.disabled = true;
                selOG.required = false;
                selOG.value = '';
            }
            sincronizarBloqueOGOtro(true);
            return;
        }

        if (grupoCatOG) grupoCatOG.style.display = 'flex';
        if (selOG) {
            selOG.disabled = false;
            selOG.required = true;
            selOG.innerHTML = '<option value="">Seleccione un objeto...</option>';
            if (idSub) {
                const objs = db.objetos.filter(o => o.ID_Subclase_FK === idSub);
                objs.forEach(o => {
                    selOG.innerHTML += `<option value="${o.ID_Objeto}">${o.ID_Objeto} - ${o.Nombre_Objeto}</option>`;
                });
            }
        }
        sincronizarBloqueOGOtro(false);
        manejarCambioOGForm();
    }

    function precargarAtributosOG(idOG) {
        snapshotOriginalOG = {
            idObjeto: idOG,
            atributos: {}
        };

        const links = db.link.filter(l => l.ID_Objeto_FK === idOG);
        links.forEach(l => {
            const atr = db.atributos.find(a => a.ID_Atributo === l.ID_Atributo_FK);
            if (atr) {
                const doms = db.dominios.filter(d => d.ID_Atributo_FK === atr.ID_Atributo);
                const codAtr = String(atr.ID_Atributo || '').trim();
                const tieneDomStr = ((atr.Tiene_Dominio === 'SI' || atr.Tiene_Dominio === true) || doms.length > 0) ? 'SI' : 'NO';
                const domMap = {};
                doms.forEach(d => {
                    const cKey = String(d.Codigo ?? '').trim();
                    domMap[cKey] = {
                        cod: cKey,
                        eti: String(d.Etiqueta ?? '').trim(),
                        def: String(d.Definicion ?? '').trim(),
                        obs: String(d.Observaciones ?? '').trim()
                    };
                });
                snapshotOriginalOG.atributos[codAtr] = {
                    codigo: codAtr,
                    nombre: String(atr.Nombre_Atributo || '').trim(),
                    def: String(atr.Definicion || '').trim(),
                    tipo: String(atr.Tipo_Atributo || 'Texto').trim(),
                    tieneDom: tieneDomStr,
                    obs: String(atr.Observaciones || '').trim(),
                    totalDominios: doms.length,
                    dominios: domMap
                };
                agregarCardAtributo(atr, doms, true);
            }
        });
        actualizarOpcionesVinculoSimbologia();
    }

    function manejarCambioOGForm() {
        if (modoCatalogadorActual === 'propuesta') {
            sincronizarBloqueOGOtro(true);
            return;
        }

        const idOG = selOG ? selOG.value : '';
        contenedorAtributos.innerHTML = '';
        contadorAtributos = 0;
        snapshotOriginalOG = null;
        sincronizarBloqueOGOtro(false);

        if (!idOG) {
            txtDefinicion.value = '';
            actualizarOpcionesVinculoSimbologia();
            return;
        }

        const objeto = db.objetos.find(o => o.ID_Objeto === idOG);
        if (objeto) {
            txtDefinicion.value = objeto.Definicion || '';
            if (objeto.Geometria && txtGeometria && txtGeometria.options) {
                const geomEncontrada = Array.from(txtGeometria.options).find(opt =>
                    opt.value.toLowerCase().includes(objeto.Geometria.toLowerCase()) ||
                    objeto.Geometria.toLowerCase().includes(opt.value.toLowerCase())
                );
                if (geomEncontrada) txtGeometria.value = geomEncontrada.value;
            }
            if (selOGDbyf) {
                selOGDbyf.value = (objeto.DBYF === 'SI') ? 'SI' : 'NO';
            }
            precargarAtributosOG(idOG);
        }
    }

    // =========================================================
    //   FEAT-204: Detección en tiempo real de cambios (Badges)
    // =========================================================

    function actualizarBadgeElemento(badgeEl, estado) {
        if (!badgeEl) return;
        badgeEl.classList.remove('badge-estado-oficial', 'badge-estado-modificado', 'badge-estado-nuevo');
        if (estado === 'nuevo') {
            badgeEl.textContent = 'Nuevo';
            badgeEl.classList.add('badge-estado-cambio', 'badge-estado-nuevo');
        } else if (estado === 'modificado') {
            badgeEl.textContent = 'Modificado';
            badgeEl.classList.add('badge-estado-cambio', 'badge-estado-modificado');
        } else {
            badgeEl.textContent = 'Oficial';
            badgeEl.classList.add('badge-estado-cambio', 'badge-estado-oficial');
        }
    }

    function evaluarEstadoFilaDominio(fila) {
        if (!fila) return 'nuevo';
        const esOficial = (fila.dataset.origenDominio === 'oficial') && (modoCatalogadorActual === 'existente');
        let estado = 'nuevo';

        if (esOficial) {
            const codActual = (fila.querySelector('.dom-cod')?.value || '').trim();
            const etiActual = (fila.querySelector('.dom-eti')?.value || '').trim();
            const defActual = (fila.querySelector('.dom-def')?.value || '').trim();
            const obsActual = (fila.querySelector('.dom-obs')?.value || '').trim();

            const cambio =
                codActual !== (fila.dataset.codOriginal || '') ||
                etiActual !== (fila.dataset.etiOriginal || '') ||
                defActual !== (fila.dataset.defOriginal || '') ||
                obsActual !== (fila.dataset.obsOriginal || '');

            estado = cambio ? 'modificado' : 'original';
        }

        fila.dataset.estadoCambio = estado;
        const badgeDom = fila.querySelector('.badge-estado-dom');
        actualizarBadgeElemento(badgeDom, estado);
        return estado;
    }

    function evaluarEstadoCardAtributo(card) {
        if (!card) return 'nuevo';
        const filasDom = card.querySelectorAll('.grid-dominio-fila');
        let algunDomModificadoONuevo = false;
        filasDom.forEach(f => {
            const estDom = evaluarEstadoFilaDominio(f);
            if (estDom !== 'original') algunDomModificadoONuevo = true;
        });

        const esOficial = (card.dataset.origenAtributo === 'oficial') && (modoCatalogadorActual === 'existente');
        let estado = 'nuevo';

        if (esOficial) {
            const codOrig = card.dataset.codigoOriginal || '';
            const snapAtr = (snapshotOriginalOG && snapshotOriginalOG.atributos) ? snapshotOriginalOG.atributos[codOrig] : null;

            const codActual = (card.querySelector('.atr-codigo')?.value || '').trim();
            const nomActual = (card.querySelector('.atr-nombre')?.value || '').trim();
            const defActual = (card.querySelector('.atr-def')?.value || '').trim();
            const tipoActual = (card.querySelector('.atr-tipo')?.value || 'Texto').trim();
            const tieneDomActual = (card.querySelector('.atr-tiene-dom')?.value || 'NO').trim();
            const obsActual = (card.querySelector('.atr-obs')?.value || '').trim();

            let cambioCampos = false;
            if (snapAtr) {
                cambioCampos =
                    codActual !== snapAtr.codigo ||
                    nomActual !== snapAtr.nombre ||
                    defActual !== snapAtr.def ||
                    tipoActual !== snapAtr.tipo ||
                    tieneDomActual !== snapAtr.tieneDom ||
                    obsActual !== snapAtr.obs ||
                    filasDom.length !== snapAtr.totalDominios;
            } else {
                cambioCampos =
                    codActual !== (card.dataset.codigoOriginal || '') ||
                    nomActual !== (card.dataset.nombreOriginal || '') ||
                    defActual !== (card.dataset.defOriginal || '');
            }

            estado = (cambioCampos || algunDomModificadoONuevo) ? 'modificado' : 'original';
        }

        card.dataset.estadoCambio = estado;
        const badgeAtr = card.querySelector('.badge-estado-atr');
        actualizarBadgeElemento(badgeAtr, estado);
        actualizarOpcionesVinculoSimbologia();
        return estado;
    }

    // =========================================================
    //   FEAT-203: Simbología Múltiple (1:N) vinculada a dominios
    // =========================================================

    function obtenerOpcionesVinculoDominio() {
        const opciones = [{ value: '', text: 'General (Todo el objeto)' }];
        if (!contenedorAtributos) return opciones;

        const cards = contenedorAtributos.querySelectorAll('.card-item-atributo');
        cards.forEach(card => {
            const codAtr = (card.querySelector('.atr-codigo')?.value || '').trim();
            const nomAtr = (card.querySelector('.atr-nombre')?.value || '').trim();
            if (!codAtr) return;

            opciones.push({
                value: codAtr,
                text: `${codAtr} - ${nomAtr || 'Atributo'} (Atributo)`
            });

            const tieneDom = card.querySelector('.atr-tiene-dom')?.value === 'SI';
            if (tieneDom) {
                const filas = card.querySelectorAll('.grid-dominio-fila');
                filas.forEach(f => {
                    const codDom = (f.querySelector('.dom-cod')?.value || '').trim();
                    const etiDom = (f.querySelector('.dom-eti')?.value || '').trim();
                    if (codDom || etiDom) {
                        opciones.push({
                            value: `${codAtr}:${codDom}`,
                            text: `${codAtr} = ${codDom} (${etiDom || 'Valor'})`
                        });
                    }
                });
            }
        });
        return opciones;
    }

    function actualizarOpcionesVinculoSimbologia() {
        if (!contenedorSimbologias) return;
        const opciones = obtenerOpcionesVinculoDominio();
        const selects = contenedorSimbologias.querySelectorAll('.simb-vinculo-dominio');
        selects.forEach(sel => {
            const valorPrevio = sel.value;
            let html = '';
            opciones.forEach(opt => {
                const selectedAttr = (opt.value === valorPrevio) ? ' selected' : '';
                html += `<option value="${opt.value}"${selectedAttr}>${opt.text}</option>`;
            });
            sel.innerHTML = html;
            if (valorPrevio && opciones.some(o => o.value === valorPrevio)) {
                sel.value = valorPrevio;
            }
        });
    }

    function agregarItemSimbologia(datos = null) {
        if (!contenedorSimbologias) return null;
        contadorSimbologias++;
        const idx = contadorSimbologias;

        const desc = datos && datos.descripcion ? datos.descripcion : '';
        const item = document.createElement('div');
        item.className = 'simbologia-item';
        item.dataset.simbIdx = String(idx);
        item.innerHTML = `
            <div class="simbologia-item-cabecera">
                <span>Muestra de Simbología #${idx}</span>
                <button type="button" class="btn-eliminar-item btn-eliminar-simb">Eliminar muestra</button>
            </div>
            <div class="grid-simbologia-campos">
                <div class="form-grupo">
                    <label>Descripción / Regla de Simbología</label>
                    <input type="text" class="simb-descripcion" name="simb_descripcion_${idx}" value="${desc}" placeholder="Ej: Línea continua azul 2px / Categoría específica">
                </div>
                <div class="form-grupo">
                    <label>Vínculo con Atributo / Valor de Dominio</label>
                    <select class="simb-vinculo-dominio" name="simb_vinculo_${idx}">
                        <option value="">General (Todo el objeto)</option>
                    </select>
                </div>
                <div class="form-grupo">
                    <label>Imagen (PNG/JPG)</label>
                    <input type="file" class="simb-img-input" name="simb_img_${idx}" accept="image/*">
                </div>
            </div>
        `;

        const btnEliminar = item.querySelector('.btn-eliminar-simb');
        if (btnEliminar) {
            btnEliminar.addEventListener('click', () => item.remove());
        }

        contenedorSimbologias.appendChild(item);
        actualizarOpcionesVinculoSimbologia();

        if (datos && datos.vinculo) {
            const sel = item.querySelector('.simb-vinculo-dominio');
            if (sel) sel.value = datos.vinculo;
        }
        return item;
    }

    async function recolectarMuestrasSimbologia() {
        const muestras = [];
        const items = contenedorSimbologias ? contenedorSimbologias.querySelectorAll('.simbologia-item') : [];

        if (items && items.length > 0) {
            for (const item of items) {
                const inpDesc = item.querySelector('.simb-descripcion');
                const selVinc = item.querySelector('.simb-vinculo-dominio');
                const inpImg = item.querySelector('.simb-img-input');

                const descripcion = inpDesc ? inpDesc.value.trim() : '';
                const vinculo = selVinc ? selVinc.value : '';
                let vinculoEtiqueta = 'General (Todo el objeto)';
                if (selVinc && vinculo) {
                    const optMatch = (selVinc.options || []).find(o => o.value === vinculo);
                    vinculoEtiqueta = optMatch ? optMatch.text : vinculo;
                }

                let imgData = null;
                if (inpImg && inpImg.files && inpImg.files[0]) {
                    imgData = await leerArchivoComoDataURL(inpImg.files[0]);
                }

                if (descripcion || vinculo || imgData) {
                    muestras.push({
                        descripcion: descripcion || '(Muestra gráfica adjunta)',
                        vinculo,
                        vinculoEtiqueta,
                        imgData
                    });
                }
            }
        } else {
            // Fallback por si solo están los inputs directos #cat-simbologia-txt / #cat-simbologia-img
            const inpTxt = document.getElementById('cat-simbologia-txt');
            const inpImg = document.getElementById('cat-simbologia-img');
            const descripcion = inpTxt ? inpTxt.value.trim() : '';
            let imgData = null;
            if (inpImg && inpImg.files && inpImg.files[0]) {
                imgData = await leerArchivoComoDataURL(inpImg.files[0]);
            }
            if (descripcion || imgData) {
                muestras.push({
                    descripcion: descripcion || '(Muestra gráfica adjunta)',
                    vinculo: '',
                    vinculoEtiqueta: 'General (Todo el objeto)',
                    imgData
                });
            }
        }
        return muestras;
    }

    function agregarCardAtributo(atrData = null, domsData = [], esOficial = false) {
        contadorAtributos++;
        const index = contadorAtributos;

        const card = document.createElement('div');
        card.className = 'card-item-atributo atributo-card';
        card.id = `cat-atr-card-${index}`;

        const codigo = atrData ? String(atrData.ID_Atributo || '').trim() : '';
        const nombre = atrData ? String(atrData.Nombre_Atributo || '').trim() : '';
        const def = atrData ? String(atrData.Definicion || '').trim() : '';
        const tipo = atrData ? String(atrData.Tipo_Atributo || 'Texto').trim() : 'Texto';
        const tieneDom = (atrData && (atrData.Tiene_Dominio === 'SI' || atrData.Tiene_Dominio === true)) || (domsData && domsData.length > 0);
        const obs = atrData ? String(atrData.Observaciones || '').trim() : '';

        const origen = (esOficial && modoCatalogadorActual === 'existente') ? 'oficial' : 'nuevo';
        card.dataset.origenAtributo = origen;
        card.dataset.codigoOriginal = codigo;
        card.dataset.nombreOriginal = nombre;
        card.dataset.defOriginal = def;
        card.dataset.estadoCambio = (origen === 'oficial') ? 'original' : 'nuevo';

        const badgeInicialClase = (origen === 'oficial') ? 'badge-estado-oficial' : 'badge-estado-nuevo';
        const badgeInicialTexto = (origen === 'oficial') ? 'Oficial' : 'Nuevo';

        card.innerHTML = `
            <div class="card-item-cabecera">
                <div>
                    <strong>Atributo #${index}</strong>
                    <span class="badge-estado-cambio badge-estado-atr ${badgeInicialClase}">${badgeInicialTexto}</span>
                </div>
                <button type="button" class="btn-eliminar-item btn-eliminar-atr">Eliminar</button>
            </div>
            <div class="grid-atributo-campos">
                <div class="form-grupo">
                    <label>Código <span class="tooltip-icon" data-tooltip="Identificador alfanumérico corto del campo en la capa.">?</span></label>
                    <input type="text" class="atr-codigo" name="atr_codigo_${index}" value="${codigo}" placeholder="Cod" required>
                </div>
                <div class="form-grupo">
                    <label>Nombre <span class="tooltip-icon" data-tooltip="Nombre completo formal del atributo.">?</span></label>
                    <input type="text" class="atr-nombre" name="atr_nombre_${index}" value="${nombre}" placeholder="Nombre" required>
                </div>
                <div class="form-grupo">
                    <label>Definición <span class="tooltip-icon" data-tooltip="Descripción de los valores que almacena el atributo.">?</span></label>
                    <input type="text" class="atr-def" name="atr_def_${index}" value="${def}" placeholder="Definición" required>
                </div>
                <div class="form-grupo">
                    <label>Tipo <span class="tooltip-icon" data-tooltip="Tipo de dato según esquema de base geográfica.">?</span></label>
                    <select class="atr-tipo" name="atr_tipo_${index}">
                        <option value="Texto" ${tipo === 'Texto' ? 'selected' : ''}>Texto</option>
                        <option value="Entero" ${tipo === 'Entero' ? 'selected' : ''}>Entero</option>
                        <option value="Real" ${tipo === 'Real' ? 'selected' : ''}>Real</option>
                        <option value="Fecha" ${tipo === 'Fecha' ? 'selected' : ''}>Fecha</option>
                        <option value="Booleano" ${tipo === 'Booleano' ? 'selected' : ''}>Booleano</option>
                    </select>
                </div>
                <div class="form-grupo">
                    <label>Dominio <span class="tooltip-icon" data-tooltip="Si posee un listado cerrado de valores admisibles.">?</span></label>
                    <select class="atr-tiene-dom" name="atr_tiene_dom_${index}">
                        <option value="NO" ${!tieneDom ? 'selected' : ''}>NO</option>
                        <option value="SI" ${tieneDom ? 'selected' : ''}>SI</option>
                    </select>
                </div>
            </div>
            <div class="form-grupo" style="margin-top:0.4rem;">
                <label>Observaciones <span class="tooltip-icon" data-tooltip="Comentarios adicionales o particularidades del relevamiento.">?</span></label>
                <input type="text" class="atr-obs" name="atr_obs_${index}" value="${obs}" placeholder="Observaciones opcionales">
            </div>

            <div class="subseccion-dominios" id="cat-dom-sec-${index}" style="display: ${tieneDom ? 'block' : 'none'};">
                <label style="font-weight:bold; font-size:0.8rem; color:#444;">Valores de Dominio asociados:</label>
                <div class="contenedor-valores-dom" id="cat-dom-vals-${index}"></div>
                <button type="button" class="btn-mini-add" id="btn-add-val-${index}">+ Añadir Valor de Dominio</button>
            </div>
        `;

        contenedorAtributos.appendChild(card);

        const btnEliminarCard = card.querySelector('.btn-eliminar-atr');
        if (btnEliminarCard) {
            btnEliminarCard.addEventListener('click', () => {
                card.remove();
                actualizarOpcionesVinculoSimbologia();
            });
        }

        const selDom = card.querySelector('.atr-tiene-dom');
        const contDomSec = card.querySelector(`#cat-dom-sec-${index}`);
        const contDomVals = card.querySelector(`#cat-dom-vals-${index}`);
        const btnAddDomVal = card.querySelector(`#btn-add-val-${index}`);

        const inputsCard = card.querySelectorAll('.atr-codigo, .atr-nombre, .atr-def, .atr-tipo, .atr-obs');
        inputsCard.forEach(inp => {
            inp.addEventListener('input', () => evaluarEstadoCardAtributo(card));
            inp.addEventListener('change', () => evaluarEstadoCardAtributo(card));
        });

        selDom.addEventListener('change', () => {
            if (selDom.value === 'SI') {
                if (contDomVals.children.length === 0) {
                    agregarFilaDominio(contDomVals, '', '', '', '', true, false, card);
                }
                sincronizarEstadoDominiosCard(contDomSec, contDomVals, true);
            } else {
                sincronizarEstadoDominiosCard(contDomSec, contDomVals, false);
            }
            evaluarEstadoCardAtributo(card);
        });

        btnAddDomVal.addEventListener('click', () => {
            agregarFilaDominio(contDomVals, '', '', '', '', selDom.value === 'SI', false, card);
            evaluarEstadoCardAtributo(card);
        });

        if (domsData && domsData.length > 0) {
            domsData.forEach(d => agregarFilaDominio(
                contDomVals,
                d.Codigo,
                d.Etiqueta,
                d.Definicion,
                d.Observaciones,
                tieneDom,
                origen === 'oficial',
                card
            ));
        } else if (tieneDom) {
            agregarFilaDominio(contDomVals, '', '', '', '', true, false, card);
        }

        sincronizarEstadoDominiosCard(contDomSec, contDomVals, tieneDom);
        evaluarEstadoCardAtributo(card);
        return card;
    }

    function agregarFilaDominio(contenedor, cod = '', eti = '', def = '', obs = '', activo = true, esOficial = false, cardPadre = null) {
        contadorDominios++;
        const domIdx = contadorDominios;
        const reqAttr = activo ? 'required' : '';
        const disAttr = activo ? '' : 'disabled';

        const codStr = String(cod ?? '').trim();
        const etiStr = String(eti ?? '').trim();
        const defStr = String(def ?? '').trim();
        const obsStr = String(obs ?? '').trim();

        const origen = (esOficial && modoCatalogadorActual === 'existente') ? 'oficial' : 'nuevo';
        const badgeClase = (origen === 'oficial') ? 'badge-estado-oficial' : 'badge-estado-nuevo';
        const badgeTexto = (origen === 'oficial') ? 'Oficial' : 'Nuevo';

        const div = document.createElement('div');
        div.className = 'grid-dominio-fila';
        div.dataset.origenDominio = origen;
        div.dataset.codOriginal = codStr;
        div.dataset.etiOriginal = etiStr;
        div.dataset.defOriginal = defStr;
        div.dataset.obsOriginal = obsStr;
        div.dataset.estadoCambio = (origen === 'oficial') ? 'original' : 'nuevo';

        div.innerHTML = `
            <input type="text" class="dom-cod" name="dom_cod_${domIdx}" placeholder="Código" value="${codStr}" ${reqAttr} ${disAttr}>
            <input type="text" class="dom-eti" name="dom_eti_${domIdx}" placeholder="Etiqueta" value="${etiStr}" ${reqAttr} ${disAttr}>
            <input type="text" class="dom-def" name="dom_def_${domIdx}" placeholder="Definición" value="${defStr}" ${disAttr}>
            <input type="text" class="dom-obs" name="dom_obs_${domIdx}" placeholder="Observaciones" value="${obsStr}" ${disAttr}>
            <span class="badge-estado-cambio badge-estado-dom ${badgeClase}">${badgeTexto}</span>
            <button type="button" class="btn-eliminar-item" style="color:red; font-size:1rem;" title="Quitar">×</button>
        `;

        const inputsDom = div.querySelectorAll('input');
        inputsDom.forEach(inp => {
            const onEdit = () => {
                if (cardPadre) evaluarEstadoCardAtributo(cardPadre);
                else {
                    evaluarEstadoFilaDominio(div);
                    actualizarOpcionesVinculoSimbologia();
                }
            };
            inp.addEventListener('input', onEdit);
            inp.addEventListener('change', onEdit);
        });

        const btnQuitar = div.querySelector('button');
        if (btnQuitar) {
            btnQuitar.addEventListener('click', () => {
                div.remove();
                if (cardPadre) evaluarEstadoCardAtributo(cardPadre);
                else actualizarOpcionesVinculoSimbologia();
            });
        }

        contenedor.appendChild(div);
        return div;
    }

    // Funciones del Selector Modal de Atributos
    function abrirSelectorAtributosCatalogo() {
        if (!modalSelAtr) return;
        buscadorAtrCatalogo.value = '';
        renderizarListaAtributosCatalogo(db.atributos);
        modalSelAtr.style.display = 'block';
        buscadorAtrCatalogo.focus();
    }

    function renderizarListaAtributosCatalogo(lista) {
        if (!listaAtrCatalogo) return;
        listaAtrCatalogo.innerHTML = '';

        if (lista.length === 0) {
            listaAtrCatalogo.innerHTML = '<li style="color:#888; text-align:center; padding: 1.5rem;">No se encontraron atributos en el catálogo</li>';
            return;
        }

        lista.forEach(atr => {
            const li = document.createElement('li');
            const tieneDom = (atr.Tiene_Dominio === 'SI' || atr.Tiene_Dominio === true) ? ' • Con Dominio' : '';
            li.innerHTML = `
                <strong>${atr.ID_Atributo} - ${atr.Nombre_Atributo} <span style="color:var(--c-blue);">(${atr.Tipo_Atributo || 'Texto'}${tieneDom})</span></strong>
                <span>${atr.Definicion || 'Sin definición especificada'}</span>
            `;
            li.addEventListener('click', () => {
                const doms = db.dominios.filter(d => d.ID_Atributo_FK === atr.ID_Atributo);
                agregarCardAtributo(atr, doms, false);
                modalSelAtr.style.display = 'none';
            });
            listaAtrCatalogo.appendChild(li);
        });
    }

    function filtrarListaAtributosCatalogo(e) {
        const term = normalizeText(e.target.value);
        if (!term) {
            renderizarListaAtributosCatalogo(db.atributos);
            return;
        }
        const filtrados = db.atributos.filter(a => {
            const nom = normalizeText(a.Nombre_Atributo);
            const cod = normalizeText(a.ID_Atributo);
            const def = normalizeText(a.Definicion);
            return nom.includes(term) || cod.includes(term) || def.includes(term);
        });
        renderizarListaAtributosCatalogo(filtrados);
    }

    function renderizarSeccionSimbologiasPDF(doc, muestrasSimbologia, margenIzq, colorCabeceraRGB) {
        const startY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 4 : 40;
        const filasTexto = muestrasSimbologia.length > 0
            ? muestrasSimbologia.map((m, idx) => [
                `#${idx + 1}`,
                m.descripcion,
                m.vinculoEtiqueta || 'General (Todo el objeto)',
                m.imgData ? 'Ver muestra gráfica' : 'Sin imagen adjunta'
            ])
            : [['1', 'Sin especificaciones de simbología cargadas', 'General (Todo el objeto)', '---']];

        doc.autoTable({
            startY,
            head: [
                [{ content: 'SIMBOLOGÍA', colSpan: 4, styles: { halign: 'center', fillColor: colorCabeceraRGB, textColor: [255, 255, 255], fontStyle: 'bold' } }],
                ['#', 'Descripción / Regla Visual', 'Vínculo (Atributo / Dominio)', 'Muestra Gráfica']
            ],
            body: filasTexto,
            theme: 'plain',
            headStyles: {
                fillColor: [225, 238, 248],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                fontSize: 8,
                lineWidth: 0.2,
                lineColor: [0, 0, 0],
                halign: 'center'
            },
            styles: {
                fontSize: 7.5,
                cellPadding: 1.8,
                lineWidth: 0.2,
                lineColor: [0, 0, 0],
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
                1: { cellWidth: 75 },
                2: { cellWidth: 55 },
                3: { cellWidth: 40, halign: 'center' }
            },
            margin: { left: margenIzq, right: margenIzq }
        });

        const muestrasConImagen = muestrasSimbologia.filter(m => m.imgData);
        muestrasConImagen.forEach((m, idx) => {
            let yImg = doc.lastAutoTable.finalY + 3;
            if (yImg > 248) {
                if (typeof doc.addPage === 'function') doc.addPage();
                yImg = 15;
            }
            doc.setFontSize(8);
            const etiquetaImg = `Muestra #${idx + 1} (${m.vinculoEtiqueta}): ${m.descripcion}`;
            doc.text(etiquetaImg.slice(0, 95), margenIzq, yImg + 4);
            doc.addImage(m.imgData, 'JPEG', margenIzq, yImg + 6, 36, 18);
            doc.rect(margenIzq - 0.5, yImg + 5.5, 37, 19);
            doc.lastAutoTable.finalY = yImg + 26;
        });
    }

    function aplicarPieDePaginaPDF(doc, margenIzq) {
        const totalPaginas = doc.internal.getNumberOfPages();
        const fechaHoraActual = new Date().toLocaleString('es-AR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        for (let i = 1; i <= totalPaginas; i++) {
            doc.setPage(i);
            doc.setFontSize(7.5);
            doc.setTextColor(100, 100, 100);
            doc.setDrawColor(210, 210, 210);
            doc.line(margenIzq, 287, 210 - margenIzq, 287);

            const textoPie = `Generado el ${fechaHoraActual} hs - Visor del Catálogo de Objetos Geográficos | IDETDF AIAS`;
            doc.text(textoPie, margenIzq, 291);
            doc.text(`Página ${i} de ${totalPaginas}`, 210 - margenIzq, 291, { align: 'right' });
        }
    }

    async function procesarGeneracionPDF(e) {
        e.preventDefault();
        if (!sanitizarControlesOcultosYValidar(formCatalogador)) {
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const margenIzq = 14;

        // Recolectar atributos y dominios con su estado FEAT-204
        const cardsAtributos = contenedorAtributos.querySelectorAll('.card-item-atributo');
        const listaAtributos = [];
        const tablasDominios = [];

        cardsAtributos.forEach(card => {
            const estadoAtr = evaluarEstadoCardAtributo(card);
            const tagAtr = estadoAtr === 'nuevo' ? ' [NUEVO]' : (estadoAtr === 'modificado' ? ' [MODIFICADO]' : '');

            const codigo = card.querySelector('.atr-codigo').value.trim();
            const nombre = card.querySelector('.atr-nombre').value.trim();
            const def = card.querySelector('.atr-def').value.trim();
            const tipo = card.querySelector('.atr-tipo').value;
            const tieneDom = card.querySelector('.atr-tiene-dom').value;
            const obs = card.querySelector('.atr-obs').value.trim();

            listaAtributos.push({
                codigo,
                nombre,
                nombreConEstado: `${nombre}${tagAtr}`,
                def,
                tipo,
                tieneDom,
                obs: obs ? `${obs}${tagAtr}` : (tagAtr ? tagAtr.trim() : ''),
                obsLimpia: obs,
                estadoCambio: estadoAtr
            });

            if (tieneDom === 'SI') {
                const filasDom = card.querySelectorAll('.grid-dominio-fila');
                const domValores = [];
                filasDom.forEach(f => {
                    const estadoDom = evaluarEstadoFilaDominio(f);
                    const tagDom = estadoDom === 'nuevo' ? ' [NUEVO]' : (estadoDom === 'modificado' ? ' [MODIFICADO]' : '');
                    const cod = f.querySelector('.dom-cod').value.trim();
                    const eti = f.querySelector('.dom-eti').value.trim();
                    const defVal = f.querySelector('.dom-def').value.trim();
                    const obsVal = f.querySelector('.dom-obs').value.trim();

                    domValores.push({
                        cod,
                        eti,
                        etiConEstado: `${eti}${tagDom}`,
                        def: defVal,
                        obs: obsVal ? `${obsVal}${tagDom}` : (tagDom ? tagDom.trim() : ''),
                        obsLimpia: obsVal,
                        estadoCambio: estadoDom
                    });
                });
                tablasDominios.push({
                    atrCodigo: codigo,
                    atrNombre: nombre,
                    valores: domValores
                });
            }
        });

        const muestrasSimbologia = await recolectarMuestrasSimbologia();
        const geometria = txtGeometria ? txtGeometria.value : 'Punto';
        const definicion = txtDefinicion ? txtDefinicion.value.trim() : '';
        const dbyf = selOGDbyf ? selOGDbyf.value : 'NO';

        const logoData = await getBase64ImageFromUrl('static/logoExcel.png');
        if (logoData) {
            doc.addImage(logoData.fullData, 'PNG', 50, 8, 110, 20);
        }
        let posY = 30;

        // =========================================================================
        // MODO 2: PROPUESTAS AL CATÁLOGO DE OG (Plantilla Propuestas_al_COG_IDETDF)
        // =========================================================================
        if (modoCatalogadorActual === 'propuesta') {
            const colorAzulInst = [31, 78, 120]; // #1F4E78

            // 1. Encabezado Principal (#1F4E78)
            doc.autoTable({
                startY: posY,
                head: [
                    ['PROPUESTAS AL CATÁLOGO DE OBJETOS GEOGRÁFICOS'],
                    ['INFRAESTRUCTURA DE DATOS ESPACIALES DE TIERRA DEL FUEGO, ANTÁRTIDA E ISLAS DEL ATLÁNTICO SUR']
                ],
                theme: 'plain',
                styles: {
                    fillColor: colorAzulInst,
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center',
                    valign: 'middle',
                    cellPadding: 2,
                    fontSize: 9.5,
                    lineWidth: 0.2,
                    lineColor: [0, 0, 0]
                },
                margin: { left: margenIzq, right: margenIzq }
            });

            // 2. Tabla DATOS DEL PRODUCTOR
            const valCampo = (id, fallback = '') => {
                const el = document.getElementById(id);
                return (el && String(el.value || '').trim()) ? el.value.trim() : fallback;
            };

            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 3,
                head: [
                    [{ content: 'DATOS DEL PRODUCTOR', colSpan: 2, styles: { halign: 'center', fillColor: colorAzulInst, textColor: [255, 255, 255], fontStyle: 'bold' } }]
                ],
                body: [
                    ['NOMBRE', valCampo('prop-prod-nombre', 'INFRAESTRUCTURA DE DATOS ESPACIALES DE TIERRA DEL FUEGO, ANTÁRTIDA E ISLAS DEL ATLÁNTICO SUR')],
                    ['DIRECCIÓN', valCampo('prop-prod-direccion', 'Coordinación IDETDF: Gob. Paz 841, Ushuaia.')],
                    ['PAÍS', valCampo('prop-prod-pais', 'REPÚBLICA ARGENTINA')],
                    ['PROVINCIA', valCampo('prop-prod-provincia', 'Tierra del Fuego, Antártida e Islas del Atlántico Sur')],
                    ['CIUDAD', valCampo('prop-prod-ciudad', 'Ushuaia')],
                    ['SITIO WEB', valCampo('prop-prod-web', 'https://ide.tierradelfuego.gob.ar/')],
                    ['CONTACTO', valCampo('prop-prod-contacto', '')],
                    ['CARGO', valCampo('prop-prod-cargo', '')],
                    ['TELÉFONO', valCampo('prop-prod-telefono', '')],
                    ['E-MAIL', valCampo('prop-prod-email', '')]
                ],
                theme: 'plain',
                columnStyles: {
                    0: { cellWidth: 42, fontStyle: 'bold', fillColor: [235, 241, 245] },
                    1: { cellWidth: 140 }
                },
                styles: { fontSize: 8, cellPadding: 1.6, lineWidth: 0.2, lineColor: [0, 0, 0] },
                margin: { left: margenIzq, right: margenIzq }
            });

            // 3. Tabla PORTADA
            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 3,
                head: [
                    [{ content: 'PORTADA', colSpan: 2, styles: { halign: 'center', fillColor: colorAzulInst, textColor: [255, 255, 255], fontStyle: 'bold' } }]
                ],
                body: [
                    ['Título', valCampo('prop-portada-titulo', 'PROPUESTA AL CATÁLOGO DE OBJETOS GEOGRÁFICOS DE LA INFRAESTRUCTURA DE DATOS ESPACIALES DE LA PROVINCIA DE TIERRA DEL FUEGO AIAS')],
                    ['Alcance', valCampo('prop-portada-alcance', '')],
                    ['Campo de aplicación', valCampo('prop-portada-campo', '')],
                    ['Fecha', valCampo('prop-portada-fecha', new Date().toISOString().slice(0, 10))],
                    ['Lenguaje', valCampo('prop-portada-lenguaje', 'ESPAÑOL - ES')]
                ],
                theme: 'plain',
                columnStyles: {
                    0: { cellWidth: 42, fontStyle: 'bold', fillColor: [235, 241, 245] },
                    1: { cellWidth: 140 }
                },
                styles: { fontSize: 8, cellPadding: 1.6, lineWidth: 0.2, lineColor: [0, 0, 0] },
                margin: { left: margenIzq, right: margenIzq }
            });

            // 4. Sección CLASE y SUBCLASE
            let codClase = '', nomClase = '', defClase = '', estadoClase = 'Existente';
            if (selClase.value === 'NUEVA_CLASE' || selClase.value === 'OTRO') {
                codClase = inputClaseOtroCod ? inputClaseOtroCod.value.trim() : '---';
                nomClase = inputClaseOtroNom ? inputClaseOtroNom.value.trim() : 'Nueva Clase';
                defClase = inputClaseOtroDef ? inputClaseOtroDef.value.trim() : '';
                estadoClase = 'Propuesta Nueva Clase';
            } else {
                const cObj = db.clases.find(c => c.ID_Clase === selClase.value);
                codClase = cObj ? cObj.ID_Clase : selClase.value;
                nomClase = cObj ? cObj.Nombre_Clase : '';
                defClase = cObj ? (cObj.Definicion || '') : '';
            }

            let codSub = '', nomSub = '', defSub = '', estadoSub = 'Existente';
            if (selSubclase.value === 'NUEVA_SUBCLASE' || selSubclase.value === 'OTRO') {
                codSub = inputSubclaseOtroCod ? inputSubclaseOtroCod.value.trim() : '---';
                nomSub = inputSubclaseOtroNom ? inputSubclaseOtroNom.value.trim() : 'Nueva Subclase';
                defSub = inputSubclaseOtroDef ? inputSubclaseOtroDef.value.trim() : '';
                estadoSub = 'Propuesta Nueva Subclase';
            } else {
                const sObj = db.subclases.find(s => s.ID_Subclase === selSubclase.value);
                codSub = sObj ? sObj.ID_Subclase : selSubclase.value;
                nomSub = sObj ? sObj.Nombre_Subclase : '';
                defSub = sObj ? (sObj.Definicion || '') : '';
            }

            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 3,
                head: [
                    [{ content: 'CLASE Y SUBCLASE', colSpan: 4, styles: { halign: 'center', fillColor: colorAzulInst, textColor: [255, 255, 255], fontStyle: 'bold' } }],
                    ['Nivel / Condición', 'Código', 'Nombre', 'Definición']
                ],
                body: [
                    [`CLASE (${estadoClase})`, codClase, nomClase, defClase],
                    [`SUBCLASE (${estadoSub})`, codSub, nomSub, defSub]
                ],
                theme: 'plain',
                headStyles: { fillColor: [225, 238, 248], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8, lineWidth: 0.2, lineColor: [0, 0, 0], halign: 'center' },
                columnStyles: {
                    0: { cellWidth: 38, fontStyle: 'bold', fillColor: [235, 241, 245] },
                    1: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
                    2: { cellWidth: 42 },
                    3: { cellWidth: 80 }
                },
                styles: { fontSize: 8, cellPadding: 1.6, lineWidth: 0.2, lineColor: [0, 0, 0], valign: 'top' },
                margin: { left: margenIzq, right: margenIzq }
            });

            // 5. Sección OBJETO
            const codOGProp = inputOGOtroCod ? inputOGOtroCod.value.trim() : 'PROP';
            const nomOGProp = inputOGOtroNom ? inputOGOtroNom.value.trim() : 'Objeto Propuesto';

            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 3,
                head: [
                    [{ content: 'OBJETO', colSpan: 2, styles: { halign: 'center', fillColor: colorAzulInst, textColor: [255, 255, 255], fontStyle: 'bold' } }]
                ],
                body: [
                    ['Nombre', nomOGProp],
                    ['Código', codOGProp],
                    ['Geometría', geometria],
                    ['Definición', definicion],
                    ['Dato Básico y Fundamental', dbyf]
                ],
                theme: 'plain',
                columnStyles: {
                    0: { cellWidth: 48, fontStyle: 'bold', fillColor: [235, 241, 245] },
                    1: { cellWidth: 134 }
                },
                styles: { fontSize: 8, cellPadding: 1.6, lineWidth: 0.2, lineColor: [0, 0, 0], valign: 'top' },
                margin: { left: margenIzq, right: margenIzq }
            });

            // 6. Tabla ATRIBUTOS (6 columnas: Nombre, Código, Definición, Tipo, Dominio, Observaciones)
            const filasAtrPropuesta = listaAtributos.map(a => [
                a.nombre, a.codigo, a.def, a.tipo, a.tieneDom, a.obsLimpia
            ]);

            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 3,
                head: [
                    [{ content: 'ATRIBUTOS', colSpan: 6, styles: { halign: 'center', fillColor: colorAzulInst, textColor: [255, 255, 255], fontStyle: 'bold' } }],
                    ['Nombre', 'Código', 'Definición', 'Tipo', 'Dominio', 'Observaciones']
                ],
                body: filasAtrPropuesta.length > 0 ? filasAtrPropuesta : [['Sin atributos cargados', '---', '', '', '', '']],
                theme: 'plain',
                headStyles: { fillColor: [225, 238, 248], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8, lineWidth: 0.2, lineColor: [0, 0, 0], halign: 'center' },
                styles: { fontSize: 7.5, cellPadding: 1.6, lineWidth: 0.2, lineColor: [0, 0, 0], valign: 'top' },
                columnStyles: {
                    0: { cellWidth: 32 },
                    1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
                    2: { cellWidth: 55 },
                    3: { cellWidth: 25, halign: 'center' },
                    4: { cellWidth: 18, halign: 'center' },
                    5: { cellWidth: 32 }
                },
                margin: { left: margenIzq, right: margenIzq }
            });

            // 7. Sección SIMBOLOGÍA
            renderizarSeccionSimbologiasPDF(doc, muestrasSimbologia, margenIzq, colorAzulInst);

            // 8. Tabla DOMINIOS DE ATRIBUTOS (5 columnas: Atributo, Código del valor, Etiqueta, Definición del valor, Observaciones)
            const filasDominiosConsolidados = [];
            tablasDominios.forEach(dom => {
                dom.valores.forEach(v => {
                    filasDominiosConsolidados.push([
                        `${dom.atrNombre} (${dom.atrCodigo})`,
                        v.cod,
                        v.eti,
                        v.def,
                        v.obsLimpia
                    ]);
                });
            });

            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 3,
                head: [
                    [{ content: 'DOMINIOS DE ATRIBUTOS', colSpan: 5, styles: { halign: 'center', fillColor: colorAzulInst, textColor: [255, 255, 255], fontStyle: 'bold' } }],
                    ['Atributo', 'Código del valor', 'Etiqueta', 'Definición del valor', 'Observaciones']
                ],
                body: filasDominiosConsolidados.length > 0
                    ? filasDominiosConsolidados
                    : [['Sin dominios definidos', '---', '---', '---', '']],
                theme: 'plain',
                headStyles: { fillColor: [225, 238, 248], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8, lineWidth: 0.2, lineColor: [0, 0, 0], halign: 'center' },
                styles: { fontSize: 7.5, cellPadding: 1.6, lineWidth: 0.2, lineColor: [0, 0, 0], valign: 'top' },
                columnStyles: {
                    0: { cellWidth: 36, fontStyle: 'bold' },
                    1: { cellWidth: 24, halign: 'center' },
                    2: { cellWidth: 34 },
                    3: { cellWidth: 56 },
                    4: { cellWidth: 32 }
                },
                margin: { left: margenIzq, right: margenIzq }
            });

            aplicarPieDePaginaPDF(doc, margenIzq);
            const nomArchivoProp = `Propuesta_COG_IDETDF_${sanitizarNombreArchivo(nomOGProp)}.pdf`;
            doc.save(nomArchivoProp);
            modalCatalogador.style.display = 'none';
            return;
        }

        // =========================================================================
        // MODO 1: CATALOGAR OBJETO EXISTente (Catalogacion_COG_IDETDF_[Cod]_[Nom])
        // =========================================================================
        const tituloCapa = document.getElementById('cat-capa-titulo').value.trim();
        const responsable = document.getElementById('cat-responsable').value.trim();

        const claseObj = db.clases.find(c => c.ID_Clase === selClase.value);
        const textoClase = claseObj ? `${claseObj.ID_Clase} - ${claseObj.Nombre_Clase}` : selClase.value;

        const subObj = db.subclases.find(s => s.ID_Subclase === selSubclase.value);
        const textoSubclase = subObj ? `${subObj.ID_Subclase} - ${subObj.Nombre_Subclase}` : selSubclase.value;

        const ogObj = db.objetos.find(o => o.ID_Objeto === selOG.value);
        const codOG = ogObj ? ogObj.ID_Objeto : String(selOG.value || '').padStart(6, '0');
        const nomOG = ogObj ? ogObj.Nombre_Objeto : (tituloCapa || 'Objeto');

        doc.autoTable({
            startY: posY,
            head: [
                [`FICHA DE CATALOGACIÓN DE OG: ${nomOG.toUpperCase()} (${codOG})`],
                [`CAPA: ${tituloCapa.toUpperCase()}`],
                ['CATÁLOGO DE OBJETOS GEOGRÁFICOS - IDETDF AIAS']
            ],
            theme: 'plain',
            styles: {
                fillColor: [36, 186, 214],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle',
                cellPadding: 1.5,
                fontSize: 9,
                lineWidth: 0.2,
                lineColor: [0, 0, 0]
            },
            margin: { left: margenIzq, right: margenIzq }
        });

        const resumenAtributosTexto = listaAtributos.map(a => `${a.codigo} - ${a.nombreConEstado}`).join('\n') || '(Sin atributos especificados)';
        const resumenSimbologiaTexto = muestrasSimbologia.map(m => `${m.descripcion} [${m.vinculoEtiqueta}]`).join('\n') || '(Sin simbología especificada)';

        doc.autoTable({
            startY: doc.lastAutoTable.finalY,
            body: [
                ['Responsable', { content: responsable, colSpan: 2 }],
                ['Clase', { content: textoClase, colSpan: 2 }],
                ['Subclase', { content: textoSubclase, colSpan: 2 }],
                ['OG', codOG, nomOG],
                ['Geometría', { content: geometria, colSpan: 2 }],
                ['Dato Básico (DBYF)', { content: dbyf, colSpan: 2 }],
                ['Definición', { content: definicion, colSpan: 2 }],
                ['Atributos', { content: resumenAtributosTexto, colSpan: 2 }],
                ['Simbología', { content: resumenSimbologiaTexto, colSpan: 2 }]
            ],
            theme: 'plain',
            columnStyles: {
                0: { cellWidth: 32, fontStyle: 'bold', fillColor: [240, 240, 240] },
                1: { cellWidth: 28, halign: 'center' },
                2: { cellWidth: 122 }
            },
            styles: {
                fontSize: 8.5,
                cellPadding: 2,
                lineWidth: 0.2,
                lineColor: [0, 0, 0],
                valign: 'top'
            },
            margin: { left: margenIzq, right: margenIzq }
        });

        renderizarSeccionSimbologiasPDF(doc, muestrasSimbologia, margenIzq, [36, 186, 214]);

        const filasAtrTabla = listaAtributos.map(a => [
            a.codigo, a.nombreConEstado, a.def, a.tipo, a.tieneDom, a.obs
        ]);

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 4,
            head: [
                [{ content: 'LISTA DE ATRIBUTOS', colSpan: 6, styles: { halign: 'center', fillColor: [200, 245, 255], textColor: [0, 0, 0], fontStyle: 'bold' } }],
                ['CÓDIGO', 'NOMBRE', 'DEFINICIÓN', 'TIPO DE ATRIBUTO', 'DOMINIO', 'OBSERVACIONES']
            ],
            body: filasAtrTabla.length > 0 ? filasAtrTabla : [['---', 'Sin atributos cargados', '', '', '', '']],
            theme: 'plain',
            headStyles: {
                fillColor: [220, 250, 255],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                fontSize: 8,
                lineWidth: 0.2,
                lineColor: [0, 0, 0],
                halign: 'center'
            },
            styles: {
                fontSize: 7.5,
                cellPadding: 1.8,
                lineWidth: 0.2,
                lineColor: [0, 0, 0],
                valign: 'top'
            },
            columnStyles: {
                0: { cellWidth: 20, halign: 'center', textColor: [0, 50, 160] },
                1: { cellWidth: 32 },
                2: { cellWidth: 55 },
                3: { cellWidth: 25, halign: 'center' },
                4: { cellWidth: 18, halign: 'center' },
                5: { cellWidth: 32 }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && listaAtributos[data.row.index]) {
                    const est = listaAtributos[data.row.index].estadoCambio;
                    if (est === 'nuevo') data.cell.styles.fillColor = [220, 252, 231];
                    else if (est === 'modificado') data.cell.styles.fillColor = [254, 243, 199];
                }
            },
            margin: { left: margenIzq, right: margenIzq }
        });

        tablasDominios.forEach(dom => {
            const filasDom = dom.valores.map(v => [
                v.cod, v.etiConEstado, v.def, v.obs
            ]);

            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 4,
                head: [
                    [{ content: `VALORES DE DOMINIO: ${dom.atrNombre.toUpperCase()} (${dom.atrCodigo})`, colSpan: 4, styles: { halign: 'center', fillColor: [200, 245, 255], textColor: [0, 0, 0], fontStyle: 'bold' } }],
                    ['Código', 'Etiqueta', 'Definición', 'Observaciones']
                ],
                body: filasDom.length > 0 ? filasDom : [['', '', '', '']],
                theme: 'plain',
                headStyles: {
                    fillColor: [220, 250, 255],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    fontSize: 8,
                    lineWidth: 0.2,
                    lineColor: [0, 0, 0],
                    halign: 'center'
                },
                styles: {
                    fontSize: 7.5,
                    cellPadding: 1.5,
                    lineWidth: 0.2,
                    lineColor: [0, 0, 0],
                    valign: 'top'
                },
                columnStyles: {
                    0: { cellWidth: 20, halign: 'center', textColor: [0, 50, 160] },
                    1: { cellWidth: 40 },
                    2: { cellWidth: 80 },
                    3: { cellWidth: 42 }
                },
                didParseCell: (data) => {
                    if (data.section === 'body' && dom.valores[data.row.index]) {
                        const est = dom.valores[data.row.index].estadoCambio;
                        if (est === 'nuevo') data.cell.styles.fillColor = [220, 252, 231];
                        else if (est === 'modificado') data.cell.styles.fillColor = [254, 243, 199];
                    }
                },
                margin: { left: margenIzq, right: margenIzq }
            });
        });

        aplicarPieDePaginaPDF(doc, margenIzq);

        const nomArchivo = `Catalogacion_COG_IDETDF_${codOG}_${sanitizarNombreArchivo(nomOG)}.pdf`;
        doc.save(nomArchivo);
        modalCatalogador.style.display = 'none';
    }

    iniciarApp();
});