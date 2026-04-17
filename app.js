/**
 * ERP IMPORTACIONES DISER SAS - Master Orchestrator v11.0 (QUALITY)
 * Logic: Single-Source Processing + Advanced Filtering + YoY + Calendar
 */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxEEKzrLMLInz15M9eDUoufaLcL6y-UBZ3KiwvnyjB8NFYABl3MBfllj6LfR40IFd4n/exec';
let rawData = [];
let filteredData = [];
let charts = {};
let currentView = 'operative';
let sortConfig = { key: 'folio', dir: 'desc' };
let calendarDate = new Date();

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    window.onclick = (e) => { if(e.target.id === 'folioModal') closeModal(); };
});

// --- CORE DATA ENGINE ---
async function loadData() {
    const btn = document.getElementById('refreshBtn');
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-rotate fa-spin"></i> Cargando...'; btn.disabled = true; }

    try {
        const response = await fetch(`${SCRIPT_URL}?sync=true`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        rawData = data.map(f => ({
            ...f,
            _dateCompra: parseDate(f.fecha_compra),
            _dateETD: parseDate(f.etd),
            _dateETA: parseDate(f.eta)
        }));
        
        console.log("ERP v11.0 - Data Active:", rawData.length, "Folios");
        populateFilterOptions();
        applyAllFilters();
    } catch (err) {
        console.error("Sync Error:", err);
        alert("Error crítico de conexión. Verifique el script.");
    } finally {
        if(btn) { btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sincronizar Base'; btn.disabled = false; }
    }
}

// --- FILTERING SYSTEM v11 ---
function applyAllFilters() {
    const search = document.getElementById('globalSearch').value.toLowerCase();
    const year = document.getElementById('fYear').value;
    const month = document.getElementById('fMonth').value;
    const prov = document.getElementById('fProvider').value;
    const state = document.getElementById('fState').value;
    const line = document.getElementById('fLine').value;
    const cat = document.getElementById('fCat').value;
    const prod = document.getElementById('fProd').value;

    filteredData = rawData.filter(f => {
        const matchSearch = !search || f.folio.includes(search) || f.proveedor.toLowerCase().includes(search) || f.mercaderia.toLowerCase().includes(search);
        const matchYear = year === 'all' || (f.fecha_compra && f.fecha_compra.includes(year));
        const matchMonth = month === 'all' || (f.fecha_compra && f.fecha_compra.split('/')[1] === month);
        const matchProv = prov === 'all' || f.proveedor === prov;
        const matchState = state === 'all' || f.estado === state;
        const matchLine = line === 'all' || f.linea === line;
        const matchCat = cat === 'all' || f.categoria === cat;
        const matchProd = prod === 'all' || f.producto === prod;

        return matchSearch && matchYear && matchMonth && matchProv && matchState && matchLine && matchCat && matchProd;
    });

    updateUI();
}

function quickFilterStatus(status) {
    document.getElementById('fState').value = status;
    switchView('list');
    applyAllFilters();
}

// --- DYNAMIC FILTERS ---
function populateFilterOptions() {
    const years = [...new Set(rawData.map(f => f.fecha_compra ? f.fecha_compra.split('/')[2] : null))].filter(Boolean).sort();
    const provs = [...new Set(rawData.map(f => f.proveedor))].filter(Boolean).sort();
    const lines = [...new Set(rawData.map(f => f.linea))].filter(Boolean).sort();
    const cats = [...new Set(rawData.map(f => f.categoria))].filter(Boolean).sort();
    const prods = [...new Set(rawData.map(f => f.producto))].filter(Boolean).sort();
    const states = ['Producción', 'Tránsito', 'Aduana', 'Depósito'];

    fillSelect('fYear', years, "Año");
    fillSelect('fProvider', provs, "Proveedor");
    fillSelect('fLine', lines, "Línea");
    fillSelect('fCat', cats, "Categoría");
    fillSelect('fProd', prods, "Producto");
    fillSelect('fState', states, "Estado");

    // YoY Years
    fillSelect('yoyYearA', years.reverse(), null);
    fillSelect('yoyYearB', years, null);
    
    // Default Months
    const monthSelect = document.getElementById('fMonth');
    monthSelect.innerHTML = '<option value="all">Mes: Todos</option>';
    ['01','02','03','04','05','06','07','08','09','10','11','12'].forEach((m, i) => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.innerText = new Date(2000, i).toLocaleString('es', {month:'long'});
        monthSelect.appendChild(opt);
    });
}

function fillSelect(id, list, label) {
    const el = document.getElementById(id);
    if(!el) return;
    el.innerHTML = label ? `<option value="all">${label}: Todos</option>` : "";
    list.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.innerText = val;
        el.appendChild(opt);
    });
}

// --- UI UPDATER ---
function updateUI() {
    updateKPIs();
    renderMasterTable();
    if (currentView === 'financial') renderFinancialCharts();
    if (currentView === 'operative') {
        renderCalendar();
        renderNextArrivals();
    }
    if (currentView === 'yoy') renderYoY();
}

function updateKPIs() {
    const states = { 'Producción': 0, 'Tránsito': 0, 'Aduana': 0, 'Depósito': 0 };
    const fobs = { 'Producción': 0, 'Tránsito': 0, 'Aduana': 0, 'Depósito': 0 };
    let totalFob = 0, totalSena = 0, totalBal = 0;

    filteredData.forEach(f => {
        if(states[f.estado] !== undefined) {
            states[f.estado]++;
            fobs[f.estado] += f.fob;
        }
        totalFob += f.fob;
        totalSena += f.sena_usd;
        totalBal += f.balance_usd;
    });

    // Counts
    for(let s in states) {
        const elCount = document.getElementById(`count-${s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`);
        const elFob = document.getElementById(`fob-${s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`);
        if(elCount) elCount.innerText = states[s];
        if(elFob) elFob.innerText = `USD ${fobs[s].toLocaleString()}`;
    }

    // Financial KPIs
    const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).innerText = val; };
    setVal('fin-fob-total', `USD ${totalFob.toLocaleString()}`);
    setVal('fin-total-sena', `USD ${totalSena.toLocaleString()}`);
    setVal('fin-total-balance', `USD ${totalBal.toLocaleString()}`);
    setVal('fin-ticket-avg', `USD ${(totalFob / (filteredData.length || 1)).toLocaleString(undefined, {maximumFractionDigits:0})}`);
}

// --- CALENDAR ENGINE ---
function renderCalendar() {
    const container = document.getElementById('arrivalCalendar');
    if(!container) return;

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById('currentCalMonth').innerText = `${monthNames[calendarDate.getMonth()]} ${calendarDate.getFullYear()}`;

    const month = calendarDate.getMonth();
    const year = calendarDate.getFullYear();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    container.innerHTML = "";
    // Days Headers
    ['D','L','M','X','J','V','S'].forEach(d => {
        const el = document.createElement('div'); el.className = "cal-header"; el.innerText = d; container.appendChild(el);
    });

    // Blanks
    for(let i=0; i < firstDay; i++) {
        const el = document.createElement('div'); el.className = "cal-day empty"; container.appendChild(el);
    }

    // Days with Data
    const arrivals = filteredData.filter(f => f._dateETA && f._dateETA.getMonth() === month && f._dateETA.getFullYear() === year);

    for(let d=1; d <= daysInMonth; d++) {
        const dayFolios = arrivals.filter(f => f._dateETA.getDate() === d);
        const el = document.createElement('div');
        el.className = `cal-day ${dayFolios.length > 0 ? 'has-data' : ''}`;
        el.innerHTML = `<span>${d}</span>`;
        if(dayFolios.length > 0) {
            el.innerHTML += `<div class="day-count">${dayFolios.length} Arribos</div>`;
            el.onclick = () => showCalDetails(dayFolios, d);
        }
        container.appendChild(el);
    }
}

function changeCalMonth(step) {
    calendarDate.setMonth(calendarDate.getMonth() + step);
    renderCalendar();
}

function renderNextArrivals() {
    const container = document.getElementById('nextArrivals');
    if(!container) return;
    const now = new Date();
    const next = rawData.filter(f => f._dateETA && f._dateETA >= now && f.estado !== 'Depósito')
                .sort((a,b) => a._dateETA - b._dateETA)
                .slice(0, 6);

    container.innerHTML = next.map(f => `
        <div class="cta-card" onclick="openFolio('${f.folio}')">
            <div class="cta-date"><b>${f.eta.split('/')[0]}</b><span>${new Date(2000, f.eta.split('/')[1]-1).toLocaleString('es', {month:'short'})}</span></div>
            <div class="cta-info"><b>#${f.folio}</b><p>${f.proveedor}</p></div>
            <div class="cta-state badge status-${f.estado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}">${f.estado}</div>
        </div>
    `).join('');
}

// --- FINANCIAL CHARTS ---
function renderFinancialCharts() {
    const dataByMonth = {}, dataByState = {}, dataByLine = {}, dataByCat = {}, dataByProv = {};
    
    filteredData.forEach(f => {
        const m = f.fecha_compra ? f.fecha_compra.split('/')[1] : 'N/A';
        dataByMonth[m] = (dataByMonth[m] || 0) + f.fob;
        dataByState[f.estado] = (dataByState[f.estado] || 0) + f.fob;
        dataByLine[f.linea] = (dataByLine[f.linea] || 0) + f.fob;
        dataByCat[f.categoria] = (dataByCat[f.categoria] || 0) + f.fob;
        dataByProv[f.proveedor] = (dataByProv[f.proveedor] || 0) + f.fob;
    });

    initChart('chartMonthsBuy', 'bar', 'Compras por Mes (FOB)', Object.keys(dataByMonth).sort(), Object.values(dataByMonth), '#3b82f6');
    initChart('chartStateFob', 'doughnut', 'FOB por Estado', Object.keys(dataByState), Object.values(dataByState), ['#3b82f6', '#f59e0b', '#ef4444', '#10b981']);
    initChart('chartLineFob', 'bar', 'FOB por Línea', Object.keys(dataByLine).slice(0,8), Object.values(dataByLine).slice(0,8), '#8b5cf6');
    initChart('chartCatsFob', 'pie', 'FOB por Categoría', Object.keys(dataByCat).slice(0,6), Object.values(dataByCat).slice(0,6));
    initChart('chartVendorsFob', 'bar', 'Top 10 Proveedores', Object.keys(dataByProv).slice(0,10), Object.values(dataByProv).slice(0,10), '#10b981');
}

// --- YoY ENGINE ---
function renderYoY() {
    const groupKey = document.getElementById('yoyGroup').value;
    const yearA = document.getElementById('yoyYearA').value;
    const yearB = document.getElementById('yoyYearB').value;

    const dataA = rawData.filter(f => f.fecha_compra && f.fecha_compra.includes(yearA));
    const dataB = rawData.filter(f => f.fecha_compra && f.fecha_compra.includes(yearB));

    const mapA = {}, mapB = {};
    dataA.forEach(f => mapA[f[groupKey]] = (mapA[f[groupKey]] || 0) + f.fob);
    dataB.forEach(f => mapB[f[groupKey]] = (mapB[f[groupKey]] || 0) + f.fob);

    const labels = [...new Set([...Object.keys(mapA), ...Object.keys(mapB)])].slice(0, 15);
    const datasetA = labels.map(l => mapA[l] || 0);
    const datasetB = labels.map(l => mapB[l] || 0);

    const ctx = document.getElementById('chartYoY').getContext('2d');
    if(charts.yoy) charts.yoy.destroy();
    charts.yoy = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: `Año ${yearA}`, data: datasetA, backgroundColor: '#3b82f6' },
                { label: `Año ${yearB}`, data: datasetB, backgroundColor: '#10b981' }
            ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

// --- TABLES & SORTING ---
function renderMasterTable() {
    const body = document.getElementById('tableBody');
    if(!body) return;

    const sorted = [...filteredData].sort((a,b) => {
        let vA = a[sortConfig.key], vB = b[sortConfig.key];
        if (sortConfig.key === 'fob') { vA = parseFloat(vA); vB = parseFloat(vB); }
        else if (sortConfig.key.includes('fecha') || sortConfig.key === 'eta' || sortConfig.key === 'etd') {
            vA = a[`_date${sortConfig.key.toUpperCase()}`] || 0;
            vB = b[`_date${sortConfig.key.toUpperCase()}`] || 0;
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

function setSort(key) {
    if(sortConfig.key === key) sortConfig.dir = sortConfig.dir === 'asc' ? 'desc' : 'asc';
    else { sortConfig.key = key; sortConfig.dir = 'asc'; }
    renderMasterTable();
}

// --- MODAL & TABS ---
function openFolio(id) {
    const f = rawData.find(x => x.folio === id);
    if(!f) return;

    document.getElementById('modalFolio').innerText = `Folio #${f.folio}`;
    document.getElementById('modalBadge').innerText = f.estado;
    document.getElementById('modalBadge').className = `badge status-${f.estado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;

    const opCont = document.getElementById('opDetails');
    opCont.innerHTML = `
        <div class="row"><span>Proveedor:</span><b>${f.proveedor}</b></div>
        <div class="row"><span>Mercadería:</span><b>${f.mercaderia}</b></div>
        <div class="row"><span>Línea:</span><b>${f.linea}</b></div>
        <div class="row"><span>Categoría:</span><b>${f.categoria}</b></div>
        <div class="row"><span>Producto:</span><b>${f.producto}</b></div>
        <div class="row"><span>Fecha Pago:</span><b>${f.fecha_compra}</b></div>
        <div class="row"><span>ETD / ETA:</span><b>${f.etd} → ${f.eta}</b></div>
    `;

    const finCont = document.getElementById('finDetails');
    finCont.innerHTML = `
        <div class="row"><span>FOB USD:</span><b>USD ${f.fob.toLocaleString()}</b></div>
        <div class="row"><span>Seña USD:</span><b>USD ${f.sena_usd.toLocaleString()}</b></div>
        <div class="row"><span>Seña RMB:</span><b>¥ ${f.sena_rmb}</b></div>
        <div class="row"><span>Balance USD:</span><b>USD ${f.balance_usd.toLocaleString()}</b></div>
        <div class="row"><span>Balance RMB:</span><b>¥ ${f.balance_rmb}</b></div>
        <div class="row"><span>Despacho UYU:</span><b>UYU ${f.despacho_uyu.toLocaleString()}</b></div>
        <div class="row"><span>Flete USD:</span><b>USD ${f.flete_usd.toLocaleString()}</b></div>
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
    updateUI();
}

function parseDate(s) {
    if(!s || s==="-") return null;
    const parts = s.split('/');
    if(parts.length < 3) return null;
    return new Date(parts[2], parts[1]-1, parts[0]);
}

function initChart(id, type, label, labels, data, colors) {
    const ctx = document.getElementById(id).getContext('2d');
    if(charts[id]) charts[id].destroy();
    charts[id] = new Chart(ctx, {
        type: type,
        data: { labels: labels, datasets: [{ label: label, data: data, backgroundColor: colors || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] }] },
        options: { responsive: true, plugins: { legend: { display: type !== 'bar' } } }
    });
}
