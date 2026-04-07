let SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwK6WNYfnUlBd58KTVzaXVMv5Yxf34pHOdRl9BB7JgFCnpuIa9wIB0me9wjplYMVJi3/exec';
let allData = [];
let filteredData = [];
let currentFilter = 'all';
let sortConfig = { key: 'Folio', direction: 'desc' };
let activeFolio = null;
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
    window.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
}

// --- CORE DATA LOADING ---
async function loadData() {
    const btn = document.getElementById('refreshDataBtn');
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Sincronizando ERP...'; btn.disabled = true; }

    try {
        // Sync=true triggers the RESUMEN IMPORTACIONES update in the background
        const response = await fetch(`${SCRIPT_URL}?sync=true`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        allData = Array.isArray(data) ? data : [];
        console.log("ERP Data Loaded:", allData.length, "rows");
        
        updateDashboard();
        initCharts();
        applyCurrentState();
    } catch (err) {
        console.error("ERP Connection Error:", err);
        alert("Error de conexión con el ERP Central. Por favor, verifique su conexión o permisos de Google.");
    } finally {
        if(btn) { btn.innerHTML = '<i class="fa-solid fa-sync"></i> Actualizar'; btn.disabled = false; }
    }
}

// --- DASHBOARD & ANALYTICS ---
function updateDashboard() {
    const stats = { 'En Producción': { c: 0, v: 0 }, 'En Tránsito': { c: 0, v: 0 }, 'Aduana': { c: 0, v: 0 }, 'Depósito': { c: 0, v: 0 } };
    
    allData.forEach(f => {
        const s = f.Estado || 'En Producción';
        const fob = parseFloat(f.FOB?.toString().replace(/[^0-9.]/g, '')) || 0;
        if (stats[s]) { stats[s].c++; stats[s].v += fob; }
    });

    Object.keys(stats).forEach(k => {
        const id = k.toLowerCase().replace('en ', '').replace('ó', 'o');
        const cEl = document.getElementById(`count-${id}`);
        const vEl = document.getElementById(`val-${id}`);
        if(cEl) cEl.innerText = stats[k].c;
        if(vEl) vEl.innerText = `USD ${stats[k].v.toLocaleString('es-AR', {minimumFractionDigits: 0})}`;
    });
}

function initCharts() {
    // 1. Chart de Compras por Año/Mes (Columna B: Confirmación)
    const monthlyData = {};
    allData.forEach(f => {
        const dateStr = f.Confirmación || "";
        if (!dateStr) return;
        const parts = dateStr.split('/'); // DD/MM/YYYY
        if (parts.length === 3) {
            const key = `${parts[2]}-${parts[1]}`; // YYYY-MM
            const fob = parseFloat(f.FOB?.toString().replace(/[^0-9.]/g, '')) || 0;
            monthlyData[key] = (monthlyData[key] || 0) + fob;
        }
    });

    const labels = Object.keys(monthlyData).sort();
    const values = labels.map(l => monthlyData[l]);

    const ctxPurchase = document.getElementById('purchaseChart')?.getContext('2d');
    if (ctxPurchase) {
        if (charts.purchase) charts.purchase.destroy();
        charts.purchase = new Chart(ctxPurchase, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Volumen Mensual (USD)',
                    data: values,
                    backgroundColor: '#3b82f6',
                    borderRadius: 5
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } } } }
        });
    }

    // 2. Chart de Estados
    const statusData = { 'Producción': 0, 'Tránsito': 0, 'Aduana': 0, 'Depósito': 0 };
    allData.forEach(f => {
        const s = (f.Estado || "").replace("En ", "");
        if (statusData.hasOwnProperty(s)) statusData[s]++;
    });

    const ctxPie = document.getElementById('statusPieChart')?.getContext('2d');
    if (ctxPie) {
        if (charts.pie) charts.pie.destroy();
        charts.pie = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusData),
                datasets: [{
                    data: Object.values(statusData),
                    backgroundColor: ['#3b82f6', '#f59e0b', '#ef4444', '#10b981'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } }
        });
    }
}

// --- FILTERS & SORTING ENGINE ---
function filterByStatus(s) {
    currentFilter = (currentFilter === s) ? 'all' : s;
    const tag = document.getElementById('activeFilterTag');
    if(tag) {
        if (currentFilter === 'all') tag.style.display = 'none';
        else {
            tag.style.display = 'inline-flex';
            tag.innerHTML = `Estado: ${s} <i class="fa-solid fa-xmark" onclick="filterByStatus('all')"></i>`;
        }
    }
    applyCurrentState();
}

function handleSearch(val) { applyCurrentState(val.toLowerCase()); }

function sortTable(key) {
    if (sortConfig.key === key) sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    else { sortConfig.key = key; sortConfig.direction = 'asc'; }
    applyCurrentState();
}

function applyCurrentState(searchTerm = "") {
    filteredData = [...allData];
    
    // Status Filter
    if (currentFilter !== 'all') {
        filteredData = filteredData.filter(f => f.Estado === currentFilter);
    }
    
    // Search Filter
    if (searchTerm) {
        filteredData = filteredData.filter(f => 
            f.Folio?.toLowerCase().includes(searchTerm) || 
            f.Proveedor?.toLowerCase().includes(searchTerm) || 
            f.Mercaderia?.toLowerCase().includes(searchTerm)
        );
    }

    // Sorting Logic (Real & Functional)
    filteredData.sort((a, b) => {
        let vA = a[sortConfig.key] || "";
        let vB = b[sortConfig.key] || "";

        // Number Detection
        if (sortConfig.key === 'FOB' || !isNaN(parseFloat(vA)) && isFinite(vA) && !vA.toString().includes('/')) {
            vA = parseFloat(vA.toString().replace(/[^0-9.]/g, '')) || 0;
            vB = parseFloat(vB.toString().replace(/[^0-9.]/g, '')) || 0;
        } 
        // Date Detection (DD/MM/YYYY)
        else if (vA.toString().includes('/') && vA.toString().split('/').length === 3) {
            vA = new Date(vA.split('/').reverse().join('-')) || 0;
            vB = new Date(vB.split('/').reverse().join('-')) || 0;
        }
        else {
            vA = vA.toString().toLowerCase();
            vB = vB.toString().toLowerCase();
        }

        if (vA < vB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (vA > vB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    renderTable();
}

// --- TABLE RENDERING ---
function renderTable() {
    const tbody = document.getElementById('foliosTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';

    filteredData.forEach(f => {
        const stClass = (f.Estado || 'produccion').toLowerCase().replace(' ', '-');
        const fobValue = parseFloat(f.FOB?.toString().replace(/[^0-9.]/g, '')) || 0;
        const purchaseDate = f.Confirmación || f['Fecha Compra'] || "-";

        const tr = document.createElement('tr');
        tr.onclick = () => openFolioModal(f.Folio);
        tr.innerHTML = `
            <td><strong>#${f.Folio}</strong></td>
            <td>${f.Proveedor}</td>
            <td>${f.Mercaderia}</td>
            <td><span class="status-badge status-${stClass}">${f.Estado}</span></td>
            <td>${purchaseDate}</td>
            <td>${f.ETA || "-"}</td>
            <td><span class="text-primary font-bold">USD ${fobValue.toLocaleString()}</span></td>
            <td><span class="badge-${(fobValue > 0 ? 'completa' : 'pendiente')}">${fobValue > 0 ? 'Activa' : 'Sin Datos'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- MODAL & TABS ---
function openFolioModal(id) {
    activeFolio = allData.find(f => f.Folio.toString() === id.toString());
    if (!activeFolio) return;
    
    document.getElementById('modalFolioId').innerText = `Folio #${activeFolio.Folio}`;
    const mStatus = document.getElementById('modalStatus');
    mStatus.innerText = activeFolio.Estado;
    mStatus.className = `badge status-${(activeFolio.Estado || 'produccion').toLowerCase().replace(' ', '-')}`;
    
    switchModalTab('general');
    document.getElementById('folioModal').classList.add('active');
}

function switchModalTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.innerText.toLowerCase().includes(tab.slice(0,3))));
    const body = document.getElementById('modalBody');
    body.innerHTML = '<div class="loading">Cargando...</div>';
    
    setTimeout(() => {
        if (tab === 'general') renderGeneralTab();
        else if (tab === 'tracking') renderTrackingTab();
        else if (tab === 'docs') renderDocsTab();
        else if (tab === 'economic') renderEconomicTab();
    }, 50);
}

function renderGeneralTab() {
    document.getElementById('modalBody').innerHTML = `
        <div class="folio-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="info-cell"><label>Proveedor</label><div>${activeFolio.Proveedor}</div></div>
            <div class="info-cell"><label>Mercadería</label><div>${activeFolio.Mercaderia}</div></div>
            <div class="info-cell"><label>Fecha Confirmación</label><div>${activeFolio.Confirmación || "-"}</div></div>
            <div class="info-cell"><label>Incoterm</label><div>${activeFolio.Incoterm || "-"}</div></div>
            <div class="info-cell"><label>Carga</label><div>${activeFolio.Carga || "-"}</div></div>
            <div class="info-cell"><label>Volumen</label><div>${activeFolio.Volumen || "-"}</div></div>
            <div class="info-cell full-width" style="grid-column: span 2;"><label>Observaciones</label><div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 5px;">${activeFolio.Observaciones || 'Sin registros.'}</div></div>
        </div>
    `;
}

function renderTrackingTab() {
    const steps = [
        { n: 'Producción', s: 'En Producción', date: activeFolio.Confirmación },
        { n: 'Tránsito', s: 'En Tránsito', date: activeFolio.ETD },
        { n: 'Aduana', s: 'Aduana', date: activeFolio.ETA },
        { n: 'Depósito', s: 'Depósito', date: activeFolio.ETA }
    ];
    let cur = steps.findIndex(s => s.s === activeFolio.Estado); if (cur === -1) cur = 0;
    
    let html = '<div class="timeline" style="padding: 20px 0;">';
    steps.forEach((s, i) => {
        const status = (i < cur) ? 'completed' : (i === cur ? 'active' : 'pending');
        html += `<div class="timeline-item ${status}" style="display: flex; gap: 20px; align-items: start; margin-bottom: 20px; opacity: ${status === 'pending' ? '0.4' : '1'}">
            <div class="dot" style="width: 15px; height: 15px; border-radius: 50%; background: ${status === 'completed' ? '#10b981' : (status === 'active' ? '#3b82f6' : '#475569')}; margin-top: 5px;"></div>
            <div>
                <h4 style="margin:0">${s.n}</h4>
                <small>${s.date || "--/--/--"}</small>
            </div>
        </div>`;
    });
    document.getElementById('modalBody').innerHTML = html + '</div>';
}

async function renderDocsTab() {
    const body = document.getElementById('modalBody');
    body.innerHTML = '<div class="loading"><i class="fa-solid fa-folder-open fa-spin"></i> Escaneando carpetas en Drive...</div>';

    try {
        const res = await fetch(`${SCRIPT_URL}?tab=docs&folioId=${activeFolio.Folio}`);
        const driveFiles = await res.json();
        const types = ["Factura comercial", "Proforma", "Comprobante de seña", "Comprobante de balance", "Factura de flete internacional", "DUA", "Factura de flete nacional"];
        
        let html = `<h3>Gestión Documental Automática</h3><div class="docs-list">`;
        types.forEach(t => {
            const file = Object.keys(driveFiles).find(name => name.toLowerCase().includes(t.toLowerCase()));
            if (file) {
                html += `
                    <div class="doc-card" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.1);">
                        <div class="doc-info">
                            <h4 style="margin:0; font-size:0.9rem;">${t}</h4>
                            <small style="color: #94a3b8;">${file}</small>
                        </div>
                        <a href="${driveFiles[file].url}" target="_blank" class="btn-refresh" style="padding: 5px 12px; font-size: 0.75rem; text-decoration: none;">Ver</a>
                    </div>`;
            } else {
                html += `
                    <div class="doc-card pending" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.1); padding: 12px; border-radius: 8px; margin-bottom: 10px; border: 1px dashed rgba(255,255,255,0.1);">
                        <div class="doc-info">
                            <h4 style="margin:0; font-size:0.9rem; opacity: 0.5;">${t}</h4>
                            <small style="color: #475569;">Pendiente en Drive</small>
                        </div>
                        <button class="upload-btn" onclick="triggerUpload('${t}')" style="background:transparent; border:1px solid #334155; color:#94a3b8; padding:5px 12px; border-radius:5px; font-size:0.75rem; cursor:pointer;">Subir</button>
                    </div>`;
            }
        });
        body.innerHTML = html + '</div>';
    } catch (e) {
        body.innerHTML = '<div class="error">Error al conectar con Drive. Reintente.</div>';
    }
}

async function renderEconomicTab() {
    const econ = activeFolio.Economico || {};
    const fob = parseFloat(activeFolio.FOB?.toString().replace(/[^0-9.]/g, '')) || 0;
    const tc = parseFloat(econ['Tipo de Cambio'] || 1);
    
    document.getElementById('modalBody').innerHTML = `
        <div class="econ-grid" style="display: flex; flex-direction: column; gap: 20px;">
            <div class="total-card" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; border-radius: 12px; border: 1px solid #334155;">
                <label style="color: #94a3b8; text-transform: uppercase; font-size: 0.75rem; font-weight: 800;">FOB (Declarado en Planilla)</label>
                <div style="font-size: 3rem; font-weight: 900; color: #10b981;">USD ${fob.toLocaleString()}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="info-cell"><label>Monto Señado</label><div>USD ${parseFloat(econ['Monto Señado'] || 0).toLocaleString()}</div></div>
                <div class="info-cell"><label>Monto Balance</label><div>USD ${parseFloat(econ['Monto Balance'] || 0).toLocaleString()}</div></div>
                <div class="info-cell"><label>Flete Int.</label><div>USD ${parseFloat(econ['Flete'] || 0).toLocaleString()}</div></div>
                <div class="info-cell"><label>T. Cambio Manual</label><div>${tc}</div></div>
            </div>
            
            <div class="alert-info" style="background: rgba(59, 130, 246, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <p style="margin:0; font-size:0.85rem; color: #93c5fd;"><i class="fa-solid fa-circle-info"></i> El Resumen Económico se sincroniza automáticamente con la hoja <strong>RESUMEN IMPORTACIONES</strong> del Google Sheet.</p>
            </div>
        </div>
    `;
}
