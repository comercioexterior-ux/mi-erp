/**
 * ERP IMPORTACIONES DISER SAS — Frontend Orchestrator
 * Versión 15.0 — Apps Script Web App con RBAC
 *
 * Arquitectura de comunicación:
 *   - NO usa fetch() ni SCRIPT_URL
 *   - Toda comunicación con el server usa google.script.run
 *   - Los datos financieros solo existen en memoria si el rol lo permite
 *     (el servidor los filtra antes de enviarlos)
 */

// ============================================================
// ESTADO GLOBAL
// ============================================================
let rawData          = [];
let filteredData     = [];
let planData         = [];
let filteredPlanData = [];
let charts           = {};
let currentView      = 'operative';
let sortConfig       = { key: 'folio', dir: 'desc' };
let calendarDate     = new Date();
let currentUser      = null;   // { email, nombre, rol }
let tooltipTimeout;

const ROLE_PERMS = {
  Admin:    { views: ['operative', 'financial', 'yoy', 'list', 'planning'], showFinancial: true  },
  Finanzas: { views: ['financial', 'yoy', 'list'],                          showFinancial: true  },
  Compras:  { views: ['operative', 'list', 'planning'],                     showFinancial: false },
  Deposito: { views: ['operative', 'list'],                                 showFinancial: false },
};

let selectedFilters = {
  fYear: [], fMonth: [], fProvider: [], fState: [], fLine: [], fCat: [], fProd: [],
  pPrio: [], pProv: [], pPed:  [], pCot: [], pImp: [], pBan: [], pApr: [], pRes: []
};

// ============================================================
// ARRANQUE
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  showScreen('loading');

  // google.script.run es el puente al servidor de Apps Script
  google.script.run
    .withSuccessHandler(onInitialDataLoaded)
    .withFailureHandler(onServerError)
    .getInitialData();

  window.onclick = (e) => {
    if (!e.target.closest('.ms-wrapper')) {
      document.querySelectorAll('.ms-dropdown').forEach(d => d.classList.remove('active'));
    }
  };
});

// ============================================================
// GESTIÓN DE PANTALLAS
// ============================================================
function showScreen(screen) {
  const screens = ['loading', 'authDenied', 'app'];
  screens.forEach(s => {
    const el = document.getElementById(`screen-${s}`);
    if (el) el.style.display = (s === screen) ? 'flex' : 'none';
  });
}

// ============================================================
// CALLBACKS DE INICIALIZACIÓN
// ============================================================
function onInitialDataLoaded(result) {
  if (!result || result.auth === 'error') {
    document.getElementById('denied-reason').innerText =
      result?.reason || 'Error de servidor.';
    showScreen('authDenied');
    return;
  }

  if (result.auth === 'denied') {
    document.getElementById('denied-email').innerText  = result.email  || '';
    document.getElementById('denied-reason').innerText = result.reason === 'not_authorized'
      ? 'Tu cuenta no tiene acceso a este ERP. Contactá al administrador.'
      : (result.reason || 'Acceso denegado.');
    showScreen('authDenied');
    return;
  }

  // Auth OK — configurar usuario
  currentUser = result.user;
  _renderUserInfo();
  _applyRoleUI(currentUser.rol);

  // Cargar datos
  _processIncomingData(result);
  showScreen('app');
}

function onServerError(err) {
  console.error('[SERVER ERROR]', err);
  document.getElementById('denied-reason').innerText = 'Error de comunicación con el servidor: ' + err;
  showScreen('authDenied');
}

// ============================================================
// PROCESAR DATOS DEL SERVIDOR
// ============================================================
function _processIncomingData(result) {
  const arrImp = result.importaciones || [];
  planData = result.planificacion || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  rawData = arrImp.map(f => {
    const dateC   = parseDate(f.fecha_compra);
    const dateETD = parseDate(f.etd);
    const dateETA = parseDate(f.eta);

    let semaforo = 'verde';
    if (dateETA && !isNaN(dateETA.getTime())) {
      const daysToETA = (dateETA - today) / 86400000;
      if (daysToETA < 0  && f.estado !== 'Depósito') semaforo = 'rojo';
      else if (daysToETA <= 15 && f.estado !== 'Depósito') semaforo = 'amarillo';
    }
    if (f.prioridad && f.prioridad.includes('1.') && f.estado !== 'Depósito') semaforo = 'rojo';

    return {
      ...f,
      _dateCompra: dateC,
      _dateETD:    dateETD,
      _dateETA:    dateETA,
      _semaforo:   semaforo,
      fob:          f.fob          !== null ? (parseFloat(f.fob)          || 0) : null,
      sena_usd:     f.sena_usd     !== null ? (parseFloat(f.sena_usd)     || 0) : null,
      balance_usd:  f.balance_usd  !== null ? (parseFloat(f.balance_usd)  || 0) : null,
      despacho_uyu: f.despacho_uyu !== null ? (parseFloat(f.despacho_uyu) || 0) : null,
    };
  });

  console.log(`%c[DISER ERP v15] Usuario: ${currentUser.nombre} (${currentUser.rol})`, 'color:#10b981;font-weight:bold;font-size:13px;');
  console.log(`✅ ${rawData.length} folios cargados. Datos financieros: ${currentUser.rol === 'Admin' || currentUser.rol === 'Finanzas' ? 'SÍ' : 'NO (filtrado en servidor)'}`);

  populateFilterOptions();
  applyAllFilters();
}

// ============================================================
// SINCRONIZACIÓN MANUAL (botón Sincronizar)
// ============================================================
function loadData() {
  const btn = document.getElementById('refreshBtn');
  if (btn) { btn.innerHTML = '<i class="fa-solid fa-rotate fa-spin"></i> Sincronizando...'; btn.disabled = true; }

  google.script.run
    .withSuccessHandler(result => {
      if (btn) { btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sincronizar Base'; btn.disabled = false; }
      if (result.auth === 'ok') {
        _processIncomingData(result);
      } else {
        alert('Sesión expirada o acceso revocado. Recargá la página.');
      }
    })
    .withFailureHandler(err => {
      if (btn) { btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sincronizar Base'; btn.disabled = false; }
      alert('Error al sincronizar: ' + err);
    })
    .getInitialData();
}

// ============================================================
// ROL: UI por rol
// ============================================================
function _renderUserInfo() {
  const el = document.getElementById('userInfoDisplay');
  if (!el || !currentUser) return;
  el.innerHTML = `
    <div class="user-avatar">${(currentUser.nombre || currentUser.email || '?')[0].toUpperCase()}</div>
    <div class="user-meta">
      <span class="user-name">${currentUser.nombre || currentUser.email}</span>
      <span class="user-role">${currentUser.rol}</span>
    </div>
  `;
}

function _applyRoleUI(rol) {
  const perms = ROLE_PERMS[rol] || ROLE_PERMS['Deposito'];
  const allViews = ['operative', 'financial', 'yoy', 'list', 'planning'];

  // Mostrar/ocultar ítems del sidebar
  allViews.forEach(view => {
    const navItem = document.getElementById(`nav-${view}`);
    if (!navItem) return;
    if (perms.views.includes(view)) {
      navItem.classList.remove('nav-hidden');
    } else {
      navItem.classList.add('nav-hidden');
    }
  });

  // Vista inicial según rol
  const defaultView = perms.views[0] || 'operative';
  switchView(defaultView);

  // Columnas financieras en tabla maestra
  if (!perms.showFinancial) {
    document.querySelectorAll('.col-financial').forEach(el => el.classList.add('hidden'));
  }
}

// ============================================================
// FILTROS MULTI-SELECT
// ============================================================
function applyDispatchFilters() { applyAllFilters(); }

function toggleMS(id) {
  document.querySelectorAll('.ms-dropdown').forEach(d => { if (d.id !== `msd-${id}`) d.classList.remove('active'); });
  document.getElementById(`msd-${id}`).classList.toggle('active');
}
function clearMS(id) {
  selectedFilters[id] = [];
  document.querySelectorAll(`#msd-${id} input`).forEach(i => i.checked = false);
  applyDispatchFilters();
}
function updateMS(id, val, isChecked) {
  if (isChecked) { if (!selectedFilters[id].includes(val)) selectedFilters[id].push(val); }
  else           { selectedFilters[id] = selectedFilters[id].filter(v => v !== val); }
  applyDispatchFilters();
}

function populateFilterOptions() {
  const years = [...new Set(rawData.map(f => f.fecha_compra?.split('/')[2]).filter(Boolean))].sort();
  fillMultiSelect('fYear',     years.map(y => ({ val: y, text: y })));
  fillMultiSelect('fMonth',    ['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => ({ val: m, text: new Date(2000, i).toLocaleString('es', { month: 'long' }) })));
  fillMultiSelect('fProvider', [...new Set(rawData.map(f => f.proveedor).filter(Boolean))].sort().map(p => ({ val: p, text: p })));
  fillMultiSelect('fLine',     [...new Set(rawData.map(f => f.linea).filter(Boolean))].sort().map(l => ({ val: l, text: l })));
  fillMultiSelect('fCat',      [...new Set(rawData.map(f => f.categoria).filter(Boolean))].sort().map(c => ({ val: c, text: c })));
  fillMultiSelect('fProd',     [...new Set(rawData.map(f => f.producto).filter(Boolean))].sort().map(p => ({ val: p, text: p })));
  fillMultiSelect('fState',    ['Producción','Tránsito','Aduana','Depósito'].map(s => ({ val: s, text: s })));

  fillMultiSelect('pPrio', ['1. Urgente','2. Alta','3. Media','4. Baja'].map(s => ({ val: s, text: s })));
  fillMultiSelect('pProv', [...new Set(planData.map(f => f.proveedor).filter(Boolean))].sort().map(p => ({ val: p, text: p })));
  fillMultiSelect('pPed',  [...new Set(planData.map(f => f.pedido).filter(Boolean))].sort().map(s => ({ val: s, text: s })));
  fillMultiSelect('pCot',  [...new Set(planData.map(f => f.cotizacion).filter(Boolean))].sort().map(s => ({ val: s, text: s })));
  fillMultiSelect('pImp',  [...new Set(planData.map(f => f.impo).filter(Boolean))].sort().map(s => ({ val: s, text: s })));
  fillMultiSelect('pBan',  [...new Set(planData.map(f => f.banco).filter(Boolean))].sort().map(s => ({ val: s, text: s })));
  fillMultiSelect('pApr',  [...new Set(planData.map(f => f.aprobacion).filter(Boolean))].sort().map(s => ({ val: s, text: s })));
  fillMultiSelect('pRes',  [...new Set(planData.map(f => f.responsable).filter(Boolean))].sort().map(s => ({ val: s, text: s })));

  fillSelectSimple('yoyYearA', [...years].reverse());
  fillSelectSimple('yoyYearB', years.reverse());
}

function fillMultiSelect(id, listObj) {
  const el = document.getElementById(`msd-${id}`);
  if (!el) return;
  el.innerHTML = `<button class="clear-filter-btn" onclick="clearMS('${id}')">Desmarcar Todos</button>`;
  listObj.forEach(item => {
    const checked = selectedFilters[id].includes(item.val) ? 'checked' : '';
    el.innerHTML += `<label class="checkbox-row"><input type="checkbox" value="${item.val}" ${checked} onchange="updateMS('${id}', this.value, this.checked)"> ${item.text}</label>`;
  });
}
function fillSelectSimple(id, list) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '';
  list.forEach(val => { const o = document.createElement('option'); o.value = val; o.innerText = val; el.appendChild(o); });
}

// ============================================================
// FILTRADO
// ============================================================
function applyAllFilters() {
  const search = (document.getElementById('globalSearch')?.value || '').toLowerCase();

  filteredData = rawData.filter(f => {
    const fs = f.folio?.toString().toLowerCase() || '';
    const mS = !search || fs.includes(search) || (f.proveedor || '').toLowerCase().includes(search) || (f.mercaderia || '').toLowerCase().includes(search);
    const mY = !selectedFilters.fYear.length     || selectedFilters.fYear.includes(f.fecha_compra?.split('/')[2]);
    const mM = !selectedFilters.fMonth.length    || selectedFilters.fMonth.includes(f.fecha_compra?.split('/')[1]);
    const mP = !selectedFilters.fProvider.length || selectedFilters.fProvider.includes(f.proveedor);
    const mE = !selectedFilters.fState.length    || selectedFilters.fState.includes(f.estado);
    const mL = !selectedFilters.fLine.length     || selectedFilters.fLine.includes(f.linea);
    const mC = !selectedFilters.fCat.length      || selectedFilters.fCat.includes(f.categoria);
    const mR = !selectedFilters.fProd.length     || selectedFilters.fProd.includes(f.producto);
    return mS && mY && mM && mP && mE && mL && mC && mR;
  });

  filteredPlanData = planData.filter(p => {
    const mS  = !search || (p.proveedor || '').toLowerCase().includes(search) || (p.descripcion || '').toLowerCase().includes(search) || (p.folioLinked || '').toString().toLowerCase().includes(search);
    const mPr = !selectedFilters.pPrio.length || selectedFilters.pPrio.includes(p.prioridad);
    const mPv = !selectedFilters.pProv.length || selectedFilters.pProv.includes(p.proveedor);
    const mPd = !selectedFilters.pPed.length  || selectedFilters.pPed.includes(p.pedido);
    const mCt = !selectedFilters.pCot.length  || selectedFilters.pCot.includes(p.cotizacion);
    const mIm = !selectedFilters.pImp.length  || selectedFilters.pImp.includes(p.impo);
    const mBn = !selectedFilters.pBan.length  || selectedFilters.pBan.includes(p.banco);
    const mAp = !selectedFilters.pApr.length  || selectedFilters.pApr.includes(p.aprobacion);
    const mRs = !selectedFilters.pRes.length  || selectedFilters.pRes.includes(p.responsable);
    return mS && mPr && mPv && mPd && mCt && mIm && mBn && mAp && mRs;
  });

  updateUI();
}

function quickFilterStatus(status) {
  selectedFilters.fState = [status];
  fillMultiSelect('fState', ['Producción','Tránsito','Aduana','Depósito'].map(s => ({ val: s, text: s })));
  switchView('list');
  applyAllFilters();
}

// ============================================================
// UI UPDATER
// ============================================================
function updateUI() {
  updateKPIs();
  renderMasterTable();
  if (currentView === 'financial') renderFinancialCharts();
  if (currentView === 'operative') { renderCalendar(); renderNextArrivals(); }
  if (currentView === 'yoy')       renderYoY();
  if (currentView === 'planning')  renderPlanningTable();
}

function updateKPIs() {
  const states = { 'Producción': 0, 'Tránsito': 0, 'Aduana': 0, 'Depósito': 0 };
  const fobs   = { 'Producción': 0, 'Tránsito': 0, 'Aduana': 0, 'Depósito': 0 };
  let totalFob = 0, totalSena = 0, totalBal = 0;
  let cAlerts = 0, cSoon = 0, cPrio = 0;

  filteredData.forEach(f => {
    if (states[f.estado] !== undefined) {
      states[f.estado]++;
      if (f.fob !== null) fobs[f.estado] += f.fob;
    }
    if (f.fob !== null)         totalFob  += f.fob;
    if (f.sena_usd !== null)    totalSena += f.sena_usd;
    if (f.balance_usd !== null) totalBal  += f.balance_usd;
    if (f._semaforo === 'rojo')    cAlerts++;
    if (f._semaforo === 'amarillo') cSoon++;
    if (f.prioridad?.includes('1.') || f.prioridad?.includes('2.')) cPrio++;
  });

  const $ = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  for (const s in states) {
    const tag = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    $(`count-${tag}`, states[s]);
    $(`fob-${tag}`, fobs[s] > 0 ? `USD ${fobs[s].toLocaleString()}` : '—');
  }
  $('fin-fob-total',   `USD ${totalFob.toLocaleString()}`);
  $('fin-total-sena',  `USD ${totalSena.toLocaleString()}`);
  $('fin-total-balance', `USD ${totalBal.toLocaleString()}`);
  $('fin-ticket-avg',  filteredData.length ? `USD ${(totalFob / filteredData.length).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—');
  $('es-count', `${filteredData.length} Folios`);
  $('es-fob',   `USD ${totalFob.toLocaleString()}`);
  $('es-alert', cAlerts);
  $('es-soon',  cSoon);
  $('es-prio',  cPrio);
}

// ============================================================
// BASE MAESTRA
// ============================================================
function renderMasterTable() {
  const body = document.getElementById('tableBody');
  if (!body) return;

  const showFin = currentUser && (currentUser.rol === 'Admin' || currentUser.rol === 'Finanzas');

  const sorted = [...filteredData].sort((a, b) => {
    let vA = a[sortConfig.key], vB = b[sortConfig.key];
    if (sortConfig.key === 'fob') { vA = parseFloat(vA) || 0; vB = parseFloat(vB) || 0; }
    else if (['fecha_compra','eta','etd'].includes(sortConfig.key)) {
      const k = sortConfig.key === 'fecha_compra' ? '_dateCompra' : `_date${sortConfig.key.toUpperCase()}`;
      vA = a[k] || 0; vB = b[k] || 0;
    }
    return sortConfig.dir === 'asc' ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
  });

  body.innerHTML = sorted.map(f => {
    const stateClass = f.estado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const driveCell  = f.adjunto && f.adjunto.startsWith('http')
      ? `<div class="folio-link" onclick="openDocViewer('${f.folio}','${f.adjunto}')" style="white-space:nowrap"><i class="fa-solid fa-paperclip"></i> Ver</div>`
      : '<span style="color:var(--text-muted)">—</span>';
    const fobCell = showFin && f.fob !== null ? `<td class="text-right col-financial">USD ${f.fob.toLocaleString()}</td>` : `<td class="col-financial hidden"></td>`;

    return `
      <tr onclick="openFolio('${f.folio}')">
        <td><div class="status-dot semaforo-${f._semaforo}"></div></td>
        <td><b>#${f.folio}</b></td>
        <td>${f.proveedor}</td>
        <td class="text-truncate">${f.mercaderia}</td>
        <td><span class="badge status-${stateClass}">${f.estado}</span></td>
        <td><span class="prio-badge" data-val="${f.prioridad}">${f.prioridad || '—'}</span></td>
        <td>${f.fecha_compra || '—'}</td>
        <td>${f.etd || '—'}</td>
        <td>${f.eta || '—'}</td>
        ${fobCell}
        <td onclick="event.stopPropagation()">${driveCell}</td>
      </tr>`;
  }).join('');
}

function setSort(key) {
  if (sortConfig.key === key) sortConfig.dir = sortConfig.dir === 'asc' ? 'desc' : 'asc';
  else { sortConfig.key = key; sortConfig.dir = 'asc'; }
  renderMasterTable();
}

// ============================================================
// CALENDARIO
// ============================================================
function renderCalendar() {
  const container = document.getElementById('arrivalCalendar');
  if (!container) return;

  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const month = calendarDate.getMonth(), year = calendarDate.getFullYear();
  document.getElementById('currentCalMonth').innerText = `${months[month]} ${year}`;

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  container.innerHTML = '';
  ['D','L','M','X','J','V','S'].forEach(d => {
    const el = document.createElement('div'); el.className = 'cal-header'; el.innerText = d; container.appendChild(el);
  });
  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div'); el.className = 'cal-day empty'; container.appendChild(el);
  }

  const arrivals = filteredData.filter(f => f._dateETA && !isNaN(f._dateETA.getTime()) && f._dateETA.getMonth() === month && f._dateETA.getFullYear() === year);

  for (let d = 1; d <= daysInMonth; d++) {
    const dayFolios = arrivals.filter(f => f._dateETA.getDate() === d);
    const el = document.createElement('div');
    el.className = `cal-day ${dayFolios.length ? 'has-data' : ''}`;

    let html = `<span>${d}</span>`;
    if (dayFolios.length) {
      html += `<div class="cal-cards-container">`;
      dayFolios.slice(0, 2).forEach(f => {
        const driveIcon = f.adjunto?.startsWith('http')
          ? `<div onclick="event.stopPropagation();openDocViewer('${f.folio}','${f.adjunto}')"><i class="fa-solid fa-folder-open" style="color:var(--primary);cursor:pointer" title="Ver Documento"></i></div>`
          : '';
        html += `
          <div class="cal-mini-card status-border-${f._semaforo}" onclick="openFolio('${f.folio}')">
            <div class="cmc-head"><b>#${f.folio}</b>${driveIcon}</div>
            <div class="cmc-prov">${f.proveedor}</div>
            <div class="cmc-merca">${f.mercaderia}</div>
          </div>`;
      });
      if (dayFolios.length > 2) html += `<div class="cal-more">+${dayFolios.length - 2} más</div>`;
      html += '</div>';
      el.onmouseenter = (e) => { clearTimeout(tooltipTimeout); showTooltip(e, dayFolios); };
      el.onmouseleave = () => { tooltipTimeout = setTimeout(hideTooltip, 120); };
    }
    el.innerHTML = html;
    container.appendChild(el);
  }
}

function showTooltip(e, folios) {
  const tt = document.getElementById('calTooltip');
  tt.innerHTML = folios.map(f => `
    <div class="tt-folio">
      <div style="display:flex;justify-content:space-between"><b>Folio #${f.folio}</b><div class="status-dot semaforo-${f._semaforo}"></div></div>
      <span>${f.proveedor} | ${f.mercaderia}</span>
      <span>ETA: ${f.eta}</span>
      ${f.adjunto?.startsWith('http') ? `<button onclick="openDocViewer('${f.folio}','${f.adjunto}')" class="btn-primary btn-primary-sm mt-2"><i class="fa-solid fa-box-open"></i> Ver Documento</button>` : ''}
      <button class="btn-primary btn-primary-sm mt-1" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-main)" onclick="openFolio('${f.folio}')">Ver Ficha</button>
    </div>
  `).join('<hr style="border:0;border-top:1px solid var(--border);margin:12px 0">');

  tt.classList.add('show');
  const rect = e.target.getBoundingClientRect();
  let left = rect.left + window.scrollX;
  if (left + 260 > window.innerWidth) left = window.innerWidth - 270;
  tt.style.left = `${left}px`;
  tt.style.top  = `${rect.bottom + window.scrollY + 10}px`;
  tt.onmouseenter = () => clearTimeout(tooltipTimeout);
  tt.onmouseleave = () => hideTooltip();
}
function hideTooltip() { document.getElementById('calTooltip')?.classList.remove('show'); }
function changeCalMonth(step) { calendarDate.setMonth(calendarDate.getMonth() + step); renderCalendar(); }

// ============================================================
// PRÓXIMOS ARRIBOS
// ============================================================
function renderNextArrivals() {
  const container = document.getElementById('nextArrivals');
  if (!container) return;
  const now  = new Date();
  const next = filteredData
    .filter(f => f._dateETA && !isNaN(f._dateETA.getTime()) && f._dateETA >= now && f.estado !== 'Depósito')
    .sort((a, b) => a._dateETA - b._dateETA)
    .slice(0, 6);

  container.innerHTML = next.map(f => {
    const pts = f.eta?.includes('/') ? f.eta.split('/') : [];
    const day = pts[0] || f._dateETA?.getDate() || '?';
    const mon = pts.length ? new Date(2000, pts[1] - 1).toLocaleString('es', { month: 'short' }) : '?';
    const stClass = f.estado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return `
      <div class="cta-card" onclick="openFolio('${f.folio}')">
        <div class="cta-date"><b>${day}</b><span>${mon}</span></div>
        <div class="cta-info">
          <div style="display:flex;align-items:center;gap:6px"><div class="status-dot semaforo-${f._semaforo}"></div><b>#${f.folio}</b></div>
          <p>${f.proveedor}</p>
        </div>
        <div class="cta-state badge status-${stClass}">${f.estado}</div>
      </div>`;
  }).join('');
}

// ============================================================
// GRÁFICOS FINANCIEROS
// ============================================================
function initChart(id, type, label, labels, data, colors) {
  const ctx = document.getElementById(id);
  if (!ctx || typeof Chart === 'undefined') return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx.getContext('2d'), {
    type,
    data: { labels, datasets: [{ label, data, backgroundColor: colors || ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6'] }] },
    options: { responsive: true, plugins: { legend: { display: type !== 'bar' } } }
  });
}

function renderFinancialCharts() {
  if (!filteredData.length) return;
  const byMonth = {}, sena = [0, 0], byProv = {}, byCat = {}, byLine = {}, byState = {};

  filteredData.forEach(f => {
    if (f.fob === null) return; // Usuario sin acceso financiero
    if (f._dateCompra && !isNaN(f._dateCompra.getTime())) {
      const m = f._dateCompra.toLocaleString('es', { month: 'short' }).toUpperCase();
      byMonth[m] = (byMonth[m] || 0) + f.fob;
    }
    sena[0] += f.sena_usd || 0;
    sena[1] += f.balance_usd || 0;
    byProv[f.proveedor]    = (byProv[f.proveedor]   || 0) + f.fob;
    byCat[f.categoria]     = (byCat[f.categoria]    || 0) + f.fob;
    byLine[f.linea]        = (byLine[f.linea]       || 0) + f.fob;
    byState[f.estado]      = (byState[f.estado]     || 0) + f.fob;
  });

  const top = (obj, n = 10) => Object.entries(obj).sort((a,b) => b[1]-a[1]).slice(0, n);
  const provArr = top(byProv), catArr = top(byCat), lineArr = top(byLine);

  initChart('chartMonthsBuy',  'bar',      'FOB por Mes',          Object.keys(byMonth),          Object.values(byMonth), '#3b82f6');
  initChart('chartSenaBalance','pie',      'Seña vs Balance',       ['Seña USD','Balance USD'],    sena,                   ['#10b981','#ef4444']);
  initChart('chartVendorsFob', 'bar',      'Top Proveedores (FOB)', provArr.map(x=>x[0]),          provArr.map(x=>x[1]),   '#8b5cf6');
  initChart('chartCatsFob',    'bar',      'Top Categorías (FOB)',  catArr.map(x=>x[0]),           catArr.map(x=>x[1]),    '#f59e0b');
  initChart('chartLineFob',    'doughnut', 'FOB por Línea',         lineArr.map(x=>x[0]),          lineArr.map(x=>x[1]));
  initChart('chartStateFob',   'doughnut', 'FOB por Estado',        Object.keys(byState),          Object.values(byState));
}

// ============================================================
// COMPARATIVA YoY
// ============================================================
function renderYoY() {
  if (!rawData.length) return;
  const grp  = document.getElementById('yoyGroup')?.value || 'categoria';
  const yA   = parseInt(document.getElementById('yoyYearA')?.value);
  const yB   = parseInt(document.getElementById('yoyYearB')?.value);
  const dA   = {}, dB = {};

  rawData.forEach(f => {
    if (!f._dateCompra || isNaN(f._dateCompra.getTime()) || f.fob === null) return;
    const y = f._dateCompra.getFullYear();
    const k = f[grp] || 'Sin Definir';
    if (y === yA) dA[k] = (dA[k] || 0) + f.fob;
    if (y === yB) dB[k] = (dB[k] || 0) + f.fob;
  });

  const labels = [...new Set([...Object.keys(dA), ...Object.keys(dB)])].sort();
  const ctx = document.getElementById('chartYoY');
  if (!ctx || typeof Chart === 'undefined') return;
  if (charts['yoyChart']) charts['yoyChart'].destroy();
  charts['yoyChart'] = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: `FOB ${yA}`, data: labels.map(l => dA[l] || 0), backgroundColor: '#3b82f6' },
        { label: `FOB ${yB}`, data: labels.map(l => dB[l] || 0), backgroundColor: '#10b981' }
      ]
    },
    options: { responsive: true }
  });
}

// ============================================================
// FICHA DE FOLIO (Modal)
// ============================================================
function openFolio(id) {
  if (!id) return;
  hideTooltip();
  const f = rawData.find(x => x.folio?.toString() === id.toString());
  if (!f) { alert(`El folio ${id} no existe en la base cargada.`); return; }

  const slug = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  document.getElementById('modalFolio').innerText  = `Folio #${f.folio}`;
  document.getElementById('modalBadge').innerText   = f.estado;
  document.getElementById('modalBadge').className   = `badge status-${slug(f.estado)}`;
  document.getElementById('modalStatusDot').className = `status-dot semaforo-${f._semaforo}`;

  const act = document.getElementById('modalActions');
  act.innerHTML = f.adjunto?.startsWith('http')
    ? `<button onclick="openDocViewer('${f.folio}','${f.adjunto}')" class="btn-primary"><i class="fa-solid fa-folder-open"></i> Ver Documento</button>`
    : '';

  // Workflow timeline
  const wC = document.getElementById('workflowTimeline');
  if (wC) {
    const plan = planData.find(p => p.folioLinked?.toString() === f.folio?.toString());
    if (plan) {
      const icon  = s => s === 'Completado' || s === 'Aprobado' ? 'fa-check' : s === 'Rechazado' ? 'fa-times' : s === 'En proceso' ? 'fa-spinner fa-spin' : 'fa-hourglass-start';
      const cls   = s => s === 'Completado' || s === 'Aprobado' ? 'active' : s === 'En proceso' ? 'processing' : s === 'Rechazado' ? 'rejected' : '';
      wC.innerHTML = ['pedido','cotizacion','impo','banco','aprobacion'].map(k => `
        <div class="wf-step ${cls(plan[k])}">
          <div class="wf-icon"><i class="fa-solid ${icon(plan[k])}"></i></div>
          <div class="wf-label">${k.charAt(0).toUpperCase()+k.slice(1)}</div>
        </div>`).join('');
      if (plan.comentarios) wC.innerHTML += `<div style="width:100%;font-size:.85rem;padding:10px;background:rgba(59,130,246,.1);color:var(--primary-dark);border-radius:8px;margin-top:15px"><i class="fa-solid fa-note-sticky"></i> <b>Nota: </b>${plan.comentarios}</div>`;
    } else {
      const steps = [
        { label: 'Cotización', check: true,                       icon: 'fa-file-invoice' },
        { label: 'Pedido',     check: !!f.fecha_compra,           icon: 'fa-cart-shopping' },
        { label: 'Producción', check: f.estado !== 'Pendiente',   icon: 'fa-gears' },
        { label: 'Embarcado',  check: !['Producción','Pendiente'].includes(f.estado), icon: 'fa-ship' },
        { label: 'Arribado',   check: ['Aduana','Depósito'].includes(f.estado), icon: 'fa-anchor' },
        { label: 'Ingreso',    check: f.estado === 'Depósito',    icon: 'fa-warehouse' },
      ];
      wC.innerHTML = steps.map(w => `
        <div class="wf-step ${w.check ? 'active' : ''}">
          <div class="wf-icon"><i class="fa-solid ${w.icon}"></i></div>
          <div class="wf-label">${w.label}</div>
        </div>`).join('');
    }
  }

  document.getElementById('opDetails').innerHTML = `
    <div class="row"><span>Proveedor:</span><b>${f.proveedor}</b></div>
    <div class="row"><span>Mercadería:</span><b>${f.mercaderia}</b></div>
    <div class="row"><span>Línea:</span><b>${f.linea || '—'}</b></div>
    <div class="row"><span>Producto:</span><b>${f.producto || '—'}</b></div>
    <div class="row"><span>Confirmación:</span><b>${f.fecha_compra || '—'}</b></div>
    <div class="row"><span>ETD / ETA:</span><b style="${f._semaforo==='rojo'?'color:var(--danger)':''}">${f.etd || '—'} → ${f.eta || '—'}</b></div>`;

  const showFin = currentUser && (currentUser.rol === 'Admin' || currentUser.rol === 'Finanzas');
  document.getElementById('finDetails').innerHTML = showFin ? `
    <div class="row"><span>FOB USD:</span><b>USD ${(f.fob || 0).toLocaleString()}</b></div>
    <div class="row"><span>Seña USD:</span><b>USD ${(f.sena_usd || 0).toLocaleString()}</b></div>
    <div class="row"><span>Balance USD:</span><b>USD ${(f.balance_usd || 0).toLocaleString()}</b></div>
    <div class="row"><span>Despacho UYU:</span><b>UYU ${(f.despacho_uyu || 0).toLocaleString()}</b></div>` :
    `<div style="color:var(--text-muted);font-size:.85rem;padding:12px">Los datos financieros no están disponibles para tu rol.</div>`;

  document.getElementById('folioModal').classList.add('active');
}
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

// ============================================================
// VISOR DE DOCUMENTOS
// ============================================================
function openDocViewer(folio, rawUrl) {
  if (!rawUrl?.startsWith('http')) { alert('Documento no válido.'); return; }
  document.getElementById('docViewerTitle').innerText = `Documento del Folio #${folio}`;
  document.getElementById('docExternalLink').href = rawUrl;
  document.getElementById('docLoader').style.display = 'flex';
  const iframeUrl = rawUrl.includes('drive.google.com') && rawUrl.includes('/view')
    ? rawUrl.replace('/view', '/preview')
    : rawUrl;
  document.getElementById('docIframe').src = iframeUrl;
  document.getElementById('docViewerModal').classList.add('active');
}

// ============================================================
// PLANIFICACIÓN — Tabla
// ============================================================
function renderPlanningTable() {
  const tbody = document.getElementById('planningBody');
  if (!tbody) return;
  if (!filteredPlanData.length) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--text-muted)">No hay planificaciones para estos filtros.</td></tr>`;
    return;
  }
  tbody.innerHTML = filteredPlanData.map(p => `
    <tr>
      <td><span class="prio-badge" data-val="${p.prioridad}">${p.prioridad}</span></td>
      <td><b>${p.proveedor}</b></td>
      <td class="text-truncate" style="max-width:200px" title="${p.descripcion}">${p.descripcion}</td>
      <td><span class="planning-state" data-val="${p.pedido    }">${p.pedido    }</span></td>
      <td><span class="planning-state" data-val="${p.cotizacion}">${p.cotizacion}</span></td>
      <td><span class="planning-state" data-val="${p.impo      }">${p.impo      }</span></td>
      <td><span class="planning-state" data-val="${p.aprobacion}">${p.aprobacion}</span></td>
      <td><span class="planning-state" data-val="${p.banco     }">${p.banco     }</span></td>
      <td>${p.responsable || '—'}</td>
      <td>${p.folioLinked ? `<span class="folio-link" onclick="openFolio('${p.folioLinked}')">#${p.folioLinked} <i class="fa-solid fa-link"></i></span>` : '—'}</td>
      <td><button class="btn-primary-sm btn-primary" onclick="openPlanModal('${p.id}')"><i class="fa-solid fa-pen-to-square"></i> Editar</button></td>
    </tr>`).join('');
}

// ============================================================
// PLANIFICACIÓN — Modal edición
// ============================================================
function openPlanModal(id = null) {
  document.getElementById('planSaveStatus').innerText = '';
  const btnDel = document.getElementById('btnDeletePlan');

  if (id) {
    const p = planData.find(x => x.id === id);
    if (!p) return;
    document.getElementById('planModalTitle').innerText   = 'Editar Planificación';
    document.getElementById('pf-id').value                = p.id;
    document.getElementById('pf-prioridad').value         = p.prioridad;
    document.getElementById('pf-proveedor').value         = p.proveedor;
    document.getElementById('pf-descripcion').value       = p.descripcion;
    document.getElementById('pf-pedido').value            = p.pedido;
    document.getElementById('pf-cotizacion').value        = p.cotizacion;
    document.getElementById('pf-impo').value              = p.impo;
    document.getElementById('pf-aprobacion').value        = p.aprobacion;
    document.getElementById('pf-banco').value             = p.banco;
    document.getElementById('pf-comentarios').value       = p.comentarios;
    document.getElementById('pf-responsable').value       = p.responsable;
    document.getElementById('pf-folio').value             = p.folioLinked;
    btnDel.classList.remove('hidden');
  } else {
    document.getElementById('planModalTitle').innerText   = 'Nueva Planificación';
    document.getElementById('pf-id').value                = 'REQ-' + Date.now();
    document.getElementById('pf-prioridad').value         = '4. Baja';
    ['pf-proveedor','pf-descripcion','pf-comentarios','pf-responsable','pf-folio'].forEach(f => document.getElementById(f).value = '');
    document.querySelectorAll('.state-sel').forEach(s => s.value = 'Pendiente');
    btnDel.classList.add('hidden');
  }
  document.getElementById('planModal').classList.add('active');
}

function savePlan() {
  const btn    = document.getElementById('btnSavePlan');
  const status = document.getElementById('planSaveStatus');
  const doc = {
    id:          document.getElementById('pf-id').value,
    prioridad:   document.getElementById('pf-prioridad').value,
    proveedor:   document.getElementById('pf-proveedor').value,
    descripcion: document.getElementById('pf-descripcion').value,
    pedido:      document.getElementById('pf-pedido').value,
    cotizacion:  document.getElementById('pf-cotizacion').value,
    impo:        document.getElementById('pf-impo').value,
    aprobacion:  document.getElementById('pf-aprobacion').value,
    banco:       document.getElementById('pf-banco').value,
    comentarios: document.getElementById('pf-comentarios').value,
    responsable: document.getElementById('pf-responsable').value,
    folioLinked: document.getElementById('pf-folio').value,
  };

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
  status.innerText = 'Sincronizando...';

  google.script.run
    .withSuccessHandler(result => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Guardar Cambios';
      if (result.error) { status.style.color = 'var(--danger)'; status.innerText = '❌ ' + result.error; return; }
      // Actualizar memoria local
      const idx = planData.findIndex(x => x.id === doc.id);
      if (idx > -1) { doc.fecha_creacion = planData[idx].fecha_creacion; planData[idx] = doc; }
      else          { doc.fecha_creacion = result.timestamp; planData.push(doc); }
      status.style.color = 'var(--success)';
      status.innerText = '✅ Sincronizado';
      populateFilterOptions();
      applyAllFilters();
      setTimeout(() => closeModal('planModal'), 800);
    })
    .withFailureHandler(err => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Guardar Cambios';
      status.style.color = 'var(--danger)';
      status.innerText   = '❌ Error de conexión';
    })
    .savePlanData(doc);
}

function deletePlan() {
  if (!confirm('¿Eliminar esta planificación del Sheet? Esta acción no se puede deshacer.')) return;
  const id     = document.getElementById('pf-id').value;
  const btn    = document.getElementById('btnDeletePlan');
  const status = document.getElementById('planSaveStatus');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Eliminando...';

  google.script.run
    .withSuccessHandler(result => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-trash"></i> Eliminar Registro';
      if (result.error) { status.style.color = 'var(--danger)'; status.innerText = '❌ ' + result.error; return; }
      planData = planData.filter(x => x.id !== id);
      applyAllFilters();
      closeModal('planModal');
    })
    .withFailureHandler(err => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-trash"></i> Eliminar Registro';
      status.style.color = 'var(--danger)';
      status.innerText   = '❌ Error de conexión';
    })
    .deletePlanData(id);
}

// ============================================================
// NAVEGACIÓN ENTRE VISTAS
// ============================================================
function switchView(view) {
  const perms = ROLE_PERMS[currentUser?.rol] || ROLE_PERMS['Deposito'];
  if (!perms.views.includes(view)) return; // Bloqueo de seguridad

  currentView = view;
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-nav li:not(.section-label)').forEach(l => l.classList.remove('active'));
  document.getElementById(`view-${view}`)?.classList.add('active');
  document.getElementById(`nav-${view}`)?.classList.add('active');

  const advFilt  = document.getElementById('advanceFilters');
  const planFilt = document.getElementById('planFilters');
  if (advFilt && planFilt) {
    if (view === 'planning') { advFilt.classList.add('hidden'); planFilt.classList.remove('hidden'); }
    else                     { advFilt.classList.remove('hidden'); planFilt.classList.add('hidden'); }
  }
  updateUI();
}

// ============================================================
// PARSER DE FECHAS
// ============================================================
function parseDate(s) {
  if (!s || s === '-') return null;
  if (s.includes('/')) {
    const [d, m, y] = s.split('/');
    if (d && m && y) return new Date(y, m - 1, d);
  }
  if (s.includes('-')) {
    const parts = s.replace(/\./g, '').split('-');
    if (parts.length === 3) {
      const monthMap = { ene:0,feb:1,mar:2,abr:3,may:4,jun:5,jul:6,ago:7,sep:8,oct:9,nov:10,dic:11 };
      const mon = monthMap[parts[1].toLowerCase().substring(0, 3)];
      if (mon !== undefined) return new Date(parseInt(parts[2]), mon, parseInt(parts[0]));
    }
  }
  return null;
}
