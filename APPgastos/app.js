// 1. Inicializar Supabase
const supabaseUrl = 'https://ezwlpsbymjseacoskbyk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6d2xwc2J5bWpzZWFjb3NrYnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NTIxNzcsImV4cCI6MjA5MTUyODE3N30.4Qr8iLCBkohHxsEZbq0PRvzJLeVTxmqtcF5-c1OkhfY';

// Cambiamos el nombre a "clienteSupabase" para evitar el error de inicialización
const clienteSupabase = supabase.createClient(supabaseUrl, supabaseKey);

// Función para cambiar entre pestañas
function openTab(tabId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Sacar el estado "activo" de todos los botones
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostrar la sección elegida y marcar el botón como activo
    document.getElementById(tabId).classList.add('active');
    if (event) event.currentTarget.classList.add('active');
}

// Configurar fechas por defecto al día de hoy
document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    const fechaGasto = document.getElementById('fecha-gasto');
    const fechaPrestamo = document.getElementById('fecha-prestamo');
    
    if (fechaGasto) fechaGasto.value = hoy;
    if (fechaPrestamo) fechaPrestamo.value = hoy;
    
    // Iniciar el gráfico
    renderChart();
});  

// 2. Lógica para guardar un Gasto Real
document.getElementById('form-gastos').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const gasto = {
        monto: parseFloat(document.getElementById('monto-gasto').value),
        categoria: document.getElementById('categoria-gasto').value,
        detalle: document.getElementById('detalle-gasto').value,
        fecha: document.getElementById('fecha-gasto').value,
        es_fijo: document.getElementById('gasto-fijo').checked
    };

    // Usamos "clienteSupabase" para la inserción
    const { data, error } = await clienteSupabase
        .from('gastos')
        .insert([gasto]);

    if (error) {
        console.error('Error:', error);
        alert('Hubo un error al guardar el gasto.');
    } else {
        alert('¡Gasto guardado joya!');
        document.getElementById('form-gastos').reset();
        document.getElementById('fecha-gasto').value = new Date().toISOString().split('T')[0];
    }
});

// 3. Lógica para guardar un Préstamo Real
document.getElementById('form-prestamos').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const prestamo = {
        tipo: document.getElementById('tipo-prestamo').value,
        persona: document.getElementById('persona-prestamo').value,
        monto: parseFloat(document.getElementById('monto-prestamo').value),
        fecha: document.getElementById('fecha-prestamo').value
    };

    // Usamos "clienteSupabase" para la inserción
    const { data, error } = await clienteSupabase
        .from('prestamos')
        .insert([prestamo]);

    if (error) {
        console.error('Error:', error);
        alert('Hubo un error al guardar el préstamo.');
    } else {
        alert('¡Préstamo registrado joya!');
        document.getElementById('form-prestamos').reset();
        document.getElementById('fecha-prestamo').value = new Date().toISOString().split('T')[0];
    }
});

// Función para el gráfico de torta (Chart.js)
function renderChart() {
    const ctx = document.getElementById('graficoTorta');
    if (!ctx) return;

    new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Comida', 'Alquiler', 'Servicios', 'Otros'],
            datasets: [{
                data: [30, 40, 20, 10], // Estos datos son de ejemplo hasta que traigamos los reales
                backgroundColor: ['#2563EB', '#64748B', '#93C5FD', '#CBD5E1'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}