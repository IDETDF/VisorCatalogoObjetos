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

    // Elementos Formulario Catalogador
    const btnAbrirCatalogador = document.getElementById('btn-abrir-catalogador');
    const modalCatalogador = document.getElementById('modal-catalogador');
    const modalCatCerrar = document.getElementById('modal-cat-cerrar');
    const btnCancelarCat = document.getElementById('btn-cancelar-cat');
    const formCatalogador = document.getElementById('form-catalogador');

    const selClase = document.getElementById('cat-clase');
    const selSubclase = document.getElementById('cat-subclase');
    const selOG = document.getElementById('cat-og');
    const bloqueOtroSubclase = document.getElementById('cat-subclase-otro-bloque');
    const bloqueOtroOG = document.getElementById('cat-og-otro-bloque');
    const txtDefinicion = document.getElementById('cat-definicion');
    const txtGeometria = document.getElementById('cat-geometria');
    const contenedorAtributos = document.getElementById('contenedor-atributos');
    const btnAgregarAtributo = document.getElementById('btn-agregar-atributo');

    // Elementos Selector Modal de Atributos Existentes
    const btnBuscarAtrCatalogo = document.getElementById('btn-buscar-atributo-catalogo');
    const modalSelAtr = document.getElementById('modal-selector-atributos');
    const modalSelAtrCerrar = document.getElementById('modal-sel-atr-cerrar');
    const buscadorAtrCatalogo = document.getElementById('buscador-atr-catalogo');
    const listaAtrCatalogo = document.getElementById('lista-atributos-catalogo');

    let contadorAtributos = 0;

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
            btnVerMapa.onclick = () => { window.open(urlLink, '_blank'); };
        } else {
            btnVerMapa.style.display = "none";
            btnDescargarFicha.style.display = "none";
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

    function inicializarCatalogador() {
        btnAbrirCatalogador.addEventListener('click', () => {
            modalCatalogador.style.display = 'block';
            poblarComboClases();
        });

        modalCatCerrar.addEventListener('click', () => modalCatalogador.style.display = 'none');
        btnCancelarCat.addEventListener('click', () => modalCatalogador.style.display = 'none');

        selClase.addEventListener('change', manejarCambioClaseForm);
        selSubclase.addEventListener('change', manejarCambioSubclaseForm);
        selOG.addEventListener('change', manejarCambioOGForm);

        btnAgregarAtributo.addEventListener('click', () => {
            agregarCardAtributo();
        });

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

    function poblarComboClases() {
        selClase.innerHTML = '<option value="">-- Sin especificar / Desconocida --</option>';
        db.clases.forEach(c => {
            selClase.innerHTML += `<option value="${c.ID_Clase}">${c.ID_Clase} - ${c.Nombre_Clase}</option>`;
        });
        
        manejarCambioClaseForm();
    }

    function manejarCambioClaseForm() {
        const idClase = selClase.value;
        selSubclase.innerHTML = '<option value="">-- Sin especificar / Desconocida --</option>';
        if (bloqueOtroSubclase) bloqueOtroSubclase.style.display = 'none';

        if (idClase) {
            const subs = db.subclases.filter(s => s.ID_Clase_FK === idClase);
            subs.forEach(s => {
                selSubclase.innerHTML += `<option value="${s.ID_Subclase}">${s.ID_Subclase} - ${s.Nombre_Subclase}</option>`;
            });
        }
        
        selSubclase.innerHTML += '<option value="OTRO">-- OTRO (Nueva subclase) --</option>';
        manejarCambioSubclaseForm();
    }

    function manejarCambioSubclaseForm() {
        const idSub = selSubclase.value;
        selOG.innerHTML = '<option value="">Seleccione un objeto...</option>';

        if (idSub === 'OTRO') {
            if (bloqueOtroSubclase) bloqueOtroSubclase.style.display = 'grid';
            selOG.innerHTML = '<option value="OTRO" selected>-- OTRO (Definir nuevo objeto) --</option>';
            manejarCambioOGForm();
            return;
        } else {
            if (bloqueOtroSubclase) bloqueOtroSubclase.style.display = 'none';
        }

        if (idSub) {
            const objs = db.objetos.filter(o => o.ID_Subclase_FK === idSub);
            objs.forEach(o => {
                selOG.innerHTML += `<option value="${o.ID_Objeto}">${o.ID_Objeto} - ${o.Nombre_Objeto}</option>`;
            });
        }

        selOG.innerHTML += '<option value="OTRO">-- OTRO (Definir nuevo objeto) --</option>';
        manejarCambioOGForm();
    }

    function manejarCambioOGForm() {
        const idOG = selOG.value;
        contenedorAtributos.innerHTML = '';
        contadorAtributos = 0;

        if (idOG === 'OTRO') {
            if (bloqueOtroOG) bloqueOtroOG.style.display = 'grid';
            txtDefinicion.value = '';
            txtGeometria.value = 'Punto';
            return;
        }

        if (bloqueOtroOG) bloqueOtroOG.style.display = 'none';
        if (!idOG) {
            txtDefinicion.value = '';
            return;
        }

        const objeto = db.objetos.find(o => o.ID_Objeto === idOG);
        if (objeto) {
            txtDefinicion.value = objeto.Definicion || '';
            if (objeto.Geometria) {
                const geomEncontrada = Array.from(txtGeometria.options).find(opt => 
                    opt.value.toLowerCase().includes(objeto.Geometria.toLowerCase()) || 
                    objeto.Geometria.toLowerCase().includes(opt.value.toLowerCase())
                );
                if (geomEncontrada) txtGeometria.value = geomEncontrada.value;
            }

            const links = db.link.filter(l => l.ID_Objeto_FK === idOG);
            links.forEach(l => {
                const atr = db.atributos.find(a => a.ID_Atributo === l.ID_Atributo_FK);
                if (atr) {
                    const doms = db.dominios.filter(d => d.ID_Atributo_FK === atr.ID_Atributo);
                    agregarCardAtributo(atr, doms);
                }
            });
        }
    }

    function agregarCardAtributo(atrData = null, domsData = []) {
        contadorAtributos++;
        const index = contadorAtributos;

        const card = document.createElement('div');
        card.className = 'card-item-atributo';
        card.id = `cat-atr-card-${index}`;

        const codigo = atrData ? atrData.ID_Atributo : '';
        const nombre = atrData ? atrData.Nombre_Atributo : '';
        const def = atrData ? atrData.Definicion : '';
        const tipo = atrData ? atrData.Tipo_Atributo : 'Texto';
        const tieneDom = (atrData && (atrData.Tiene_Dominio === 'SI' || atrData.Tiene_Dominio === true)) || domsData.length > 0;
        const obs = atrData ? (atrData.Observaciones || '') : '';

        card.innerHTML = `
            <div class="card-item-cabecera">
                <strong>Atributo #${index}</strong>
                <button type="button" class="btn-eliminar-item" onclick="document.getElementById('cat-atr-card-${index}').remove()">Eliminar</button>
            </div>
            <div class="grid-atributo-campos">
                <div class="form-grupo">
                    <label>Código <span class="tooltip-icon" data-tooltip="Identificador alfanumérico corto del campo en la capa.">?</span></label>
                    <input type="text" class="atr-codigo" value="${codigo}" placeholder="Cod" required>
                </div>
                <div class="form-grupo">
                    <label>Nombre <span class="tooltip-icon" data-tooltip="Nombre completo formal del atributo.">?</span></label>
                    <input type="text" class="atr-nombre" value="${nombre}" placeholder="Nombre" required>
                </div>
                <div class="form-grupo">
                    <label>Definición <span class="tooltip-icon" data-tooltip="Descripción de los valores que almacena el atributo.">?</span></label>
                    <input type="text" class="atr-def" value="${def}" placeholder="Definición" required>
                </div>
                <div class="form-grupo">
                    <label>Tipo <span class="tooltip-icon" data-tooltip="Tipo de dato según esquema de base geográfica.">?</span></label>
                    <select class="atr-tipo">
                        <option value="Texto" ${tipo === 'Texto' ? 'selected' : ''}>Texto</option>
                        <option value="Entero" ${tipo === 'Entero' ? 'selected' : ''}>Entero</option>
                        <option value="Real" ${tipo === 'Real' ? 'selected' : ''}>Real</option>
                        <option value="Fecha" ${tipo === 'Fecha' ? 'selected' : ''}>Fecha</option>
                        <option value="Booleano" ${tipo === 'Booleano' ? 'selected' : ''}>Booleano</option>
                    </select>
                </div>
                <div class="form-grupo">
                    <label>Dominio <span class="tooltip-icon" data-tooltip="Si posee un listado cerrado de valores admisibles.">?</span></label>
                    <select class="atr-tiene-dom">
                        <option value="NO" ${!tieneDom ? 'selected' : ''}>NO</option>
                        <option value="SI" ${tieneDom ? 'selected' : ''}>SI</option>
                    </select>
                </div>
            </div>
            <div class="form-grupo" style="margin-top:0.4rem;">
                <label>Observaciones <span class="tooltip-icon" data-tooltip="Comentarios adicionales o particularidades del relevamiento.">?</span></label>
                <input type="text" class="atr-obs" value="${obs}" placeholder="Observaciones opcionales">
            </div>

            <div class="subseccion-dominios" id="cat-dom-sec-${index}" style="display: ${tieneDom ? 'block' : 'none'};">
                <label style="font-weight:bold; font-size:0.8rem; color:#444;">Valores de Dominio asociados:</label>
                <div class="contenedor-valores-dom" id="cat-dom-vals-${index}"></div>
                <button type="button" class="btn-mini-add" id="btn-add-val-${index}">+ Añadir Valor de Dominio</button>
            </div>
        `;

        contenedorAtributos.appendChild(card);

        const selDom = card.querySelector('.atr-tiene-dom');
        const contDomSec = card.querySelector(`#cat-dom-sec-${index}`);
        const contDomVals = card.querySelector(`#cat-dom-vals-${index}`);
        const btnAddDomVal = card.querySelector(`#btn-add-val-${index}`);

        selDom.addEventListener('change', () => {
            if (selDom.value === 'SI') {
                contDomSec.style.display = 'block';
                if (contDomVals.children.length === 0) {
                    agregarFilaDominio(contDomVals);
                }
            } else {
                contDomSec.style.display = 'none';
            }
        });

        btnAddDomVal.addEventListener('click', () => {
            agregarFilaDominio(contDomVals);
        });

        if (domsData && domsData.length > 0) {
            domsData.forEach(d => agregarFilaDominio(contDomVals, d.Codigo, d.Etiqueta, d.Definicion, d.Observaciones));
        } else if (tieneDom) {
            agregarFilaDominio(contDomVals);
        }
    }

    function agregarFilaDominio(contenedor, cod = '', eti = '', def = '', obs = '') {
        const div = document.createElement('div');
        div.className = 'grid-dominio-fila';
        div.innerHTML = `
            <input type="text" class="dom-cod" placeholder="Código" value="${cod}" required>
            <input type="text" class="dom-eti" placeholder="Etiqueta" value="${eti}" required>
            <input type="text" class="dom-def" placeholder="Definición" value="${def}">
            <input type="text" class="dom-obs" placeholder="Observaciones" value="${obs}">
            <button type="button" class="btn-eliminar-item" style="color:red; font-size:1rem;" title="Quitar">×</button>
        `;
        div.querySelector('button').addEventListener('click', () => div.remove());
        contenedor.appendChild(div);
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
                agregarCardAtributo(atr, doms);
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

    async function procesarGeneracionPDF(e) {
        e.preventDefault();

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

        const tituloCapa = document.getElementById('cat-capa-titulo').value.trim();
        const responsable = document.getElementById('cat-responsable').value.trim();

        let textoClase = 'Desconocida';
        if (selClase.value) {
            textoClase = selClase.options[selClase.selectedIndex].text;
        }

        let textoSubclase = 'Desconocida';
        if (selSubclase.value === 'OTRO') {
            const codSub = document.getElementById('cat-subclase-otro-cod').value.trim() || '---';
            const nomSub = document.getElementById('cat-subclase-otro-nom').value.trim() || 'Nueva Subclase';
            textoSubclase = `${codSub} - ${nomSub}`;
        } else if (selSubclase.value) {
            textoSubclase = selSubclase.options[selSubclase.selectedIndex].text;
        }

        let codOG = '', nomOG = '';
        if (selOG.value === 'OTRO') {
            codOG = document.getElementById('cat-og-otro-cod').value.trim() || '---';
            nomOG = document.getElementById('cat-og-otro-nom').value.trim() || 'Nuevo Objeto';
        } else {
            const ogObj = db.objetos.find(o => o.ID_Objeto === selOG.value);
            codOG = ogObj ? ogObj.ID_Objeto : selOG.value;
            nomOG = ogObj ? ogObj.Nombre_Objeto : '';
        }

        const geometria = txtGeometria.value;
        const definicion = txtDefinicion.value.trim();
        const simbologiaTxt = document.getElementById('cat-simbologia-txt').value.trim();

        const fileInput = document.getElementById('cat-simbologia-img');
        let simbologiaImgData = null;
        if (fileInput.files && fileInput.files[0]) {
            simbologiaImgData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (evt) => resolve(evt.target.result);
                reader.readAsDataURL(fileInput.files[0]);
            });
        }

        const cardsAtributos = contenedorAtributos.querySelectorAll('.card-item-atributo');
        const listaAtributos = [];
        const tablasDominios = [];

        cardsAtributos.forEach(card => {
            const codigo = card.querySelector('.atr-codigo').value.trim();
            const nombre = card.querySelector('.atr-nombre').value.trim();
            const def = card.querySelector('.atr-def').value.trim();
            const tipo = card.querySelector('.atr-tipo').value;
            const tieneDom = card.querySelector('.atr-tiene-dom').value;
            const obs = card.querySelector('.atr-obs').value.trim();

            listaAtributos.push({ codigo, nombre, def, tipo, tieneDom, obs });

            if (tieneDom === 'SI') {
                const filasDom = card.querySelectorAll('.grid-dominio-fila');
                const domValores = [];
                filasDom.forEach(f => {
                    domValores.push({
                        cod: f.querySelector('.dom-cod').value.trim(),
                        eti: f.querySelector('.dom-eti').value.trim(),
                        def: f.querySelector('.dom-def').value.trim(),
                        obs: f.querySelector('.dom-obs').value.trim()
                    });
                });
                tablasDominios.push({
                    atrCodigo: codigo,
                    atrNombre: nombre,
                    valores: domValores
                });
            }
        });

        const margenIzq = 14;
        const logoData = await getBase64ImageFromUrl('static/logoExcel.png');
        if (logoData) {
            doc.addImage(logoData.fullData, 'PNG', 50, 8, 110, 20);
        }

        let posY = 30;

        doc.autoTable({
            startY: posY,
            head: [
                [`FICHA DE OG ${tituloCapa.toUpperCase()}`],
                ['CATÁLOGO DE OBJETOS GEOGRÁFICOS'],
                ['INFRAESTRUCTURA DE DATOS ESPACIALES DE TIERRA DEL FUEGO AIAS']
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

        const resumenAtributosTexto = listaAtributos.map(a => `${a.codigo} - ${a.nombre}`).join('\n') || '(Sin atributos especificados)';

        doc.autoTable({
            startY: doc.lastAutoTable.finalY,
            body: [
                ['Responsable', { content: responsable, colSpan: 2 }],
                ['Clase', { content: textoClase, colSpan: 2 }],
                ['Subclase', { content: textoSubclase, colSpan: 2 }],
                ['OG', codOG, nomOG],
                ['Geometría', { content: geometria, colSpan: 2 }],
                ['Definición', { content: definicion, colSpan: 2 }],
                ['Atributos', { content: resumenAtributosTexto, colSpan: 2 }],
                ['Simbología', { content: simbologiaTxt || '(Ver muestra adjunta)', colSpan: 2 }]
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

        if (simbologiaImgData) {
            let yImg = doc.lastAutoTable.finalY + 3;
            if (yImg > 250) { doc.addPage(); yImg = 15; }
            doc.setFontSize(8);
            doc.text("Muestra de Simbología:", margenIzq, yImg + 4);
            doc.addImage(simbologiaImgData, 'JPEG', margenIzq + 40, yImg, 35, 18);
            doc.rect(margenIzq + 39, yImg - 1, 37, 20);
            doc.lastAutoTable.finalY = yImg + 22;
        }

        const filasAtrTabla = listaAtributos.map(a => [
            a.codigo, a.nombre, a.def, a.tipo, a.tieneDom, a.obs
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
            margin: { left: margenIzq, right: margenIzq }
        });

        tablasDominios.forEach(dom => {
            const filasDom = dom.valores.map(v => [
                v.cod, v.eti, v.def, v.obs
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
                margin: { left: margenIzq, right: margenIzq }
            });
        });

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

        const nomArchivo = `Ficha_OG_${normalizeText(tituloCapa).replace(/ /g, '_') || 'Catalogacion'}.pdf`;
        doc.save(nomArchivo);
        modalCatalogador.style.display = 'none';
    }

    iniciarApp();
});