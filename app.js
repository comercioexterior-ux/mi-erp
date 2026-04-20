/**
 * ERP IMPORTACIONES DISER SAS - Master Orchestrator (Data Pipeline Refactored)
 */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyLYQsV9w1XFwrpumDSMdg1PkfBcawNDgRYWvZHIqv-1BYxkvWUKAsWeMJwlpgxDgHw/exec';
let rawData = [];
let filteredData = [];
let planData = []; 
let filteredPlanData = []; 
let charts = {};
let currentView = 'operative';
let sortConfig = { key: 'folio', dir: 'desc' };
let calendarDate = new Date();

let selectedFilters = {
    fYear: [], fMonth: [], fProvider: [], fState: [], fLine: [], fCat: [], fProd: [],
    pPrio: [], pProv: [], pPed: [], pCot: [], pImp: [], pBan: [], pApr: [], pRes: []
};

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    window.onclick = (e) => { 
        if(!e.target.closest('.ms-wrapper')) {
            document.querySelectorAll('.ms-dropdown').forEach(d => d.classList.remove('active'));
        }
    };
});

async function loadData() {
    const btn = document.getElementById('refreshBtn');
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-rotate fa-spin"></i> Cargando...'; btn.disabled = true; }

    try {
        const response = await fetch(`${SCRIPT_URL}?sync=true`);
        const result = await response.json();
        
        if (result.error) throw new Error(result.error);

        const arrImp = result.importaciones || [];
        planData = result.planificacion || [];

        const today = new Date();
        today.setHours(0,0,0,0);

        rawData = arrImp.map(f => {
            const dateC = parseDate(f.fecha_compra);
            const dateETD = parseDate(f.etd);
            const dateETA = parseDate(f.eta);
            
            let semaforo = "verde";
            let daysToETA = null;
            if(dateETA && !isNaN(dateETA.getTime())) {
                daysToETA = (dateETA - today) / (1000 * 60 * 60 * 24);
                if (daysToETA < 0 && f.estado !== 'Depósito') semaforo = "rojo"; 
                else if (daysToETA >= 0 && daysToETA <= 15 && f.estado !== 'Depósito') semaforo = "amarillo"; 
            }
            if(!f.adjunto && f.estado !== 'Depósito' && f.estado !== 'Pendiente') semaforo = "rojo"; 
            if(f.prioridad && f.prioridad.includes("1.") && f.estado !== 'Depósito') semaforo = "rojo";

            // Hard validation to ensure numbers are numbers securely before charting
            return { 
                ...f, 
                _dateCompra: dateC, 
                _dateETD: dateETD, 
                _dateETA: dateETA, 
                _semaforo: semaforo,
                fob: parseFloat(f.fob) || 0,
                sena_usd: parseFloat(f.sena_usd) || 0,
                balance_usd: parseFloat(f.balance_usd) || 0,
                despacho_uyu: parseFloat(f.despacho_uyu) || 0
            };
        });
        
        // ============================================
        // LOG DE DIAGNÓSTICO (TAREA 8)
        // ============================================
        console.log(`%c[DIAGNÓSTICO DEL PIPELINE - DISER ERP]`, "color: #10b981; font-size: 14px; font-weight: bold;");
        console.log(`✅ Base Importaciones extraída (GSheets): ${result.count || arrImp.length} registros brutos.`);
        console.log(`✅ Folios válidos limpios (Frontend): ${rawData.length} procesados sin perder registros.`);
        console.log(`Status del Endpoint: ${result.sys_status}`);
        if(rawData.length > 0) {
            console.log("Muestra del Dataset Normalizado:");
            console.table(rawData.slice(0, 3)); 
        } else {
            console.warn("⚠️ ALERTA: No se leyeron folios, revisa el index del script de columnas en GSheets.");
        }
        // ============================================

        populateFilterOptions();
        applyAllFilters(); 
        
        if (result.sys_status === "NO_PLAN_SHEET") console.warn("Hoja 'Planificación' ausente.");

    } catch (err) {
        console.error("Sync Error Pipeline:", err);
        alert("Fallo Estructural. Verifique Console (F12) o su conexión / permisos del App Script.");
    } finally {
        if(btn) { btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sincronizar Base'; btn.disabled = false; }
    }
}

// --- FILTERS SYSTEM ---
function applyDispatchFilters() {
    applyAllFilters();
}

function toggleMS(id) {
    document.querySelectorAll('.ms-dropdown').forEach(d => { if(d.id !== `msd-${id}`) d.classList.remove('active') });
    document.getElementById(`msd-${id}`).classList.toggle('active');
}
function clearMS(id) {
    selectedFilters[id] = [];
    document.querySelectorAll(`#msd-${id} input`).forEach(i => i.checked = false);
    applyDispatchFilters();
}
function updateMS(id, val, isChecked) {
    if(isChecked) {
        if(!selectedFilters[id].includes(val)) selectedFilters[id].push(val);
    } else {
        selectedFilters[id] = selectedFilters[id].filter(v => v !== val);
    }
    applyDispatchFilters();
}

function populateFilterOptions() {
    // Operative
    const years = [...new Set(rawData.map(f => f.fecha_compra ? f.fecha_compra.split('/')[2] : null))].filter(Boolean).sort();
    fillMultiSelect('fYear', years.map(y => ({ val:y, text:y })));
    fillMultiSelect('fMonth', ['01','02','03','04','05','06','07','08','09','10','11','12'].map((m,i) => ({ val: m, text: new Date(2000, i).toLocaleString('es', {month:'long'}) })));
    fillMultiSelect('fProvider', [...new Set(rawData.map(f => f.proveedor))].filter(Boolean).sort().map(p => ({ val:p, text:p })));
    fillMultiSelect('fLine', [...new Set(rawData.map(f => f.linea))].filter(Boolean).sort().map(l => ({ val:l, text:l })));
    fillMultiSelect('fCat', [...new Set(rawData.map(f => f.categoria))].filter(Boolean).sort().map(c => ({ val:c, text:c })));
    fillMultiSelect('fProd', [...new Set(rawData.map(f => f.producto))].filter(Boolean).sort().map(p => ({ val:p, text:p })));
    fillMultiSelect('fState', ['Producción', 'Tránsito', 'Aduana', 'Depósito'].map(s => ({ val:s, text:s })));

    // Planning
    fillMultiSelect('pPrio', ['1. Urgente', '2. Alta', '3. Media', '4. Baja'].map(s => ({ val:s, text:s })));
    fillMultiSelect('pProv', [...new Set(planData.map(f => f.proveedor))].filter(Boolean).sort().map(p => ({ val:p, text:p })));
    fillMultiSelect('pPed', [...new Set(planData.map(f => f.pedido))].filter(Boolean).sort().map(s => ({ val:s, text:s })));
    fillMultiSelect('pCot', [...new Set(planData.map(f => f.cotizacion))].filter(Boolean).sort().map(s => ({ val:s, text:s })));
    fillMultiSelect('pImp', [...new Set(planData.map(f => f.impo))].filter(Boolean).sort().map(s => ({ val:s, text:s })));
    fillMultiSelect('pBan', [...new Set(planData.map(f => f.banco))].filter(Boolean).sort().map(s => ({ val:s, text:s })));
    fillMultiSelect('pApr', [...new Set(planData.map(f => f.aprobacion))].filter(Boolean).sort().map(s => ({ val:s, text:s })));
    fillMultiSelect('pRes', [...new Set(planData.map(f => f.responsable))].filter(Boolean).sort().map(s => ({ val:s, text:s })));

    fillSelectSimple('yoyYearA', years.reverse());
    fillSelectSimple('yoyYearB', years);
}

function fillMultiSelect(id, listObj) {
    const el = document.getElementById(`msd-${id}`);
    if(!el) return;
    el.innerHTML = `<button class="clear-filter-btn" onclick="clearMS('${id}')">Desmarcar Todos</button>`;
    listObj.forEach(item => {
        const isChecked = selectedFilters[id].includes(item.val) ? "checked" : "";
        el.innerHTML += `<label class="checkbox-row"><input type="checkbox" value="${item.val}" ${isChecked} onchange="updateMS('${id}', this.value, this.checked)"> ${item.text}</label>`;
    });
}
function fillSelectSimple(id, list) {
    const el = document.getElementById(id);
    if(el) { el.innerHTML = ''; list.forEach(val => { const opt = document.createElement('option'); opt.value = val; opt.innerText = val; el.appendChild(opt); }); }
}

function applyAllFilters() {
    const search = document.getElementById('globalSearch').value.toLowerCase();
    
    // 1. Filtrado Operativa
    filteredData = rawData.filter(f => {
        const folioStr = f.folio ? f.folio.toString().toLowerCase() : "";
        const mSearch = !search || folioStr.includes(search) || (f.proveedor||"").toLowerCase().includes(search) || (f.mercaderia||"").toLowerCase().includes(search);
        const mYear = selectedFilters.fYear.length === 0 || (f.fecha_compra && f.fecha_compra.includes('/') && selectedFilters.fYear.includes(f.fecha_compra.split('/')[2]));
        const mMonth = selectedFilters.fMonth.length === 0 || (f.fecha_compra && f.fecha_compra.includes('/') && selectedFilters.fMonth.includes(f.fecha_compra.split('/')[1]));
        const mProv = selectedFilters.fProvider.length === 0 || selectedFilters.fProvider.includes(f.proveedor);
        const mState = selectedFilters.fState.length === 0 || selectedFilters.fState.includes(f.estado);
        const mLine = selectedFilters.fLine.length === 0 || selectedFilters.fLine.includes(f.linea);
        const mCat = selectedFilters.fCat.length === 0 || selectedFilters.fCat.includes(f.categoria);
        const mProd = selectedFilters.fProd.length === 0 || selectedFilters.fProd.includes(f.producto);
        return mSearch && mYear && mMonth && mProv && mState && mLine && mCat && mProd;
    });

    // 2. Filtrado Planificación
    filteredPlanData = planData.filter(p => {
        const folioLinkedStr = p.folioLinked ? p.folioLinked.toString().toLowerCase() : "";
        const mSearch = !search || (p.proveedor||"").toLowerCase().includes(search) || (p.descripcion||"").toLowerCase().includes(search) || folioLinkedStr.includes(search);
        const mPrio = selectedFilters.pPrio.length === 0 || selectedFilters.pPrio.includes(p.prioridad);
        const mProv = selectedFilters.pProv.length === 0 || selectedFilters.pProv.includes(p.proveedor);
        const mPed = selectedFilters.pPed.length === 0 || selectedFilters.pPed.includes(p.pedido);
        const mCot = selectedFilters.pCot.length === 0 || selectedFilters.pCot.includes(p.cotizacion);
        const mImp = selectedFilters.pImp.length === 0 || selectedFilters.pImp.includes(p.impo);
        const mBan = selectedFilters.pBan.length === 0 || selectedFilters.pBan.includes(p.banco);
        const mApr = selectedFilters.pApr.length === 0 || selectedFilters.pApr.includes(p.aprobacion);
        const mRes = selectedFilters.pRes.length === 0 || selectedFilters.pRes.includes(p.responsable);
        return mSearch && mPrio && mProv && mPed && mCot && mImp && mBan && mApr && mRes;
    });

    const isFiltered = Object.values(selectedFilters).slice(0,7).some(arr => arr.length > 0) || search !== '';
    const es = document.getElementById('executiveSummary');
    if(es) { if(isFiltered) es.classList.remove('hidden'); else es.classList.add('hidden'); }

    updateUI();
}

function quickFilterStatus(status) {
    selectedFilters.fState = [status];
    fillMultiSelect('fState', ['Producción', 'Tránsito', 'Aduana', 'Depósito'].map(s => ({val:s, text:s})));
    switchView('list');
    applyAllFilters();
}

// --- UI UPDATER ---
function updateUI() {
    updateKPIs();
    renderMasterTable();
    if (currentView === 'financial') renderFinancialCharts();
    if (currentView === 'operative') { renderCalendar(); renderNextArrivals(); }
    if (currentView === 'yoy') renderYoY();
    if (currentView === 'planning') renderPlanningTable();
}

function updateKPIs() {
    const states = { 'Producción': 0, 'Tránsito': 0, 'Aduana': 0, 'Depósito': 0 };
    const fobs = { 'Producción': 0, 'Tránsito': 0, 'Aduana': 0, 'Depósito': 0 };
    let totalFob = 0, totalSena = 0, totalBal = 0;
    let countAlerts = 0, countSoon = 0, countPrio = 0;

    filteredData.forEach(f => {
        if(states[f.estado] !== undefined) { states[f.estado]++; fobs[f.estado] += f.fob; }
        totalFob += f.fob; totalSena += f.sena_usd; totalBal += f.balance_usd;
        if(f._semaforo === 'rojo') countAlerts++;
        if(f._semaforo === 'amarillo') countSoon++;
        if(f.prioridad && (f.prioridad.includes("1.") || f.prioridad.includes("2."))) countPrio++;
    });

    for(let s in states) {
        const tag = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if(document.getElementById(`count-${tag}`)) document.getElementById(`count-${tag}`).innerText = states[s];
        if(document.getElementById(`fob-${tag}`)) document.getElementById(`fob-${tag}`).innerText = `USD ${fobs[s].toLocaleString()}`;
    }

    const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).innerText = val; };
    setVal('fin-fob-total', `USD ${totalFob.toLocaleString()}`);
    setVal('fin-total-sena', `USD ${totalSena.toLocaleString()}`);
    setVal('fin-total-balance', `USD ${totalBal.toLocaleString()}`);
    setVal('fin-ticket-avg', `USD ${(totalFob / (filteredData.length || 1)).toLocaleString(undefined, {maximumFractionDigits:0})}`);

    setVal('es-count', `${filteredData.length} Folios`);
    setVal('es-fob', `USD ${totalFob.toLocaleString()}`);
    setVal('es-alert', countAlerts);
    setVal('es-soon', countSoon);
    setVal('es-prio', countPrio);
}

function renderMasterTable() {
    const body = document.getElementById('tableBody');
    if(!body) return;
    const sorted = [...filteredData].sort((a,b) => {
        let vA = a[sortConfig.key], vB = b[sortConfig.key];
        if (sortConfig.key === 'fob') { vA = parseFloat(vA); vB = parseFloat(vB); }
        else if (sortConfig.key.includes('fecha') || sortConfig.key === 'eta' || sortConfig.key === 'etd') {
            const upKey = sortConfig.key === 'fecha_compra' ? 'COMPRA' : sortConfig.key.toUpperCase();
            vA = a[`_date${upKey}`] || 0; vB = b[`_date${upKey}`] || 0;
        }
        return sortConfig.dir === 'asc' ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
    });

    body.innerHTML = sorted.map(f => `
        <tr onclick="openFolio('${f.folio}')">
            <td><div class="status-dot semaforo-${f._semaforo}"></div></td>
            <td><b>#${f.folio}</b></td>
            <td>${f.proveedor}</td>
            <td class="text-truncate">${f.mercaderia}</td>
            <td><span class="badge status-${f.estado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}">${f.estado}</span></td>
            <td><span class="prio-badge" data-val="${f.prioridad}">${f.prioridad}</span></td>
            <td>${f.fecha_compra}</td>
            <td>${f.etd}</td>
            <td>${f.eta}</td>
            <td class="text-right">USD ${f.fob.toLocaleString()}</td>
            <td onclick="event.stopPropagation()">${f.adjunto && f.adjunto.startsWith('http') ? `<a href="${f.adjunto}" target="_blank" class="btn-primary-sm btn-primary" title="Drive"><i class="fa-solid fa-link"></i></a>` : '-'}</td>
        </tr>
    `).join('');
}

function setSort(key) {
    if(sortConfig.key === key) sortConfig.dir = sortConfig.dir === 'asc' ? 'desc' : 'asc';
    else { sortConfig.key = key; sortConfig.dir = 'asc'; }
    renderMasterTable();
}

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
    ['D','L','M','X','J','V','S'].forEach(d => {
        const el = document.createElement('div'); el.className = "cal-header"; el.innerText = d; container.appendChild(el);
    });

    for(let i=0; i < firstDay; i++) {
        const el = document.createElement('div'); el.className = "cal-day empty"; container.appendChild(el);
    }

    const arrivals = filteredData.filter(f => f._dateETA && !isNaN(f._dateETA.getTime()) && f._dateETA.getMonth() === month && f._dateETA.getFullYear() === year);

    for(let d=1; d <= daysInMonth; d++) {
        const dayFolios = arrivals.filter(f => f._dateETA.getDate() === d);
        const el = document.createElement('div');
        el.className = `cal-day ${dayFolios.length > 0 ? 'has-data' : ''}`;
        
        let pHTML = `<span>${d}</span>`;
        if(dayFolios.length > 0) {
            pHTML += `<div class="cal-cards-container">`;
            dayFolios.forEach(f => {
                pHTML += `
                    <div class="cal-mini-card status-border-${f._semaforo}" onclick="openFolio('${f.folio}')" title="${f.proveedor}: ${f.mercaderia}">
                        <div class="cmc-head">
                            <b>#${f.folio}</b>
                            ${f.adjunto && f.adjunto.startsWith('http') ? `<a href="${f.adjunto}" target="_blank" onclick="event.stopPropagation()"><i class="fa-solid fa-folder-open" style="color:var(--primary)"></i></a>` : ''}
                        </div>
                        <div class="cmc-prov">${f.proveedor}</div>
                        <div class="cmc-merca">${f.mercaderia}</div>
                    </div>
                `;
            });
            pHTML += `</div>`;
        }
        el.innerHTML = pHTML;
        container.appendChild(el);
    }
}

function showTooltip(e, folios) {
    const tt = document.getElementById('calTooltip');
    tt.innerHTML = folios.map(f => `
        <div class="tt-folio">
            <div style="display:flex; justify-content:space-between;">
                <b>Folio #${f.folio}</b>
                <div class="status-dot semaforo-${f._semaforo}"></div>
            </div>
            <span>${f.proveedor} | ${f.mercaderia}</span>
            <span>ETA: ${f.eta}</span>
            ${f.adjunto && f.adjunto.startsWith('http') ? `<a href="${f.adjunto}" target="_blank" class="btn-primary btn-primary-sm mt-2"><i class="fa-solid fa-box-open"></i> Documento</a>` : ''}
            <button class="btn-primary btn-primary-sm mt-1" style="background:var(--bg-card); border:1px solid var(--border); color:var(--text-main);" onclick="openFolio('${f.folio}')">Ver Ficha</button>
        </div>
    `).join('<hr style="border:0; border-top:1px solid var(--border); margin: 12px 0;">');
    
    tt.classList.add('show');
    const rect = e.target.getBoundingClientRect();
    let leftPos = rect.left + window.scrollX;
    if (leftPos + 250 > window.innerWidth) leftPos = window.innerWidth - 270;

    tt.style.left = leftPos + 'px';
    tt.style.top = (rect.bottom + window.scrollY + 10) + 'px';

    tt.onmouseenter = () => clearTimeout(tooltipTimeout);
    tt.onmouseleave = () => hideTooltip();
}

function hideTooltip() { document.getElementById('calTooltip').classList.remove('show'); }

function changeCalMonth(step) { calendarDate.setMonth(calendarDate.getMonth() + step); renderCalendar(); }

function renderNextArrivals() {
    const container = document.getElementById('nextArrivals');
    if(!container) return;
    const now = new Date();
    const next = filteredData.filter(f => f._dateETA && !isNaN(f._dateETA.getTime()) && f._dateETA >= now && f.estado !== 'Depósito')
                .sort((a,b) => a._dateETA - b._dateETA).slice(0, 6);

    container.innerHTML = next.map(f => {
        let monthStr = "N/A"; let dayStr = "0";
        if(f.eta.includes('/')) {
            const pts = f.eta.split('/');
            dayStr = pts[0];
            monthStr = new Date(2000, pts[1]-1).toLocaleString('es', {month:'short'});
        } else if (f._dateETA && !isNaN(f._dateETA.getTime())) {
            dayStr = f._dateETA.getDate();
            monthStr = f._dateETA.toLocaleString('es', {month:'short'});
        }
        
        return `
        <div class="cta-card" onclick="openFolio('${f.folio}')">
            <div class="cta-date"><b>${dayStr}</b><span>${monthStr}</span></div>
            <div class="cta-info">
                <div style="display:flex; align-items:center; gap:6px;">
                    <div class="status-dot semaforo-${f._semaforo}"></div><b>#${f.folio}</b>
                </div>
                <p>${f.proveedor}</p>
            </div>
            <div class="cta-state badge status-${f.estado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}">${f.estado}</div>
        </div>
    `}).join('');
}

function initChart(id, type, label, labels, data, colors) {
    const ctx = document.getElementById(id);
    if(!ctx || typeof Chart === 'undefined') return;
    if(charts[id]) charts[id].destroy();
    charts[id] = new Chart(ctx.getContext('2d'), {
        type: type,
        data: { labels: labels, datasets: [{ label: label, data: data, backgroundColor: colors || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] }] },
        options: { responsive: true, plugins: { legend: { display: type !== 'bar' } } }
    });
}

function renderFinancialCharts() {
    if(filteredData.length === 0) return;

    const dataByMonth = {};
    const senaVsBalance = [0, 0];
    const dataByProv = {};
    const dataByCat = {};
    const dataByLine = {};
    const dataByState = {};

    filteredData.forEach(f => {
        if (f._dateCompra && !isNaN(f._dateCompra.getTime())) {
            const monthName = f._dateCompra.toLocaleString('es', { month: 'short' }).toUpperCase();
            dataByMonth[monthName] = (dataByMonth[monthName] || 0) + f.fob;
        }
        senaVsBalance[0] += f.sena_usd;
        senaVsBalance[1] += f.balance_usd;

        dataByProv[f.proveedor] = (dataByProv[f.proveedor] || 0) + f.fob;
        dataByCat[f.categoria] = (dataByCat[f.categoria] || 0) + f.fob;
        dataByLine[f.linea] = (dataByLine[f.linea] || 0) + f.fob;
        dataByState[f.estado] = (dataByState[f.estado] || 0) + f.fob;
    });

    initChart('chartMonthsBuy', 'bar', 'FOB por Mes de Confirmación', Object.keys(dataByMonth), Object.values(dataByMonth), '#3b82f6');
    initChart('chartSenaBalance', 'pie', 'Seña vs Balance', ['Seña USD', 'Balance USD'], senaVsBalance, ['#10b981', '#ef4444']);
    
    // Convertir a Arrays y ordenar para los Top 10
    const provArr = Object.entries(dataByProv).sort((a,b) => b[1]-a[1]).slice(0, 10);
    const catArr = Object.entries(dataByCat).sort((a,b) => b[1]-a[1]).slice(0, 10);
    const lineArr = Object.entries(dataByLine).sort((a,b) => b[1]-a[1]).slice(0, 10);

    initChart('chartVendorsFob', 'bar', 'Top 10 Proveedores (FOB USD)', provArr.map(x=>x[0]), provArr.map(x=>x[1]), '#8b5cf6');
    initChart('chartCatsFob', 'bar', 'Top 10 Categorías (FOB USD)', catArr.map(x=>x[0]), catArr.map(x=>x[1]), '#f59e0b');
    initChart('chartLineFob', 'doughnut', 'FOB por Línea', lineArr.map(x=>x[0]), lineArr.map(x=>x[1]));
    initChart('chartStateFob', 'doughnut', 'FOB por Estado Actual', Object.keys(dataByState), Object.values(dataByState));
}

function renderYoY() {
    if(rawData.length === 0) return;
    const grp = document.getElementById('yoyGroup').value;
    const yearA = parseInt(document.getElementById('yoyYearA').value);
    const yearB = parseInt(document.getElementById('yoyYearB').value);

    const dataA = {}; const dataB = {};

    rawData.forEach(f => {
        if (!f._dateCompra || isNaN(f._dateCompra.getTime())) return;
        const curY = f._dateCompra.getFullYear();
        const llave = f[grp] || 'Sin Definir';
        if (curY === yearA) dataA[llave] = (dataA[llave] || 0) + f.fob;
        if (curY === yearB) dataB[llave] = (dataB[llave] || 0) + f.fob;
    });

    const labels = [...new Set([...Object.keys(dataA), ...Object.keys(dataB)])].sort();
    const dsA = labels.map(l => dataA[l] || 0);
    const dsB = labels.map(l => dataB[l] || 0);

    const ctx = document.getElementById('chartYoY');
    if(!ctx || typeof Chart === 'undefined') return;
    if(charts['yoyChart']) charts['yoyChart'].destroy();
    
    charts['yoyChart'] = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: `FOB ${yearA}`, data: dsA, backgroundColor: '#3b82f6' },
                { label: `FOB ${yearB}`, data: dsB, backgroundColor: '#10b981' }
            ]
        },
        options: { responsive: true }
    });
}


function openFolio(id) {
    if(!id) return;
    hideTooltip();
    const f = rawData.find(x => x.folio.toString() === id.toString());
    if(!f) { alert(`El folio ${id} aún no existe en Base Importaciones.`); return; }

    document.getElementById('modalFolio').innerText = `Folio #${f.folio}`;
    document.getElementById('modalBadge').innerText = f.estado;
    document.getElementById('modalBadge').className = `badge status-${f.estado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;
    document.getElementById('modalStatusDot').className = `status-dot semaforo-${f._semaforo}`;

    const act = document.getElementById('modalActions');
    if(f.adjunto && f.adjunto.startsWith('http')) {
        act.innerHTML = `<button onclick="window.open('${f.adjunto}', '_blank')" class="btn-primary"><i class="fa-solid fa-folder-open"></i> Link Adjunto</button>`;
    } else {
        act.innerHTML = ``;
    }

    const wC = document.getElementById('workflowTimeline');
    if(wC) {
        // DETECTAR SI ESTE FOLIO TIENE UNA PLANIFICACIÓN VINCULADA PARA VER SU CHECKLIST
        const plan = planData.find(p => p.folioLinked && p.folioLinked.toString() === f.folio.toString());

        if (plan) {
            const checkIcon = (status) => status === 'Completado' || status === 'Aprobado' ? 'fa-check' : (status === 'Pendiente' ? 'fa-hourglass-start' : (status === 'Rechazado' ? 'fa-times' : 'fa-spinner fa-spin'));
            const checkClass = (status) => status === 'Completado' || status === 'Aprobado' ? 'active' : (status === 'En proceso' ? 'processing' : (status === 'Rechazado' ? 'rejected' : ''));
            
            wC.innerHTML = `
                <div class="wf-step ${checkClass(plan.pedido)}"><div class="wf-icon"><i class="fa-solid ${checkIcon(plan.pedido)}"></i></div><div class="wf-label">Pedido</div></div>
                <div class="wf-step ${checkClass(plan.cotizacion)}"><div class="wf-icon"><i class="fa-solid ${checkIcon(plan.cotizacion)}"></i></div><div class="wf-label">Cotización</div></div>
                <div class="wf-step ${checkClass(plan.impo)}"><div class="wf-icon"><i class="fa-solid ${checkIcon(plan.impo)}"></i></div><div class="wf-label">Impo</div></div>
                <div class="wf-step ${checkClass(plan.banco)}"><div class="wf-icon"><i class="fa-solid ${checkIcon(plan.banco)}"></i></div><div class="wf-label">Banco</div></div>
                <div class="wf-step ${checkClass(plan.aprobacion)}"><div class="wf-icon"><i class="fa-solid ${checkIcon(plan.aprobacion)}"></i></div><div class="wf-label">Aprobación</div></div>
            `;
            if(plan.comentarios) {
                wC.innerHTML += `<div style="width:100%; font-size:0.85rem; padding: 10px; background: rgba(59, 130, 246, 0.1); color: var(--primary-dark); border-radius: 8px; margin-top: 15px;"><i class="fa-solid fa-note-sticky"></i> <b>Nota Operativa: </b> ${plan.comentarios}</div>`;
            }
        } else {
            // Default logistic workflow
            const wf = [
                { label: 'Cotización', check: true, icon: 'fa-file-invoice' },
                { label: 'Pedido', check: f.fecha_compra !== '', icon: 'fa-cart-shopping' },
                { label: 'Producción', check: f.estado !== 'Pendiente', icon: 'fa-gears' },
                { label: 'Embarcado', check: f.estado !== 'Producción' && f.estado !== 'Pendiente', icon: 'fa-ship' },
                { label: 'Arribado', check: f.estado === 'Aduana' || f.estado === 'Depósito', icon: 'fa-anchor' },
                { label: 'Ingreso', check: f.estado === 'Depósito', icon: 'fa-warehouse' }
            ];
            
            wC.innerHTML = wf.map(w => `
                <div class="wf-step ${w.check ? 'active' : ''}">
                    <div class="wf-icon"><i class="fa-solid ${w.icon}"></i></div>
                    <div class="wf-label">${w.label}</div>
                </div>
            `).join('');
        }
    }

    document.getElementById('opDetails').innerHTML = `
        <div class="row"><span>Proveedor:</span><b>${f.proveedor}</b></div>
        <div class="row"><span>Mercadería:</span><b>${f.mercaderia}</b></div>
        <div class="row"><span>Línea:</span><b>${f.linea}</b></div>
        <div class="row"><span>Producto:</span><b>${f.producto}</b></div>
        <div class="row"><span>Confirmación:</span><b>${f.fecha_compra}</b></div>
        <div class="row"><span>ETD / ETA:</span><b style="${f._semaforo==='rojo'?'color:var(--danger)':''}">${f.etd} → ${f.eta}</b></div>
    `;

    document.getElementById('finDetails').innerHTML = `
        <div class="row"><span>FOB USD:</span><b>USD ${f.fob.toLocaleString()}</b></div>
        <div class="row"><span>Seña USD:</span><b>USD ${f.sena_usd.toLocaleString()}</b></div>
        <div class="row"><span>Balance USD:</span><b>USD ${f.balance_usd.toLocaleString()}</b></div>
        <div class="row"><span>Despacho UYU:</span><b>UYU ${f.despacho_uyu.toLocaleString()}</b></div>
    `;

    document.getElementById('folioModal').classList.add('active');
}
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// --- V14 PLANIFICACIÓN ADVANCED CORE ---
function renderPlanningTable() {
    const tbody = document.getElementById('planningBody');
    if(!tbody) return;

    if(filteredPlanData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding: 40px; color:var(--text-muted);">No hay planificaciones vigentes para estos filtros.</td></tr>`;
        return;
    }

    tbody.innerHTML = filteredPlanData.map(p => `
        <tr>
            <td><span class="prio-badge" data-val="${p.prioridad}">${p.prioridad}</span></td>
            <td><b>${p.proveedor}</b></td>
            <td class="text-truncate" style="max-width:200px;" title="${p.descripcion}">${p.descripcion}</td>
            <td><span class="planning-state" data-val="${p.pedido}">${p.pedido}</span></td>
            <td><span class="planning-state" data-val="${p.cotizacion}">${p.cotizacion}</span></td>
            <td><span class="planning-state" data-val="${p.impo}">${p.impo}</span></td>
            <td><span class="planning-state" data-val="${p.aprobacion}">${p.aprobacion}</span></td>
            <td><span class="planning-state" data-val="${p.banco}">${p.banco}</span></td>
            <td>${p.responsable}</td>
            <td>${p.folioLinked ? `<span class="folio-link" onclick="openFolio('${p.folioLinked}')">#${p.folioLinked} <i class="fa-solid fa-link"></i></span>` : '-'}</td>
            <td><button class="btn-primary-sm btn-primary" onclick="openPlanModal('${p.id}')"><i class="fa-solid fa-pen-to-square"></i> Editar</button></td>
        </tr>
    `).join('');
}

function openPlanModal(id = null) {
    document.getElementById('planSaveStatus').innerText = '';
    const btnDel = document.getElementById('btnDeletePlan');
    
    if (id) {
        const p = planData.find(x => x.id === id);
        if(!p) return;
        document.getElementById('planModalTitle').innerText = "Editar Planificación";
        document.getElementById('pf-id').value = p.id;
        document.getElementById('pf-prioridad').value = p.prioridad;
        document.getElementById('pf-proveedor').value = p.proveedor;
        document.getElementById('pf-descripcion').value = p.descripcion;
        document.getElementById('pf-pedido').value = p.pedido;
        document.getElementById('pf-cotizacion').value = p.cotizacion;
        document.getElementById('pf-impo').value = p.impo;
        document.getElementById('pf-aprobacion').value = p.aprobacion;
        document.getElementById('pf-banco').value = p.banco;
        document.getElementById('pf-comentarios').value = p.comentarios;
        document.getElementById('pf-responsable').value = p.responsable;
        document.getElementById('pf-folio').value = p.folioLinked;
        btnDel.classList.remove('hidden'); 
    } else {
        document.getElementById('planModalTitle').innerText = "Nueva Planificación";
        document.getElementById('pf-id').value = 'REQ-' + new Date().getTime(); // Unique ID
        document.getElementById('pf-prioridad').value = "4. Baja";
        document.getElementById('pf-proveedor').value = "";
        document.getElementById('pf-descripcion').value = "";
        document.querySelectorAll('.state-sel').forEach(s => s.value = 'Pendiente');
        document.getElementById('pf-comentarios').value = "";
        document.getElementById('pf-responsable').value = "";
        document.getElementById('pf-folio').value = "";
        btnDel.classList.add('hidden'); 
    }
    document.getElementById('planModal').classList.add('active');
}

async function savePlan() {
    const btn = document.getElementById('btnSavePlan');
    const status = document.getElementById('planSaveStatus');
    const doc = {
        id: document.getElementById('pf-id').value,
        prioridad: document.getElementById('pf-prioridad').value,
        proveedor: document.getElementById('pf-proveedor').value,
        descripcion: document.getElementById('pf-descripcion').value,
        pedido: document.getElementById('pf-pedido').value,
        cotizacion: document.getElementById('pf-cotizacion').value,
        impo: document.getElementById('pf-impo').value,
        aprobacion: document.getElementById('pf-aprobacion').value,
        banco: document.getElementById('pf-banco').value,
        comentarios: document.getElementById('pf-comentarios').value,
        responsable: document.getElementById('pf-responsable').value,
        folioLinked: document.getElementById('pf-folio').value
    };

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
    status.innerText = "Sincronizando con Sheet...";

    try {
        const payload = { action: 'UPDATE_PLAN', data: doc };
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if(result.error) throw new Error(result.error);
        
        doc.ultima_actualizacion = result.timestamp;
        const idx = planData.findIndex(x => x.id === doc.id);
        if(idx > -1) {
            doc.fecha_creacion = planData[idx].fecha_creacion; 
            planData[idx] = doc; 
        } else {
            doc.fecha_creacion = result.timestamp;
            planData.push(doc);
        }
        status.style.color = "var(--success)";
        status.innerText = "¡Sincronizado!";
        populateFilterOptions(); 
        applyAllFilters();
        setTimeout(() => closeModal('planModal'), 800);
    } catch(err) {
        console.error(err);
        status.style.color = "var(--danger)";
        status.innerText = "❌ Fallo remoto.";
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Guardar Cambios';
    }
}

async function deletePlan() {
    const confirmDelete = confirm("¿Estás seguro de que quieres eliminar esta planificación completamente? Esto reestructurará el Sheet en vivo.");
    if(!confirmDelete) return;

    const btn = document.getElementById('btnDeletePlan');
    const id = document.getElementById('pf-id').value;
    const status = document.getElementById('planSaveStatus');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Eliminando...';
    
    try {
        const payload = { action: 'DELETE_PLAN', data: { id: id } };
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if(result.error) throw new Error(result.error);
        
        planData = planData.filter(x => x.id !== id);
        applyAllFilters();
        closeModal('planModal');
    } catch(err) {
        console.error(err);
        status.style.color = "var(--danger)";
        status.innerText = "❌ Error al Eliminar.";
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-trash"></i> Eliminar Registro';
    }
}

// --- VIEW UTILS ---
function switchView(view) {
    currentView = view;
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav li:not(.section-label)').forEach(l => l.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');
    document.getElementById(`nav-${view}`).classList.add('active');

    const advFilt = document.getElementById('advanceFilters');
    const planFilt = document.getElementById('planFilters');
    if(advFilt && planFilt) {
        if(view === 'planning') {
            advFilt.classList.add('hidden');
            planFilt.classList.remove('hidden');
        } else {
            advFilt.classList.remove('hidden');
            planFilt.classList.add('hidden');
        }
    }
    updateUI();
}

/**
 * PARSEO DE FECHA MEGA ROBUSTO - TAREA 5
 * Soporta DD/MM/YYYY o el fallback sucio de Google Sheets "18-abr.-2026" o "18-abr-2026"
 */
function parseDate(s) {
    if(!s || s==="-") return null;
    
    // Formato Standard "DD/MM/YYYY"
    if (s.includes('/')) {
        const parts = s.split('/');
        if(parts.length === 3) return new Date(parts[2], parts[1]-1, parts[0]);
    }
    
    // Formato Caótico Exportación Textil "18-abr.-2026" 
    if (s.includes('-')) {
        const parts = s.replace(/\./g, '').split('-'); 
        if(parts.length === 3) {
            const day = parseInt(parts[0]);
            const year = parseInt(parts[2]);
            const monthsStr = {"ene":0,"feb":1,"mar":2,"abr":3,"may":4,"jun":5,"jul":6,"ago":7,"sep":8,"oct":9,"nov":10,"dic":11};
            let monNum = parts[1].toLowerCase().substring(0,3);
            if (monthsStr[monNum] !== undefined) {
               return new Date(year, monthsStr[monNum], day);
            }
        }
    }
    return null;
}
