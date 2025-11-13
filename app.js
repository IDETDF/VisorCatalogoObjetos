
document.addEventListener('DOMContentLoaded', () => {

    let db = {
        clases: [],
        subclases: [],
        objetos: [],
        atributos: [],
        link: [],
        dominios: []
    };

    const listaClases = document.getElementById('lista-clases');
    const listaSubclases = document.getElementById('lista-subclases');
    const listaObjetos = document.getElementById('lista-objetos');
    
    const modal = document.getElementById('modal-objeto');
    const modalCerrar = document.getElementById('modal-cerrar');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalDefinicion = document.getElementById('modal-definicion');
    const modalGeometria = document.getElementById('modal-geometria');
    const modalTbody = document.getElementById('modal-tbody-atributos');

    async function iniciarApp() {
        try {
            const [clasesRes, subclasesRes, objetosRes, atributosRes, linkRes, dominiosRes] = await Promise.all([
                fetch('datos/clases.json'),
                fetch('datos/subclases.json'),
                fetch('datos/objetos.json'),
                fetch('datos/atributos.json'),
                fetch('datos/link_objeto_atributo.json'),
                fetch('datos/dominios.json')
            ]);

            db.clases = await clasesRes.json();
            db.subclases = await subclasesRes.json();
            db.objetos = await objetosRes.json();
            db.atributos = await atributosRes.json();
            db.link = await linkRes.json();
            db.dominios = await dominiosRes.json();
            
            renderizarClases();

        } catch (error) {
            console.error("Error fatal al cargar los datos:", error);
            alert("No se pudieron cargar los datos del catálogo. Revisa la consola (F12) para más detalles.");
        }

        listaClases.addEventListener('click', manejarClicClase);
        listaSubclases.addEventListener('click', manejarClicSubclase);
        listaObjetos.addEventListener('click', manejarClicObjeto);
        
        modalCerrar.addEventListener('click', () => modal.style.display = "none");

        window.addEventListener('click', (e) => {
            if (e.target == modal) {
                modal.style.display = "none";
            }
        });
    }


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
                    <td>${atributo.Nombre_Atributo} (${atributo.ID_Atributo})</td>
                    <td>${atributo.Definicion}</td>
                    <td>${atributo.Tipo_Atributo}</td>
                    <td>${dominiosHtml}</td>
                    <td>${atributo.Observaciones || ''}</td>
                </tr>
            `;
        }

        modal.style.display = "block";
    }

    function quitarSeleccion(lista) {
        const seleccionado = lista.querySelector('li.seleccionado');
        if (seleccionado) {
            seleccionado.classList.remove('seleccionado');
        }
    }

    iniciarApp();
});