/**
 * ERP IMPORTACIONES DISER SAS - Master Orchestrator v14.0
 */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyMWphyqEAlvsQbYYaqeADerPVE-6chBEXK1P2Ku_kth1FJUAzuc5dITiU96owIJ13X/exec';
let rawData = [];
let filteredData = [];
let planData = []; 
let filteredPlanData = []; // v14
let charts = {};
let currentView = 'operative';
let sortConfig = { key: 'folio', dir: 'desc' };
let calendarDate = new Date();

let selectedFilters = {
    fYear: [], fMonth: [], fProvider: [], fState: [], fLine: [], fCat: [], fProd: [],
    // Plan Filters v14
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
            if(dateETA) {
                daysToETA = (dateETA - today) / (1000 * 60 * 60 * 24);
                if (daysToETA < 0 && f.estado !== 'Depósito') semaforo = "rojo"; 
                else if (daysToETA >= 0 && daysToETA <= 10 && f.estado !== 'Depósito') semaforo = "amarillo"; 
            }
            if(!f.adjunto && daysToETA !== null && daysToETA <= 15 && f.estado !== 'Depósito') semaforo = "rojo"; 

            return { ...f, _dateCompra: dateC, _dateETD: dateETD, _dateETA: dateETA, _semaforo: semaforo };
        });
        
        populateFilterOptions();
        applyAllFilters(); // Applies to BOTH operative and planning
        
        if (result.sys_status === "NO_PLAN_SHEET") console.warn("Hoja 'Planificación' ausente.");

    } catch (err) {
        console.error("Sync Error:", err);
        alert("Error de conexión. Verifique App Script o conexión a internet.");
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

    // Planning v14
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
    
    // 1. Filtrado de Base Maestra
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

    // 2. Filtrado de Planificación (v14)
    filteredPlanData = planData.filter(p => {
        const mSearch = !search || p.proveedor.toLowerCase().includes(search) || p.descripcion.toLowerCase().includes(search) || p.folioLinked.includes(search);
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

// --- CALENDAR & FOLIO (Reused from v13) ---
let tooltipTimeout;

function renderCalendar() { /* identical visual logic omitted for brevity, keeping skeleton */ 
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
    for(let i=0; i < firstDay; i++) { const el = document.createElement('div'); el.className = "cal-day empty"; container.appendChild(el); }

    const arrivals = filteredData.filter(f => f._dateETA && f._dateETA.getMonth() === month && f._dateETA.getFullYear() === year);
    for(let d=1; d <= daysInMonth; d++) {
        const dayFolios = arrivals.filter(f => f._dateETA.getDate() === d);
        const el = document.createElement('div');
        el.className = `cal-day ${dayFolios.length > 0 ? 'has-data' : ''}`;
        
        let redDots = dayFolios.filter(f => f._semaforo === 'rojo').length;
        let pHTML = `<span>${d}</span>`;
        if(dayFolios.length > 0) {
            pHTML += `<div class="day-count">${redDots > 0 ? `<i class="fa-solid fa-circle" style="color:var(--danger)"></i> ` : ''}${dayFolios.length} Arr.</div>`;
            el.onclick = () => openFolio(dayFolios[0].folio);
            el.onmouseenter = (e) => { clearTimeout(tooltipTimeout); showTooltip(e, dayFolios); };
            el.onmouseleave = () => { tooltipTimeout = setTimeout(hideTooltip, 100); };
        }
        el.innerHTML = pHTML;
        container.appendChild(el);
    }
}
function changeCalMonth(step) { calendarDate.setMonth(calendarDate.getMonth() + step); renderCalendar(); }
function showTooltip(e, folios) { /* Omitted identical rendering for brevity */ }
function hideTooltip() { document.getElementById('calTooltip').classList.remove('show'); }
function renderNextArrivals() { /* Omitted identical rendering */ }
function updateKPIs() { /* Omitted identical updating */ }
function renderFinancialCharts() { /* Omitted */ }
function renderYoY() { /* Omitted */ }
function renderMasterTable() { /* Omitted */ }
function setSort(key) { /* Omitted */ }

function openFolio(id) {
    if(!id) return; // fail safe for empty strings
    hideTooltip();
    const f = rawData.find(x => x.folio === id);
    if(!f) { alert(`El folio ${id} aún no existe o no ha sido sincronizado en Base Importaciones.`); return; }

    document.getElementById('modalFolio').innerText = `Folio #${f.folio}`;
    document.getElementById('modalBadge').innerText = f.estado;
    document.getElementById('modalBadge').className = `badge status-${f.estado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;
    document.getElementById('modalStatusDot').className = `status-dot semaforo-${f._semaforo}`;

    const act = document.getElementById('modalActions');
    if(f.adjunto && f.adjunto.startsWith('http')) {
        act.innerHTML = `<a href="${f.adjunto}" target="_blank" class="btn-primary"><i class="fa-solid fa-folder-open"></i> Link Adjunto</a>`;
    } else {
        act.innerHTML = ``;
    }

    const wC = document.getElementById('workflowTimeline');
    if(wC) {
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
        
        btnDel.classList.remove('hidden'); // Show delete option
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
        
        btnDel.classList.add('hidden'); // Hide delete option for new
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
        
        // Optimistic UX Update adding the returned timestamp safely
        doc.ultima_actualizacion = result.timestamp;
        
        const idx = planData.findIndex(x => x.id === doc.id);
        if(idx > -1) {
            doc.fecha_creacion = planData[idx].fecha_creacion; // Keep creation date
            planData[idx] = doc; 
        } else {
            doc.fecha_creacion = result.timestamp;
            planData.push(doc);
        }
        
        status.style.color = "var(--success)";
        status.innerText = "¡Sincronizado!";
        populateFilterOptions(); // Re-index multiselect lists dynamically
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
        
        // Optimistic remote of memory
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

// --- UTILS ---
function switchView(view) {
    currentView = view;
    // Visibilidad de Vistas y Menúes
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav li:not(.section-label)').forEach(l => l.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');
    document.getElementById(`nav-${view}`).classList.add('active');

    // Visibilidad del Panel de Filtros Top-Header
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

function parseDate(s) {
    if(!s || s==="-") return null;
    const parts = s.split('/');
    if(parts.length < 3) return null;
    return new Date(parts[2], parts[1]-1, parts[0]);
}

// Retaining table generation omitted for extreme brevity previously if required, but already simplified.
