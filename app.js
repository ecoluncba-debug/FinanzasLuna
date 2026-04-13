const supabaseUrl = 'https://ezwlpsbymjseacoskbyk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6d2xwc2J5bWpzZWFjb3NrYnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NTIxNzcsImV4cCI6MjA5MTUyODE3N30.4Qr8iLCBkohHxsEZbq0PRvzJLeVTxmqtcF5-c1OkhfY';
const clienteSupabase = supabase.createClient(supabaseUrl, supabaseKey);

let miGrafico = null;
let todosLosGastos = [];
let todosLosPrestamos = [];
let todasLasCategorias = [];

function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if (event) event.currentTarget.classList.add('active');
}

function mostrarToast(mensaje, tipo = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = tipo === 'success' ? `✅ ${mensaje}` : `❌ ${mensaje}`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fadeOut'); toast.addEventListener('animationend', () => toast.remove()); }, 3000);
}

function preguntarConfirmacion(mensaje) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-confirmar');
        document.getElementById('texto-confirmar').innerText = mensaje;
        modal.classList.remove('hidden');

        const btnAceptar = document.getElementById('btn-conf-aceptar');
        const btnCancelar = document.getElementById('btn-conf-cancelar');

        const limpiar = (resultado) => {
            modal.classList.add('hidden');
            btnAceptar.onclick = null; btnCancelar.onclick = null;
            resolve(resultado);
        };
        btnAceptar.onclick = () => limpiar(true);
        btnCancelar.onclick = () => limpiar(false);
    });
}

function pedirTexto(mensaje, valorInicial = '') {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-prompt');
        document.getElementById('texto-prompt').innerText = mensaje;
        const input = document.getElementById('input-prompt');
        input.value = valorInicial;
        modal.classList.remove('hidden');
        setTimeout(() => input.focus(), 100);

        const btnAceptar = document.getElementById('btn-prompt-aceptar');
        const btnCancelar = document.getElementById('btn-prompt-cancelar');

        const limpiar = (resultado) => {
            modal.classList.add('hidden');
            btnAceptar.onclick = null; btnCancelar.onclick = null;
            resolve(resultado);
        };
        
        btnAceptar.onclick = () => { if(input.value.trim()!=='') limpiar(input.value); };
        btnCancelar.onclick = () => limpiar(null);
        input.onkeypress = (e) => { if(e.key === 'Enter' && input.value.trim()!=='') limpiar(input.value); };
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha-gasto').value = hoy;
    document.getElementById('fecha-prestamo').value = hoy;
    cargarDatos();
});

async function cargarDatos() {
    const { data: gastos } = await clienteSupabase.from('gastos').select('*').order('fecha', { ascending: false });
    const { data: prestamos } = await clienteSupabase.from('prestamos').select('*').order('fecha', { ascending: false });
    const { data: categorias } = await clienteSupabase.from('categorias').select('*').order('nombre');

    todosLosGastos = gastos || [];
    todosLosPrestamos = prestamos || [];
    todasLasCategorias = categorias || [];

    actualizarResumen();
    actualizarTablaHistorial();
    actualizarFiltrosYSelects();
    renderizarTarjetasPrestamos();
    actualizarListaPersonas();
}

// --- MAGIA DE GASTOS FIJOS ---
// Esta función agarra solo los fijos más nuevos hasta el mes que estemos mirando
function obtenerFijosActivos(mesObj, anioObj) {
    let fijos = {};
    todosLosGastos.forEach(g => {
        const d = new Date(g.fecha + 'T00:00:00');
        const mesGasto = d.getMonth();
        const anioGasto = d.getFullYear();

        if (g.es_fijo && (anioGasto < anioObj || (anioGasto === anioObj && mesGasto <= mesObj))) {
            const key = `${g.categoria}-${(g.detalle || '').toLowerCase().trim()}`;
            // Pisamos el anterior si encontramos uno más nuevo
            if (!fijos[key] || new Date(g.fecha) > new Date(fijos[key].fecha)) {
                fijos[key] = g;
            }
        }
    });
    return fijos;
}

// --- GESTIÓN DE GASTOS ---
function actualizarTablaHistorial() {
    const tbody = document.getElementById('tabla-body');
    const filtroCat = document.getElementById('filtro-categoria').value;
    const filtroMes = document.getElementById('filtro-mes').value;
    tbody.innerHTML = '';

    let filtrados = [];

    if (filtroMes === 'todos') {
        filtrados = todosLosGastos; // Sin proyecciones, muestra crudo
    } else {
        const mesTarget = parseInt(filtroMes);
        const anioActual = new Date().getFullYear();
        
        const fijosVigentes = obtenerFijosActivos(mesTarget, anioActual);
        const realesDelMes = todosLosGastos.filter(g => {
            const d = new Date(g.fecha + 'T00:00:00');
            return d.getMonth() === mesTarget && d.getFullYear() === anioActual && !g.es_fijo;
        });

        filtrados = [...realesDelMes, ...Object.values(fijosVigentes)];
    }

    if (filtroCat !== 'todas') filtrados = filtrados.filter(g => g.categoria === filtroCat);
    filtrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    filtrados.forEach(g => {
        const fechaArr = g.fecha.split('-');
        const etiquetaFijo = g.es_fijo ? ' <span style="font-size:0.7rem; color:var(--primary-blue);">(Fijo)</span>' : '';
        tbody.innerHTML += `
            <tr>
                <td>${fechaArr[2]}/${fechaArr[1]}/${fechaArr[0]}</td>
                <td>${g.categoria.replace('_', ' ')} ${etiquetaFijo}</td>
                <td style="color: #64748B; font-size: 0.85rem;">${g.detalle || '-'}</td>
                <td style="font-weight:600">$${g.monto.toLocaleString('es-AR')}</td>
                <td><button class="btn-borrar" onclick="borrarRegistro('gastos', '${g.id}')" title="Borrar">×</button></td>
            </tr>
        `;
    });
}

async function borrarRegistro(tabla, id) {
    const confirmado = await preguntarConfirmacion('¿Seguro que querés borrar este registro de forma permanente?');
    if(!confirmado) return;
    
    const idNum = parseInt(id, 10);
    const { error } = await clienteSupabase.from(tabla).delete().eq('id', idNum);
    
    if (!error) {
        mostrarToast('Registro eliminado');
        cargarDatos();
    } else {
        mostrarToast('Error al eliminar', 'error');
    }
}

// --- GESTIÓN DE CATEGORÍAS ---
function actualizarFiltrosYSelects() {
    const selectGasto = document.getElementById('categoria-gasto');
    const selectFiltro = document.getElementById('filtro-categoria');
    
    selectFiltro.innerHTML = '<option value="todas">Todas</option>';
    selectGasto.innerHTML = '<option value="">Seleccionar...</option>';

    const catsEnGastos = todosLosGastos.map(g => g.categoria);
    const catsDeTabla = todasLasCategorias.map(c => c.nombre);
    const todas = [...new Set([...catsDeTabla, ...catsEnGastos])].sort();

    todas.forEach(cat => {
        if(cat === '') return;
        const nombreLindo = cat.replace('_', ' ').toUpperCase();
        selectFiltro.innerHTML += `<option value="${cat}">${nombreLindo}</option>`;
        selectGasto.innerHTML += `<option value="${cat}">${nombreLindo}</option>`;
    });
}

document.getElementById('btn-nueva-categoria').addEventListener('click', async () => {
    const nueva = await pedirTexto('Ingresá el nombre de la nueva categoría:');
    if (nueva) {
        const val = nueva.trim().toLowerCase().replace(/ /g, '_');
        await clienteSupabase.from('categorias').insert([{ nombre: val }]);
        await cargarDatos();
        document.getElementById('categoria-gasto').value = val;
        mostrarToast('¡Categoría creada y lista!');
    }
});

document.getElementById('btn-gestionar-categorias').addEventListener('click', () => {
    const contenedor = document.getElementById('lista-gestionar-categorias');
    const catsDeTabla = todasLasCategorias.map(c => c.nombre);
    
    contenedor.innerHTML = catsDeTabla.map(cat => {
        if(cat === 'otros') return ''; 
        return `
        <div class="item-cat">
            <span>${cat.replace('_', ' ')}</span>
            <div class="item-cat-acciones">
                <button onclick="editarCategoria('${cat}')" title="Editar">✏️</button>
                <button onclick="borrarCategoria('${cat}')" title="Borrar" style="color: var(--danger)">🗑️</button>
            </div>
        </div>
    `}).join('');

    document.getElementById('modal-categorias').classList.remove('hidden');
});

function cerrarModalCategorias() {
    document.getElementById('modal-categorias').classList.add('hidden');
}

async function editarCategoria(catVieja) {
    cerrarModalCategorias(); 
    const nueva = await pedirTexto(`Escribí el nuevo nombre para "${catVieja.replace('_', ' ')}":`);
    
    if (nueva) {
        const catNuevaFormateada = nueva.trim().toLowerCase().replace(/ /g, '_');
        await clienteSupabase.from('gastos').update({ categoria: catNuevaFormateada }).eq('categoria', catVieja);
        await clienteSupabase.from('categorias').update({ nombre: catNuevaFormateada }).eq('nombre', catVieja);
        mostrarToast('Categoría actualizada con éxito');
        cargarDatos();
    }
}

async function borrarCategoria(catVieja) {
    cerrarModalCategorias();
    const confirmado = await preguntarConfirmacion(`¿Seguro que querés borrar "${catVieja.replace('_', ' ')}"?\nLa plata no se pierde, pasará a "Otros".`);
    
    if(confirmado) {
        await clienteSupabase.from('gastos').update({ categoria: 'otros' }).eq('categoria', catVieja);
        await clienteSupabase.from('categorias').delete().eq('nombre', catVieja);
        mostrarToast('Categoría borrada');
        cargarDatos();
    }
}

// --- ESTADÍSTICAS DEL RESUMEN ---
function actualizarResumen() {
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth();
    const anioActual = fechaActual.getFullYear();
    const diasDelMes = new Date(anioActual, mesActual + 1, 0).getDate(); 
    
    let totalMes = 0;
    let totalFijos = 0;
    const cats = {};

    const fijosVigentes = obtenerFijosActivos(mesActual, anioActual);
    const realesDelMes = todosLosGastos.filter(g => {
        const d = new Date(g.fecha + 'T00:00:00');
        return d.getMonth() === mesActual && d.getFullYear() === anioActual && !g.es_fijo;
    });

    const gastosDelMes = [...realesDelMes, ...Object.values(fijosVigentes)];

    gastosDelMes.forEach(g => {
        totalMes += g.monto;
        cats[g.categoria] = (cats[g.categoria] || 0) + g.monto;
        if (g.es_fijo) totalFijos += g.monto;
    });

    const promedioDiario = fechaActual.getDate() > 0 ? totalMes / fechaActual.getDate() : 0;
    const proyeccionFinal = promedioDiario * diasDelMes;
    
    let catMayor = '-'; let maxGasto = 0;
    for (const [cat, monto] of Object.entries(cats)) {
        if (monto > maxGasto) { maxGasto = monto; catMayor = cat; }
    }

    document.getElementById('total-mes').innerText = `$${totalMes.toLocaleString('es-AR')}`;
    document.getElementById('total-fijo').innerText = `$${totalFijos.toLocaleString('es-AR')}`;
    document.getElementById('promedio-diario').innerText = `$${Math.round(promedioDiario).toLocaleString('es-AR')}`;
    document.getElementById('proyeccion-mes').innerText = `$${Math.round(proyeccionFinal).toLocaleString('es-AR')}`;
    document.getElementById('cat-mayor').innerText = catMayor.replace('_', ' ');

    if (miGrafico) miGrafico.destroy();
    const ctx = document.getElementById('graficoTorta');
    if(!ctx) return;
    miGrafico = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(cats).map(l => l.replace('_', ' ').toUpperCase()),
            datasets: [{ data: Object.values(cats), backgroundColor: ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F43F5E'] }]
        },
        options: { plugins: { legend: { position: 'bottom' } } }
    });
}

document.getElementById('filtro-categoria').addEventListener('change', actualizarTablaHistorial);
document.getElementById('filtro-mes').addEventListener('change', actualizarTablaHistorial);

// --- FORMULARIOS ---
document.getElementById('form-gastos').addEventListener('submit', async (e) => {
    e.preventDefault();
    const g = {
        monto: parseFloat(document.getElementById('monto-gasto').value),
        categoria: document.getElementById('categoria-gasto').value,
        detalle: document.getElementById('detalle-gasto').value,
        fecha: document.getElementById('fecha-gasto').value,
        es_fijo: document.getElementById('gasto-fijo').checked
    };
    const { error } = await clienteSupabase.from('gastos').insert([g]);
    if(error) mostrarToast('Error al guardar', 'error');
    else {
        mostrarToast('¡Gasto registrado!');
        document.getElementById('form-gastos').reset();
        document.getElementById('fecha-gasto').value = new Date().toISOString().split('T')[0];
        cargarDatos();
    }
});

document.getElementById('form-prestamos').addEventListener('submit', async (e) => {
    e.preventDefault();
    const p = {
        tipo: document.getElementById('tipo-prestamo').value,
        persona: document.getElementById('persona-prestamo').value,
        detalle: document.getElementById('detalle-prestamo-input').value,
        monto: parseFloat(document.getElementById('monto-prestamo').value),
        fecha: document.getElementById('fecha-prestamo').value
    };
    const { error } = await clienteSupabase.from('prestamos').insert([p]);
    if(error) mostrarToast('Error al guardar el préstamo', 'error');
    else {
        mostrarToast('¡Préstamo registrado!');
        document.getElementById('form-prestamos').reset();
        document.getElementById('fecha-prestamo').value = new Date().toISOString().split('T')[0];
        cargarDatos();
    }
});

function renderizarTarjetasPrestamos() {
    const contenedor = document.getElementById('contenedor-prestamos');
    contenedor.innerHTML = '';
    const personas = {};
    todosLosPrestamos.forEach(p => {
        if (!personas[p.persona]) personas[p.persona] = { movimientos: [], saldo: 0 };
        personas[p.persona].movimientos.push(p);
        personas[p.persona].saldo += (p.tipo === 'di' ? p.monto : -p.monto);
    });

    for (const [nombre, info] of Object.entries(personas)) {
        let htmlMovs = info.movimientos.map(m => {
            const fechaTxt = m.fecha.split('-').reverse().join('/');
            const tipoTxt = m.tipo === 'di' ? '↗️ Le presté' : '↙️ Me prestó';
            const detalleTxt = m.detalle ? ` - <i>${m.detalle}</i>` : '';
            return `
            <div class="movimiento-item">
                <div class="movimiento-info"><span style="font-weight:600">${tipoTxt}</span><span class="movimiento-fecha">${fechaTxt}${detalleTxt}</span></div>
                <span>$${m.monto.toLocaleString('es-AR')} <button type="button" class="btn-borrar" onclick="borrarRegistro('prestamos', '${m.id}')">×</button></span>
            </div>`
        }).join('');

        contenedor.innerHTML += `
            <div class="tarjeta-persona">
                <h4>${nombre}</h4>${htmlMovs}
                <div class="saldo-final ${info.saldo >= 0 ? 'positivo' : 'negativo'}">${info.saldo >= 0 ? 'Saldo a favor: $' : 'Saldo en contra: $'}${Math.abs(info.saldo).toLocaleString('es-AR')}</div>
            </div>`;
    }
}

function actualizarListaPersonas() {
    document.getElementById('lista-personas').innerHTML = [...new Set(todosLosPrestamos.map(p => p.persona))].map(n => `<option value="${n}">`).join('');
}
