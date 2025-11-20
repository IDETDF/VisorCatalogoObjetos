document.addEventListener('DOMContentLoaded', () => {

    async function getBase64ImageFromUrl(imageUrl) {
        try {
            const res = await fetch(imageUrl);
            const blob = await res.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64Full = reader.result;
                    // Creamos una imagen temporal para leer sus dimensiones
                    const img = new Image();
                    img.onload = () => {
                        resolve({
                            // ExcelJS necesita el base64 sin la cabecera "data:image..."
                            base64: base64Full.split(',')[1], 
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
            console.warn("No se pudo cargar el logo", error);
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
            
            if (currentSubclaseId) {
                renderizarObjetos(currentSubclaseId);
            }
            
            if (buscador.value.trim() !== '') {
                buscador.dispatchEvent(new Event('keyup')); 
            }
        });

        window.addEventListener('click', (e) => {
            if (e.target == modal) { modal.style.display = "none"; }
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
        
        currentObjectId = idObjeto;
        
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

   // --- 11. FUNCIÓN DE DESCARGA EXCEL (ARIAL 10 + ESTILOS CORREGIDOS) ---
    async function descargarFicha(idObjeto) {
        // 1. Obtener datos
        const objeto = db.objetos.find(o => o.ID_Objeto === idObjeto);
        if (!objeto) return;
        const subclase = db.subclases.find(s => s.ID_Subclase === objeto.ID_Subclase_FK);
        const clase = db.clases.find(c => c.ID_Clase === subclase.ID_Clase_FK);
        const linksAtributos = db.link.filter(l => l.ID_Objeto_FK === idObjeto);
        const idAtributos = linksAtributos.map(l => l.ID_Atributo_FK);
        
        // Ordenamos atributos
        const atributos = db.atributos.filter(a => idAtributos.includes(a.ID_Atributo)).sort((a,b) => a.ID_Atributo.localeCompare(b.ID_Atributo));
        const dominios = db.dominios.filter(d => idAtributos.includes(d.ID_Atributo_FK));

        // 2. Crear Libro y Hoja
        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Ficha Objeto', { views: [{ showGridLines: false }] });

        // 3. Definir Columnas
        ws.columns = [
            { width: 25 }, // A
            { width: 15 }, // B
            { width: 50 }, // C
            { width: 20 }, // D
            { width: 15 }, // E
            { width: 30 }  // F
        ];

        // --- 3.1 AJUSTE DE FILAS (LOGO 1573x244) ---
        const rowHeightPt = 24.8; 
        for(let i=1; i<=6; i++) { ws.getRow(i).height = rowHeightPt; }

        // --- ESTILOS Y COLORES ---
        const colorGris = 'FF353535'; 
        const colorNaranja = 'FFFD8D00'; 
        const colorGrisClaro = 'FFEFEFEF';
        const colorNegro = 'FF000000'; 
        const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        
        // Helper para estilos (Forzamos Arial 10 por defecto)
        const styleCell = (cell, fontObj, fillHex, alignObj, borderObj) => {
            // Base: Arial 10
            const fontBase = { name: 'Arial', size: 10, ...fontObj }; 
            cell.font = fontBase;
            
            if(fillHex) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillHex } };
            if(alignObj) cell.alignment = alignObj;
            if(borderObj) cell.border = borderObj;
        };

        // 4. --- LOGO (A1:F6) ---
        ws.mergeCells('A1:F6');
        const logoData = await getBase64ImageFromUrl('static/logoExcel.png');
        if (logoData) {
            const imageId = workbook.addImage({ base64: logoData.base64, extension: 'png' });
            ws.addImage(imageId, { tl: { col: 0, row: 0 }, br: { col: 6, row: 6 }, editAs: 'oneCell' });
        }

        // 5. --- TÍTULO PRINCIPAL (ARIAL 12) ---
        ws.mergeCells('A7:F10');
        const celdaTitulo = ws.getCell('A7');
        celdaTitulo.value = `FICHA DE OG ${objeto.Nombre_Objeto.toUpperCase()}\nCATÁLOGO DE OBJETOS GEOGRÁFICOS\nINFRAESTRUCTURA DE DATOS ESPACIALES DE TIERRA DEL FUEGO AeIAS`;
        // Único elemento con tamaño 12
        styleCell(celdaTitulo, { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }, colorGris, { horizontal: 'center', vertical: 'middle', wrapText: true }, borderStyle);

        // 6. --- DATOS DEL OBJETO (ARIAL 10) ---
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

        // Geometría
        const rowGeo = ws.getRow(currentRow);
        const cellGeoLbl = rowGeo.getCell(1); cellGeoLbl.value = "Geometría";
        styleCell(cellGeoLbl, { bold: true, color: { argb: colorGris } }, colorGrisClaro, { vertical: 'middle' }, borderStyle);
        ws.mergeCells(currentRow, 2, currentRow, 6);
        const cellGeoVal = rowGeo.getCell(2); cellGeoVal.value = objeto.Geometria;
        styleCell(cellGeoVal, null, null, { vertical: 'middle', wrapText: true }, borderStyle);
        currentRow++;

        // Definición
        const rowDef = ws.getRow(currentRow);
        rowDef.height = 56.25; 
        const cellDefLbl = rowDef.getCell(1); cellDefLbl.value = "Definición";
        styleCell(cellDefLbl, { bold: true, color: { argb: colorGris } }, colorGrisClaro, { vertical: 'middle' }, borderStyle);
        ws.mergeCells(currentRow, 2, currentRow, 6); 
        const cellDefVal = rowDef.getCell(2); cellDefVal.value = objeto.Definicion;
        styleCell(cellDefVal, null, null, { vertical: 'middle', wrapText: true }, borderStyle);
        currentRow++; 

        // --- 7. SIMBOLOGÍA ---
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

        // --- 8. LISTA DE ATRIBUTOS ---
        ws.mergeCells(currentRow, 1, currentRow, 6);
        const cellTituloAtr = ws.getCell(`A${currentRow}`); 
        cellTituloAtr.value = "LISTA DE ATRIBUTOS";
        // Título Sección: Gris Oscuro + Texto Blanco
        styleCell(cellTituloAtr, { bold: true, color: { argb: 'FFFFFFFF' } }, colorGris, { horizontal: 'center', vertical: 'middle' }, borderStyle);
        currentRow++;

        const headers = ["CÓDIGO", "NOMBRE", "DEFINICIÓN", "TIPO DE ATRIBUTO", "DOMINIO", "OBSERVACIONES"];
        const rowHeader = ws.getRow(currentRow);
        headers.forEach((text, idx) => {
            const cell = rowHeader.getCell(idx + 1); cell.value = text;
            // Encabezados Tabla: Naranja + Texto Negro
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

        // --- 9. VALORES DE DOMINIOS (CORREGIDO) ---
        
        atributos.forEach(attr => {
            const domsDelAtributo = dominios.filter(d => d.ID_Atributo_FK === attr.ID_Atributo);

            if (domsDelAtributo.length > 0) {
                
                // A) Título Específico del Atributo
                ws.mergeCells(currentRow, 1, currentRow, 6);
                const cellTitDom = ws.getCell(`A${currentRow}`);
                cellTitDom.value = `VALORES DE DOMINIO ${attr.Nombre_Atributo.toUpperCase()} (${attr.ID_Atributo})`;
                
                // CORRECCIÓN: Volvemos al estilo INSTITUCIONAL (Gris Oscuro + Blanco + Centrado)
                styleCell(cellTitDom, 
                    { bold: true, color: { argb: 'FFFFFFFF' } }, // Letra Blanca, Arial 10
                    colorGris, // Fondo Gris Oscuro
                    { horizontal: 'center', vertical: 'middle' }, // Centrado
                    borderStyle
                );
                currentRow++;

                // B) Encabezados de la Sub-tabla
                const rowHeadDom = ws.getRow(currentRow);
                
                // Encabezados: Naranja + Texto Negro
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

                // C) Filas de Valores
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

        // 10. Descargar
        const buffer = await workbook.xlsx.writeBuffer();
        const cleanName = normalizeText(objeto.Nombre_Objeto).replace(/ /g, '_');
        saveAs(new Blob([buffer]), `Ficha_${objeto.ID_Objeto}_${cleanName}.xlsx`);
    }

    iniciarApp();
});