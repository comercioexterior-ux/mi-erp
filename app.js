/**
 * ERP IMPORTACIONES DISER SAS - Master Orchestrator v12.0 (QUALITY)
 * Logic: Single-Source Processing + Advanced Multi-Select Filters + Tooltips
 */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxMWIBNBFqqaeHShktuO74AK4vm7uNPuDXxjEImNmpl2pTlV-YsAZL-uZdt-KMXUdLz/exec';
let rawData = [];
let filteredData = [];
let charts = {};
let currentView = 'operative';
let sortConfig = { key: 'folio', dir: 'desc' };
let calendarDate = new Date();

let selectedFilters = {
    fYear: [],
    fMonth: [],
    fProvider: [],
    fState: [],
    fLine: [],
    fCat: [],
    fProd: []
};

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    // Close modals and dropdowns on outside click
    window.onclick = (e) => { 
        if(e.target.id === 'folioModal') closeModal(); 
        if(!e.target.closest('.ms-wrapper')) {
            document.querySelectorAll('.ms-dropdown').forEach(d => d.classList.remove('active'));
        }
    };
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
        
        console.log("ERP v12.0 - Data Active:", rawData.length, "Folios");
        populateFilterOptions();
        applyAllFilters();
    } catch (err) {
        console.error("Sync Error:", err);
        alert("Error crítico de conexión. Verifique el script.");
    } finally {
        if(btn) { btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sincronizar Base'; btn.disabled = false; }
    }
}

// --- v12 MULTI-SELECT FILTERING SYSTEM ---
function toggleMS(id) {
    document.querySelectorAll('.ms-dropdown').forEach(d => { if(d.id !== `msd-${id}`) d.classList.remove('active') });
    document.getElementById(`msd-${id}`).classList.toggle('active');
}

function clearMS(id) {
    selectedFilters[id] = [];
    document.querySelectorAll(`#msd-${id} input`).forEach(i => i.checked = false);
    applyAllFilters();
}

function updateMS(id, val, isChecked) {
    if(isChecked) {
        if(!selectedFilters[id].includes(val)) selectedFilters[id].push(val);
    } else {
        selectedFilters[id] = selectedFilters[id].filter(v => v !== val);
    }
    applyAllFilters();
}

function populateFilterOptions() {
    const years = [...new Set(rawData.map(f => f.fecha_compra ? f.fecha_compra.split('/')[2] : null))].filter(Boolean).sort();
    const provs = [...new Set(rawData.map(f => f.proveedor))].filter(Boolean).sort();
    const lines = [...new Set(rawData.map(f => f.linea))].filter(Boolean).sort();
    const cats = [...new Set(rawData.map(f => f.categoria))].filter(Boolean).sort();
    const prods = [...new Set(rawData.map(f => f.producto))].filter(Boolean).sort();
    const states = ['Producción', 'Tránsito', 'Aduana', 'Depósito'];
    
    const months = ['01','02','03','04','05','06','07','08','09','10','11','12'].map((m,i) => {
        return { val: m, text: new Date(2000, i).toLocaleString('es', {month:'long'}) };
    });

    fillMultiSelect('fYear', years.map(y => ({ val:y, text:y })));
    fillMultiSelect('fMonth', months);
    fillMultiSelect('fProvider', provs.map(p => ({ val:p, text:p })));
    fillMultiSelect('fLine', lines.map(l => ({ val:l, text:l })));
    fillMultiSelect('fCat', cats.map(c => ({ val:c, text:c })));
    fillMultiSelect('fProd', prods.map(p => ({ val:p, text:p })));
    fillMultiSelect('fState', states.map(s => ({ val:s, text:s })));

    // YoY Years
    fillSelectSimple('yoyYearA', years.reverse());
    fillSelectSimple('yoyYearB', years);
}

function fillMultiSelect(id, listObj) {
    const el = document.getElementById(`msd-${id}`);
    if(!el) return;
    el.innerHTML = `<button class="clear-filter-btn" onclick="clearMS('${id}')">Desmarcar Todos</button>`;
    listObj.forEach(item => {
        const isChecked = selectedFilters[id].includes(item.val) ? "checked" : "";
        el.innerHTML += `
            <label class="checkbox-row">
                <input type="checkbox" value="${item.val}" ${isChecked} onchange="updateMS('${id}', this.value, this.checked)">
                ${item.text}
            </label>
        `;
    });
}

function fillSelectSimple(id, list) {
    const el = document.getElementById(id);
    if(!el) return;
    el.innerHTML = '';
    list.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val; opt.innerText = val;
        el.appendChild(opt);
    });
}

function applyAllFilters() {
    const search = document.getElementById('globalSearch').value.toLowerCase();

    filteredData = rawData.filter(f => {
        const mSearch = !search || f.folio.includes(search) || f.proveedor.toLowerCase().includes(search) || f.mercaderia.toLowerCase().includes(search);
        
        const mYear = selectedFilters.fYear.length === 0 || (f.fecha_compra && selectedFilters.fYear.includes(f.fecha_compra.split('/')[2]));
        const mMonth = selectedFilters.fMonth.length === 0 || (f.fecha_compra && selectedFilters.fMonth.includes(f.fecha_compra.split('/')[1]));
        const mProv = selectedFilters.fProvider.length === 0 || selectedFilters.fProvider.includes(f.proveedor);
        const mState = selectedFilters.fState.length === 0 || selectedFilters.fState.includes(f.estado);
        const mLine = selectedFilters.fLine.length === 0 || selectedFilters.fLine.includes(f.linea);
        const mCat = selectedFilters.fCat.length === 0 || selectedFilters.fCat.includes(f.categoria);
        const mProd = selectedFilters.fProd.length === 0 || selectedFilters.fProd.includes(f.producto);

        return mSearch && mYear && mMonth && mProv && mState && mLine && mCat && mProd;
    });

    updateUI();
}

function quickFilterStatus(status) {
    selectedFilters.fState = [status];
    fillMultiSelect('fState', ['Producción', 'Tránsito', 'Aduana', 'Depósito'].map(s => ({val:s, text:s}))); // force re-render checkboxes
    switchView('list');
    applyAllFilters();
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
        const tag = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const elCount = document.getElementById(`count-${tag}`);
        const elFob = document.getElementById(`fob-${tag}`);
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

// --- CALENDAR ENGINE v12.0 (Tooltips) ---
let tooltipTimeout;

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
            el.onclick = () => openFolio(dayFolios[0].folio); // Quick open first if clicked directly
            
            el.onmouseenter = (e) => {
                clearTimeout(tooltipTimeout);
                showTooltip(e, dayFolios);
            };
            el.onmouseleave = () => {
                tooltipTimeout = setTimeout(hideTooltip, 100);
            };
        }
        container.appendChild(el);
    }
}

function showTooltip(e, folios) {
    const tt = document.getElementById('calTooltip');
    tt.innerHTML = folios.map(f => `
        <div class="tt-folio">
            <b>Folio #${f.folio}</b>
            <span>${f.proveedor} | ${f.mercaderia}</span>
            <span>ETA: ${f.eta}</span>
            ${f.adjunto && f.adjunto.startsWith('http') ? `<a href="${f.adjunto}" target="_blank" class="btn-primary btn-primary-sm mt-2"><i class="fa-solid fa-box-open"></i> Ver Lista Productos</a>` : ''}
            <button class="btn-primary btn-primary-sm mt-1" style="background:var(--bg-card); border:1px solid var(--border); color:var(--text-main);" onclick="openFolio('${f.folio}')">Ver Ficha ERP</button>
        </div>
    `).join('<hr style="border:0; border-top:1px solid var(--border); margin: 12px 0;">');
    
    tt.classList.add('show');
    
    // Position (Adjust bounding so it doesn't overflow)
    const rect = e.target.getBoundingClientRect();
    tt.style.left = (rect.left + window.scrollX) + 'px';
    tt.style.top = (rect.bottom + window.scrollY + 10) + 'px';

    tt.onmouseenter = () => clearTimeout(tooltipTimeout);
    tt.onmouseleave = () => hideTooltip();
}

function hideTooltip() { document.getElementById('calTooltip').classList.remove('show'); }

function changeCalMonth(step) {
    calendarDate.setMonth(calendarDate.getMonth() + step);
    renderCalendar();
}

function renderNextArrivals() {
    const container = document.getElementById('nextArrivals');
    if(!container) return;
    const now = new Date();
    const next = filteredData.filter(f => f._dateETA && f._dateETA >= now && f.estado !== 'Depósito')
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

    const dataA = filteredData.filter(f => f.fecha_compra && f.fecha_compra.includes(yearA)); // Added filter awareness
    const dataB = filteredData.filter(f => f.fecha_compra && f.fecha_compra.includes(yearB)); // Added filter awareness

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
    hideTooltip();
    const f = rawData.find(x => x.folio === id);
    if(!f) return;

    document.getElementById('modalFolio').innerText = `Folio #${f.folio}`;
    document.getElementById('modalBadge').innerText = f.estado;
    document.getElementById('modalBadge').className = `badge status-${f.estado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;

    // Action buttons (Product list)
    const act = document.getElementById('modalActions');
    if(f.adjunto && f.adjunto.startsWith('http')) {
        act.innerHTML = `<a href="${f.adjunto}" target="_blank" class="btn-primary"><i class="fa-solid fa-box-open"></i> Ver Listado de Productos</a>`;
    } else {
        act.innerHTML = ``;
    }

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
