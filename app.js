/**
 * ERP IMPORTACIONES DISER SAS - Master Orchestrator v10.0
 * Logic: Folio-Consolidated Processing + Dual-Brain Analytics
 */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyZw6JUzorswS_RrU7fMCIlt7sxwuSFskm_FRqkjW5o4vDpCdqy1616KGL9AvLGL_8/exec';
let rawData = [];
let filteredData = [];
let activeFilters = { search: '', year: 'all', status: 'all' };
let currentView = 'operative';
let sortConfig = { key: 'folio', dir: 'desc' };
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    // Modal background close
    window.onclick = (e) => { if(e.target.id === 'folioModal') closeModal(); };
});

// --- CORE DATA ENGINE ---
async function loadData() {
    const btn = document.getElementById('refreshBtn');
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Sincronizando...'; btn.disabled = true; }

    try {
        const response = await fetch(`${SCRIPT_URL}?sync=true`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        rawData = Array.isArray(data) ? data : [];
        console.log("ERP Master v10.0 Data Loaded:", rawData.length, "Folios");
        
        applyFilters();
    } catch (err) {
        console.error("Master Sync Failure:", err);
        alert("Error de conexión con la base de datos viva.");
    } finally {
        if(btn) { btn.innerHTML = '<i class="fa-solid fa-sync"></i> Sincronizar'; btn.disabled = false; }
    }
}

// --- FILTERING & SEARCH ---
function applyFilters() {
    activeFilters.year = document.getElementById('yearFilter').value;
    
    filteredData = rawData.filter(f => {
        const matchSearch = !activeFilters.search || 
            f.folio.toString().toLowerCase().includes(activeFilters.search) ||
            f.proveedor.toLowerCase().includes(activeFilters.search) ||
            f.mercaderia.toLowerCase().includes(activeFilters.search);
        
        const matchStatus = activeFilters.status === 'all' || f.estado === activeFilters.status;
        
        const matchYear = activeFilters.year === 'all' || 
            (f.fecha_compra && f.fecha_compra.includes(activeFilters.year));

        return matchSearch && matchStatus && matchYear;
    });

    updateDashboards();
    renderMasterTable();
}

function handleGlobalSearch(val) {
    activeFilters.search = val.toLowerCase();
    applyFilters();
}

function quickFilter(status) {
    activeFilters.status = status;
    switchView('list');
    
    const tag = document.getElementById('filterTag');
    if(tag) {
        tag.innerText = `Estado: ${status}`;
        tag.style.display = 'block';
    }
    applyFilters();
}

// --- UI DASHBOARD ENGINE ---
function updateDashboards() {
    // Operative Counters
    const counts = { 'Producción': 0, 'Tránsito': 0, 'Aduana': 0, 'Depósito': 0 };
    const fobs = { 'Producción': 0, 'Tránsito': 0, 'Aduana': 0, 'Depósito': 0 };
    
    filteredData.forEach(f => {
        if(counts[f.estado] !== undefined) {
            counts[f.estado]++;
            fobs[f.estado] += f.fob;
        }
    });

    document.getElementById('count-produccion').innerText = counts['Producción'];
    document.getElementById('count-transito').innerText = counts['Tránsito'];
    document.getElementById('count-aduana').innerText = counts['Aduana'];
    document.getElementById('count-deposito').innerText = counts['Depósito'];

    document.getElementById('fob-produccion').innerText = `USD ${fobs['Producción'].toLocaleString()}`;
    document.getElementById('fob-transito').innerText = `USD ${fobs['Tránsito'].toLocaleString()}`;
    document.getElementById('fob-aduana').innerText = `USD ${fobs['Aduana'].toLocaleString()}`;
    document.getElementById('fob-deposito').innerText = `USD ${fobs['Depósito'].toLocaleString()}`;

    // Financial Totals
    let totalFob = 0, totalFobFlete = 0, leadSum = 0, leadCount = 0;
    filteredData.forEach(f => {
        totalFob += f.fob;
        totalFobFlete += f.fob_flete_usd;
        if(f.lead_time && !isNaN(f.lead_time)) { leadSum += parseFloat(f.lead_time); leadCount++; }
    });

    document.getElementById('fin-fob-total').innerText = `USD ${totalFob.toLocaleString()}`;
    document.getElementById('fin-ticket-avg').innerText = `USD ${(totalFob / (filteredData.length || 1)).toLocaleString(undefined, {maximumFractionDigits:0})}`;
    document.getElementById('fin-fob-flete').innerText = `USD ${totalFobFlete.toLocaleString()}`;
    document.getElementById('fin-lead-avg').innerText = `${(leadSum / (leadCount || 1)).toFixed(1)} Meses`;

    // Analytics Render
    renderCharts();
    renderEtaList();
}

// --- ANALYTICS ENGINE (Chart.js) ---
function renderCharts() {
    const ctxOp = document.getElementById('opStateChart')?.getContext('2d');
    if(!ctxOp) return;

    if(charts.op) charts.op.destroy();
    
    const states = ['Producción', 'Tránsito', 'Aduana', 'Depósito'];
    const stateData = states.map(s => filteredData.filter(f => f.estado === s).length);

    charts.op = new Chart(ctxOp, {
        type: 'doughnut',
        data: {
            labels: states,
            datasets: [{ data: stateData, backgroundColor: ['#3b82f6', '#f59e0b', '#ef4444', '#10b981'] }]
        },
        options: { cutout: '70%', plugins: { legend: { position: 'bottom' } } }
    });

    // Financial Charts (Conditional)
    if(currentView === 'financial') {
        renderFinancialCharts();
    }
}

function renderFinancialCharts() {
    const dataByProv = {}, dataByCat = {}, dataByABC = {}, dataByMonth = {};
    
    filteredData.forEach(f => {
        dataByProv[f.proveedor] = (dataByProv[f.proveedor] || 0) + f.fob;
        dataByCat[f.categoria] = (dataByCat[f.categoria] || 0) + f.fob;
        dataByABC[f.abc] = (dataByABC[f.abc] || 0) + f.fob;
        
        const m = f.fecha_compra ? f.fecha_compra.split('/')[1] : 'N/A';
        dataByMonth[m] = (dataByMonth[m] || 0) + f.fob;
    });

    initBarChart('chartVendors', 'Top Proveedores (FOB)', Object.keys(dataByProv).slice(0,5), Object.values(dataByProv).slice(0,5), '#3b82f6');
    initPieChart('chartCats', 'Categorías', Object.keys(dataByCat), Object.values(dataByCat));
    initPieChart('chartABC', 'Distribución ABC', Object.keys(dataByABC), Object.values(dataByABC));
    initBarChart('chartMonths', 'Compras por Mes', Object.keys(dataByMonth), Object.values(dataByMonth), '#10b981');
}

function initBarChart(id, label, labels, data, color) {
    const ctx = document.getElementById(id).getContext('2d');
    if(charts[id]) charts[id].destroy();
    charts[id] = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: label, data: data, backgroundColor: color }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
}
function initPieChart(id, label, labels, data) {
    const ctx = document.getElementById(id).getContext('2d');
    if(charts[id]) charts[id].destroy();
    charts[id] = new Chart(ctx, {
        type: 'pie',
        data: { labels: labels, datasets: [{ data: data, backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] }] },
        options: { plugins: { title: { display: true, text: label } } }
    });
}

// --- LISTS & TABLES ---
function renderEtaList() {
    const list = document.getElementById('etaList');
    if(!list) return;

    const upcoming = filteredData.filter(f => f.eta && f.estado !== 'Depósito')
                    .sort((a,b) => parseDate(a.eta) - parseDate(b.eta))
                    .slice(0, 5);

    list.innerHTML = upcoming.map(f => `
        <li>
            <div class="list-item">
                <span class="folio-tag">#${f.folio}</span>
                <span class="prov">${f.proveedor}</span>
                <span class="eta-date">${f.eta}</span>
            </div>
        </li>
    `).join('');
}

function renderMasterTable() {
    const body = document.getElementById('tableBody');
    if(!body) return;

    // Sort
    const sorted = [...filteredData].sort((a,b) => {
        let vA = a[sortConfig.key], vB = b[sortConfig.key];
        if(sortConfig.key === 'folio' || sortConfig.key === 'fob') {
            vA = parseFloat(vA); vB = parseFloat(vB);
        } else if(vA.toString().includes('/')) {
            vA = parseDate(vA); vB = parseDate(vB);
        }
        return sortConfig.dir === 'asc' ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
    });

    body.innerHTML = sorted.map(f => `
        <tr onclick="openFolio('${f.folio}')">
            <td><b>#${f.folio}</b></td>
            <td>${f.proveedor}</td>
            <td class="text-truncate">${f.mercaderia}</td>
            <td><span class="badge status-${f.estado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}">${f.estado}</span></td>
            <td>${f.fecha_compra}</td>
            <td>${f.etd}</td>
            <td>${f.eta}</td>
            <td class="text-right">USD ${f.fob.toLocaleString()}</td>
        </tr>
    `).join('');
}

// --- MODAL: FICHA DE FOLIO ---
function openFolio(folioId) {
    const f = rawData.find(x => x.folio.toString() === folioId.toString());
    if(!f) return;

    document.getElementById('modalTitle').innerText = `Folio #${f.folio}`;
    document.getElementById('modalStatus').innerText = f.estado;
    document.getElementById('modalStatus').className = `badge status-${f.estado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;

    const opContainer = document.getElementById('operativeDetails');
    opContainer.innerHTML = `
        <div class="detail-item"><label>Proveedor</label><span>${f.proveedor}</span></div>
        <div class="detail-item"><label>Mercadería</label><span>${f.mercaderia}</span></div>
        <div class="detail-item"><label>Confirmación</label><span>${f.fecha_compra}</span></div>
        <div class="detail-item"><label>ETD / ETA</label><span>${f.etd} → ${f.eta}</span></div>
        <div class="detail-item"><label>Origen / Buque</label><span>${f.origen} | ${f.buque}</span></div>
        <div class="detail-item"><label>Carga / Vol</label><span>${f.carga} | ${f.vol_m3} m3</span></div>
        <div class="detail-item"><label>Incoterm / Guía</label><span>${f.incoterm} | ${f.guia}</span></div>
    `;

    const finContainer = document.getElementById('financialDetails');
    finContainer.innerHTML = `
        <div class="detail-item"><label>FOB</label><b>USD ${f.fob.toLocaleString()}</b></div>
        <div class="detail-item"><label>Seña USD</label><span>USD ${f.sena_usd.toLocaleString()}</span></div>
        <div class="detail-item"><label>Balance USD</label><span>USD ${f.balance_usd.toLocaleString()}</span></div>
        <div class="detail-item"><label>Flete</label><span>USD ${f.flete_usd.toLocaleString()}</span></div>
        <div class="detail-item"><label>Despacho</label><span>UYU ${f.despacho_uyu.toLocaleString()}</span></div>
        <div class="detail-item highlight"><label>Costo Total Est.</label><b>USD ${f.costo_total_estimado}</b></div>
        <div class="detail-item"><label>ABC / Lead Time</label><span>${f.abc} | ${f.lead_time} meses</span></div>
    `;

    document.getElementById('folioModal').classList.add('active');
}
function closeModal() { document.getElementById('folioModal').classList.remove('active'); }

// --- UTILS ---
function switchView(view) {
    currentView = view;
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav li').forEach(l => l.classList.remove('active'));
    
    document.getElementById(`view-${view}`).classList.add('active');
    document.getElementById(`nav-${view}`).classList.add('active');
    
    if(view === 'financial') renderFinancialCharts();
    if(view === 'operative') renderCharts();
}
function parseDate(s) { 
    if(!s || s === "-") return 0;
    const p = s.split('/'); 
    return new Date(p[2], p[1]-1, p[0]).getTime(); 
}
function sortTable(key) {
    if(sortConfig.key === key) sortConfig.dir = sortConfig.dir === 'asc' ? 'desc' : 'asc';
    else { sortConfig.key = key; sortConfig.dir = 'asc'; }
    renderMasterTable();
}
