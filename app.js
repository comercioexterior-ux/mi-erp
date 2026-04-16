let SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyghWF_dAJwIsBLZl7HWqJC3BBDhmdr_ThZziCWy1Lz_8keVE5cnwZe9EgmEPmHbW2e/exec';
let allData = [];
let filteredData = [];
let currentFilter = 'all';
let sortConfig = { key: 'Folio', direction: 'desc' };
let charts = {};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupModalEvents();
});

function setupModalEvents() {
    const modal = document.getElementById('folioModal');
    const closeBtns = [document.getElementById('closeModal'), document.getElementById('closeModalBtn')];
    closeBtns.forEach(btn => { if(btn) btn.onclick = () => modal.classList.remove('active'); });
}

// --- CORE DATA LOADING v7.0 ---
async function loadData() {
    const btn = document.getElementById('refreshDataBtn');
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Sincronizando ERP...'; btn.disabled = true; }

    try {
        const response = await fetch(`${SCRIPT_URL}?sync=true`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        allData = Array.isArray(data) ? data : [];
        console.log("Reconstructed ERP Data:", allData.length, "rows");
        
        updateDashboard();
        initCharts();
        applyCurrentState();
    } catch (err) {
        console.error("ERP Sync Failed:", err);
        alert("CRÍTICO: No se pudo sincronizar con la base de datos de Google Sheets.");
    } finally {
        if(btn) { btn.innerHTML = '<i class="fa-solid fa-sync"></i> Actualizar'; btn.disabled = false; }
    }
}

// --- DASHBOARD & ANALYTICS ---
function updateDashboard() {
    const stats = { 'Producción': { c: 0, v: 0 }, 'Tránsito': { c: 0, v: 0 }, 'Aduana': { c: 0, v: 0 }, 'Depósito': { c: 0, v: 0 } };
    
    allData.forEach(f => {
        const s = f.Estado;
        const fob = parseFloat(f.FOB?.toString().replace(/[^0-9.]/g, '')) || 0;
        if (stats[s]) { stats[s].c++; stats[s].v += fob; }
    });

    Object.keys(stats).forEach(k => {
        const id = k.toLowerCase().replace('ó', 'o');
        const cEl = document.getElementById(`count-${id}`);
        const vEl = document.getElementById(`val-${id}`);
        if(cEl) cEl.innerText = stats[k].c;
        if(vEl) vEl.innerText = `USD ${stats[k].v.toLocaleString('es-AR', {minimumFractionDigits: 0})}`;
    });
}

function initCharts() {
    const ctxMain = document.getElementById('purchaseChart')?.getContext('2d');
    const ctxPie = document.getElementById('statusPieChart')?.getContext('2d');
    if (!ctxMain || !ctxPie) return;

    // 1. Bar: Compras por Año (2025 vs 2026)
    const yearData = { '2024': 0, '2025': 0, '2026': 0 };
    allData.forEach(f => {
        const year = f.Confirmacion?.split('/')[2];
        const fob = parseFloat(f.FOB?.toString().replace(/[^0-9.]/g, '')) || 0;
        if (yearData.hasOwnProperty(year)) yearData[year] += fob;
    });

    if (charts.purchase) charts.purchase.destroy();
    charts.purchase = new Chart(ctxMain, {
        type: 'bar',
        data: {
            labels: Object.keys(yearData),
            datasets: [{ label: 'FOB USD', data: Object.values(yearData), backgroundColor: '#3b82f6' }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    // 2. Pie: Estados
    const statusMix = { 'Producción': 0, 'Tránsito': 0, 'Aduana': 0, 'Depósito': 0, 'Cotización': 0 };
    allData.forEach(f => statusMix[f.Estado]++);

    if (charts.pie) charts.pie.destroy();
    charts.pie = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusMix),
            datasets: [{ data: Object.values(statusMix), backgroundColor: ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#94a3b8'] }]
        },
        options: { responsive: true, cutout: '70%', plugins: { legend: { position: 'bottom' } } }
    });
}

// --- FILTERS & SORTING ---
function filterByStatus(s) {
    currentFilter = (currentFilter === s) ? 'all' : s;
    applyCurrentState();
}

function applyCurrentState(searchTerm = "") {
    filteredData = allData.filter(f => {
        const mStatus = currentFilter === 'all' || f.Estado === currentFilter;
        const mSearch = !searchTerm || 
            f.Folio?.toLowerCase().includes(searchTerm) || 
            f.Proveedor?.toLowerCase().includes(searchTerm) || 
            f.Mercaderia?.toLowerCase().includes(searchTerm);
        return mStatus && mSearch;
    });

    // Functional Sorting
    filteredData.sort((a, b) => {
        let vA = a[sortConfig.key] || "";
        let vB = b[sortConfig.key] || "";
        
        if (sortConfig.key === 'FOB' || sortConfig.key === 'Folio') {
            vA = parseFloat(vA.toString().replace(/[^0-9.]/g, '')) || 0;
            vB = parseFloat(vB.toString().replace(/[^0-9.]/g, '')) || 0;
        } else if (vA.toString().includes('/')) {
            vA = new Date(vA.split('/').reverse().join('-'));
            vB = new Date(vB.split('/').reverse().join('-'));
        } else {
            vA = vA.toString().toLowerCase();
            vB = vB.toString().toLowerCase();
        }
        
        return sortConfig.direction === 'asc' ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
    });

    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('foliosTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    filteredData.forEach(f => {
        const tr = document.createElement('tr');
        tr.onclick = () => openFolioModal(f.Folio);
        tr.innerHTML = `
            <td>#${f.Folio}</td>
            <td>${f.Proveedor}</td>
            <td>${f.Mercaderia}</td>
            <td><span class="status-badge status-${f.Estado.toLowerCase().replace('í', 'i').replace('ó', 'o')}">${f.Estado}</span></td>
            <td>${f.Confirmacion || "-"}</td>
            <td>${f.ETA || "-"}</td>
            <td>USD ${parseFloat(f.FOB.toString().replace(/[^0-9.]/g, '') || 0).toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

function openFolioModal(id) {
    const f = allData.find(x => x.Folio.toString() === id.toString());
    if(!f) return;
    document.getElementById('modalFolioId').innerText = `Folio #${f.Folio} [${f.ABC || 'C'}]`;
    document.getElementById('modalStatus').innerText = f.Estado;
    
    document.getElementById('modalBody').innerHTML = `
        <div class="folio-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div class="info-cell"><label>Proveedor</label><div>${f.Proveedor}</div></div>
            <div class="info-cell"><label>Mercadería</label><div>${f.Mercaderia}</div></div>
            <div class="info-cell"><label>ETD</label><div>${f.ETD || "-"}</div></div>
            <div class="info-cell"><label>ETA</label><div>${f.ETA || "-"}</div></div>
            <div class="info-cell"><label>FOB</label><div style="color:#10b981; font-weight:800;">USD ${f.FOB}</div></div>
            <div class="info-cell"><label>Despacho</label><div>UYU ${f.Despacho}</div></div>
        </div>
    `;
    document.getElementById('folioModal').classList.add('active');
}
