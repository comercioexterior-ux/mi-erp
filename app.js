let SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwtd6t_hQgqjR_EQAfPS8w8dvkaYKovhpJ-cyVo3G7w8KG274WtyaZIGydY7OrsMW-X/exec';
let allData = [];
let filteredData = [];
let currentFilter = 'all';
let currentView = 'operative';
let sortConfig = { key: 'folio', direction: 'desc' };
let charts = {};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupModalEvents();
});

function setupModalEvents() {
    const modal = document.getElementById('folioModal');
    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
}

// --- CORE DATA LOADING v9.0 ---
async function loadData() {
    const btn = document.getElementById('refreshDataBtn');
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Sincronizando...'; btn.disabled = true; }

    try {
        const response = await fetch(`${SCRIPT_URL}?sync=true`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        allData = Array.isArray(data) ? data : [];
        console.log("ERP v9.0 Unified Data Loaded:", allData.length);
        
        updateOperativeDashboard();
        updateFinancialDashboard();
        applyCurrentState();
    } catch (err) {
        console.error("Master Sync Failed:", err);
    } finally {
        if(btn) { btn.innerHTML = '<i class="fa-solid fa-sync"></i> Actualizar'; btn.disabled = false; }
    }
}

// --- VIEW MANAGEMENT ---
function switchView(viewName) {
    currentView = viewName;
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
    
    document.getElementById(`view-${viewName}`)?.classList.add('active');
    document.getElementById(`nav-${viewName}`)?.classList.add('active');

    if (viewName === 'financial') renderFinancialCharts();
}

// --- OPERATIVE DASHBOARD v9.0 ---
function updateOperativeDashboard() {
    const stats = { 'Producción': { c: 0, v: 0 }, 'Tránsito': { c: 0, v: 0 }, 'Aduana': { c: 0, v: 0 }, 'Depósito': { c: 0, v: 0 } };
    
    allData.forEach(f => {
        if (stats[f.estado]) {
            stats[f.estado].c++;
            stats[f.estado].v += parseFloat(f.fob.toString().replace(/[^0-9.]/g, '')) || 0;
        }
    });

    Object.keys(stats).forEach(k => {
        const id = k.toLowerCase().replace('ó', 'o');
        if(document.getElementById(`count-${id}`)) document.getElementById(`count-${id}`).innerText = stats[k].c;
        if(document.getElementById(`val-${id}`)) document.getElementById(`val-${id}`).innerText = `FOB USD ${stats[k].v.toLocaleString('es-AR', {maximumFractionDigits:0})}`;
    });

    // ETA List (Próximos Arribos)
    const etaList = allData.filter(f => f.eta && f.estado !== 'Depósito')
                    .sort((a,b) => parseDate(a.eta) - parseDate(b.eta))
                    .slice(0, 5);
    
    const container = document.getElementById('etaListContainer');
    if(container) {
        container.innerHTML = etaList.map(f => `
            <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                <div><b style="color:var(--primary)">#${f.folio}</b> <span style="font-size:0.8rem; margin-left:8px;">${f.proveedor}</span></div>
                <div style="font-size:0.85rem; font-weight:600;">${f.eta}</div>
            </div>
        `).join('');
    }

    renderOperativePie();
}

function renderOperativePie() {
    const ctx = document.getElementById('operativePieChart')?.getContext('2d');
    if(!ctx) return;
    const mix = { 'Producción': 0, 'Tránsito': 0, 'Aduana': 0, 'Depósito': 0, 'Cotización': 0 };
    allData.forEach(f => mix[f.estado]++);

    if(charts.opPie) charts.opPie.destroy();
    charts.opPie = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(mix),
            datasets: [{ data: Object.values(mix), backgroundColor: ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#94a3b8'] }]
        },
        options: { cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12 } } } }
    });
}

// --- FINANCIAL DASHBOARD v9.0 ---
function updateFinancialDashboard() {
    let totalFob = 0;
    let totalFobFlete = 0;
    let leadSum = 0;
    let leadCount = 0;

    allData.forEach(f => {
        const fob = parseFloat(f.fob.toString().replace(/[^0-9.]/g, '')) || 0;
        const ff = parseFloat(f.fob_flete_usd.toString().replace(/[^0-9.]/g, '')) || 0;
        const lead = parseFloat(f.lead_time);

        totalFob += fob;
        totalFobFlete += ff;
        if(!isNaN(lead)) { leadSum += lead; leadCount++; }
    });

    if(document.getElementById('fin-fob-total')) document.getElementById('fin-fob-total').innerText = `USD ${totalFob.toLocaleString('es-AR', {maximumFractionDigits:0})}`;
    if(document.getElementById('fin-fob-flete')) document.getElementById('fin-fob-flete').innerText = `USD ${totalFobFlete.toLocaleString('es-AR', {maximumFractionDigits:0})}`;
    if(document.getElementById('fin-ticket-avg')) document.getElementById('fin-ticket-avg').innerText = `USD ${(totalFob/allData.length || 0).toLocaleString('es-AR', {maximumFractionDigits:0})}`;
    if(document.getElementById('fin-lead-avg')) document.getElementById('fin-lead-avg').innerText = `${(leadSum/leadCount || 0).toFixed(1)} Meses`;
}

function renderFinancialCharts() {
    const dataByMonth = {}, dataByYear = {}, dataByVendor = {}, dataByCat = {}, dataByState = {}, dataByABC = {};

    allData.forEach(f => {
        const fob = parseFloat(f.fob.replace(/[^0-9.]/g, '')) || 0;
        const dateParts = f.fecha_compra.split('/');
        const month = dateParts[1] ? `${dateParts[1]}/${dateParts[2]}` : 'N/A';
        const year = dateParts[2] || 'N/A';

        dataByMonth[month] = (dataByMonth[month] || 0) + fob;
        dataByYear[year] = (dataByYear[year] || 0) + fob;
        dataByVendor[f.proveedor] = (dataByVendor[f.proveedor] || 0) + fob;
        dataByCat[f.categoria] = (dataByCat[f.categoria] || 0) + fob;
        dataByState[f.estado] = (dataByState[f.estado] || 0) + fob;
        dataByABC[f.abc] = (dataByABC[f.abc] || 0) + fob;
    });

    // Chart: Months
    initChart('finChartMonths', 'bar', Object.keys(dataByMonth), Object.values(dataByMonth), '#3b82f6');
    // Chart: Years
    initChart('finChartYears', 'bar', Object.keys(dataByYear), Object.values(dataByYear), '#10b981');
    // Chart: Vendors (Top 5)
    const topVendors = Object.entries(dataByVendor).sort((a,b) => b[1]-a[1]).slice(0, 5);
    initChart('finChartVendors', 'bar', topVendors.map(v => v[0]), topVendors.map(v => v[1]), '#f59e0b');
    // Chart: Categories
    initChart('finChartCats', 'pie', Object.keys(dataByCat), Object.values(dataByCat), ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']);
    // Chart: States
    initChart('finChartStates', 'doughnut', Object.keys(dataByState), Object.values(dataByState), ['#3b82f6', '#f59e0b', '#ef4444', '#10b981']);
    // Chart: ABC
    initChart('finChartABC', 'pie', Object.keys(dataByABC), Object.values(dataByABC), ['#ef4444', '#f59e0b', '#10b981']);
}

function initChart(id, type, labels, data, colors) {
    const ctx = document.getElementById(id)?.getContext('2d');
    if(!ctx) return;
    if(charts[id]) charts[id].destroy();
    charts[id] = new Chart(ctx, {
        type: type,
        data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderRadius: type === 'bar' ? 4 : 0 }] },
        options: { responsive: true, plugins: { legend: { display: type !== 'bar', position: 'bottom', labels: { color: '#94a3b8', boxWidth: 10, font: { size: 10 } } } }, scales: type === 'bar' ? { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } } } : {} }
    });
}

// --- FILTERS & LIST VIEW v9.0 ---
function quickFilterStatus(status) {
    currentFilter = status;
    switchView('list');
    applyCurrentState();
}

function applyCurrentState(searchTerm = "") {
    const search = searchTerm || document.getElementById('searchInput')?.value?.toLowerCase() || "";
    
    filteredData = allData.filter(f => {
        const mStatus = currentFilter === 'all' || f.estado === currentFilter;
        const mSearch = !search || 
            f.folio.toString().toLowerCase().includes(search) || 
            f.proveedor.toLowerCase().includes(search) || 
            f.mercaderia.toLowerCase().includes(search);
        return mStatus && mSearch;
    });

    const indicator = document.getElementById('filterIndicator');
    if(indicator) {
        if(currentFilter !== 'all') { indicator.innerText = `Estado: ${currentFilter}`; indicator.style.display = 'block'; }
        else { indicator.style.display = 'none'; }
    }

    // Sort & Render
    filteredData.sort((a,b) => {
        let vA = a[sortConfig.key], vB = b[sortConfig.key];
        if(sortConfig.key === 'fob' || sortConfig.key === 'folio') {
            vA = parseFloat(vA.toString().replace(/[^0-9.]/g, '')) || 0;
            vB = parseFloat(vB.toString().replace(/[^0-9.]/g, '')) || 0;
        } else if(vA.toString().includes('/')) {
            vA = parseDate(vA); vB = parseDate(vB);
        }
        return sortConfig.direction === 'asc' ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
    });

    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('foliosTableBody');
    if(!tbody) return;
    tbody.innerHTML = filteredData.map(f => `
        <tr onclick="openFolioModal('${f.folio}')">
            <td>#${f.folio}</td>
            <td style="font-weight:600;">${f.proveedor}</td>
            <td style="font-size:0.8rem;">${f.mercaderia}</td>
            <td><span class="status-badge status-${f.estado.toLowerCase().replace('í', 'i').replace('ó', 'o')}">${f.estado}</span></td>
            <td>${f.fecha_compra}</td>
            <td>${f.etd || "-"}</td>
            <td>USD ${parseFloat(f.fob.replace(/[^0-9.]/g, '') || 0).toLocaleString()}</td>
        </tr>
    `).join('');
}

function openFolioModal(id) {
    const f = allData.find(x => x.folio.toString() === id.toString());
    if(!f) return;
    document.getElementById('modalFolioId').innerText = `Folio #${f.folio} [ABC: ${f.abc}]`;
    document.getElementById('modalStatus').innerText = f.estado;
    document.getElementById('modalStatus').className = `status-badge status-${f.estado.toLowerCase().replace('í', 'i').replace('ó', 'o')}`;
    
    document.getElementById('modalBody').innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div class="info-cell"><label>Proveedor</label><div>${f.proveedor}</div></div>
            <div class="info-cell"><label>Mercadería</label><div>${f.mercaderia}</div></div>
            <div class="info-cell"><label>Confirmación</label><div>${f.fecha_compra}</div></div>
            <div class="info-cell"><label>ETD</label><div>${f.etd || "-"}</div></div>
            <div class="info-cell"><label>ETA</label><div>${f.eta || "-"}</div></div>
            <div class="info-cell"><label>FOB</label><div style="color:var(--primary); font-weight:800;">USD ${f.fob}</div></div>
            <div class="info-cell"><label>Despacho</label><div>UYU ${f.despacho_uyu}</div></div>
            <div class="info-cell" style="background:rgba(16,185,129,0.05);"><label>Costo Est. USD</label><div style="color:var(--success); font-weight:800;">USD ${f.costo_total_estimado}</div></div>
        </div>
    `;
    document.getElementById('folioModal').classList.add('active');
}

function parseDate(s) { 
    if(!s || s === "-") return 0;
    const p = s.split('/'); 
    return new Date(p[2], p[1]-1, p[0]).getTime(); 
}

function handleGlobalSearch(v) { applyCurrentState(v); }
function sortTable(k) { 
    if(sortConfig.key === k) sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    else { sortConfig.key = k; sortConfig.direction = 'desc'; }
    applyCurrentState();
}
