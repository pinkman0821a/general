// ================================
// Dashboard.js (solo CPU)
// ================================

// Inicializar gráfica de CPU
const cpuChart = new Chart(document.getElementById('cpuChart'), {
    type: 'line',
    data: {labels: [],datasets: [{label: 'Uso de CPU (%)',data: [],borderColor: '#8b5cf6',tension: 0.4}]},
    options: {responsive: true,animation: true,scales: {y: { min: 0, max: 100, ticks: { color: '#ccc' } },x: { ticks: { color: '#ccc' }}}}
});

// Inicializar gráfica de Memoria
const memoryChart = new Chart(document.getElementById("memoryChart"), {
  type: "line",
  data: { labels: [], datasets: [{ label: "Memoria (GB)", data: [], borderColor: "#10b981" }] },
   options: {responsive: true,animation: true,scales: {y: { min: 0, max: 100, ticks: { color: '#ccc' } },x: { ticks: { color: '#ccc' }}}}
});

const diskChart = new Chart(document.getElementById("diskChart"), {
  type: "line",
  data: { labels: [], datasets: [{ label: "Disco (GB)", data: [], borderColor: "#f59e0b" }] },
  options: {responsive: true,animation: true,scales: {y: { min: 0.0, max: 100, ticks: { color: '#ccc' } },x: { ticks: { color: '#ccc' }}}}
});

const usersChart = new Chart(document.getElementById("usersChart"), {
  type: "line",
  data: { labels: [], datasets: [{ label: "Usuarios", data: [], borderColor: "#ef4444" }] },
  options: { responsive: true, animation: false }
});

// Función para actualizar estado del CPU
async function loadServerStatus() {
    try {
        const res = await fetch('/api/dashboard/status');
        const data = await res.json();
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });


        // Mostrar CPU en el texto
        document.getElementById('cpu_name').innerText = `${data.cpu.name}`;
        document.getElementById('cpu').innerText = `${data.cpu.usage}%`;
        // Actualizar gráfica
        cpuChart.data.labels.push(timestamp);
        cpuChart.data.datasets[0].data.push(data.cpu.usage);

        if (cpuChart.data.labels.length > 10) {
            cpuChart.data.labels.shift();
            cpuChart.data.datasets[0].data.shift();
        }
        cpuChart.update();


        // Mostrar Memoria en el texto
        document.getElementById('memory').innerText = `${data.memory.used} GB / ${data.memory.total} GB / ${data.memory.percent}%`;

        // Actualizar gráfica
        memoryChart.data.labels.push(timestamp);
        memoryChart.data.datasets[0].data.push(data.memory.percent);
        if (memoryChart.data.labels.length > 10) {
            memoryChart.data.labels.shift();
            memoryChart.data.datasets[0].data.shift();
        }
        memoryChart.update();


        // Mostrar Disco en el texto
        document.getElementById('disk').innerText = `${data.disk.used} GB / ${data.disk.total} GB / ${data.disk_active}%`;
        // Actualizar gráfica
        diskChart.data.labels.push(timestamp);
        diskChart.data.datasets[0].data.push(data.disk_active);
        if (diskChart.data.labels.length > 10) {
            diskChart.data.labels.shift();
            diskChart.data.datasets[0].data.shift();
        }
        diskChart.update();

        // Mostrar Usuarios conectados
        document.getElementById('users').innerText = data.users;
        // Actualizar gráfica
        usersChart.data.labels.push(timestamp);
        usersChart.data.datasets[0].data.push(data.users);
        if (usersChart.data.labels.length > 10) {
            usersChart.data.labels.shift();
            usersChart.data.datasets[0].data.shift();
        }
        usersChart.update();
    } catch (err) {
        console.error('Error cargando el estado del servidor:', err);
    }
}

// Actualizar cada 5 segundos
setInterval(loadServerStatus, 2000);
loadServerStatus();
