let SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxAYq1xbI6OiNR7PGBFDgiif1H670kmzSPiJFE7_2RlUDYzR6_stRnKUQN1bdoqLnHI/exec';
let allData = [];
let filteredData = [];
let currentFilter = 'all';
let sortConfig = { key: 'folio', direction: 'desc' };
let charts = {};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupModalEvents();
});

function setupModalEvents() {
    const modal = document.getElementById('folioModal');
    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
    window.onclick = (e) => { if(e.target === modal) modal.classList.remove('active'); };
}

// --- CORE DATA LOADING v8.0 ---
async function loadData() {
    const btn = document.getElementById('refreshDataBtn');
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Auditando ERP...'; btn.disabled = true; }

    try {
        const response = await fetch(`${SCRIPT_URL}?sync=true`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        allData = Array.isArray(data) ? data : [];
        console.log("ERP Audit Complete:", allData.length, "folios merged.");
        
        updateDashboard();
        initCharts();
        applyCurrentState();
    } catch (err) {
        console.error("ERP Reconstruction Error:", err);
        alert("CRÍTICO: Fallo en la arquitectura de datos. Revisa la consola.");
    } finally {
        if(btn) { btn.innerHTML = '<i class="fa-solid fa-sync"></i> Actualizar'; btn.disabled = false; }
    }
}

// --- INTERACTIVE DASHBOARD ---
function filterByStatus(status) {
    currentFilter = (currentFilter === status) ? 'all' : status;
    
    // UI Feedback: Mark active card
    const cards = document.querySelectorAll('.stat-card');
    cards.forEach(c => {
        const title = c.querySelector('h3').innerText;
        if (title.includes(status) && currentFilter !== 'all') {
            c.style.borderColor = 'var(--primary)';
        } else {
            c.style.borderColor = 'var(--border)';
        }
    });

    applyCurrentState();
}

function updateDashboard() {
    const stats = { 'Producción': { count: 0, fob: 0 }, 'Tránsito': { count: 0, fob: 0 }, 'Aduana': { count: 0, fob: 0 }, 'Depósito': { count: 0, fob: 0 } };
    
    allData.forEach(f => {
        if (stats[f.estado]) {
            stats[f.estado].count++;
            stats[f.estado].fob += parseFloat(f.fob.toString().replace(/[^0-9.]/g, '')) || 0;
        }
    });

    Object.keys(stats).forEach(k => {
        const id = k.toLowerCase().replace('ó', 'o');
        const countEl = document.getElementById(`count-${id}`);
        const valEl = document.getElementById(`val-${id}`);
        if(countEl) countEl.innerText = stats[k].count;
        if(valEl) valEl.innerText = `USD ${stats[k].fob.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    });
}

// --- CHARTA.JS ANALYTICS ---
function initCharts() {
    const ctxMain = document.getElementById('purchaseChart')?.getContext('2d');
    const ctxPie = document.getElementById('statusPieChart')?.getContext('2d');
    if (!ctxMain || !ctxPie) return;

    // 1. Compras por Año (Logistics B Column)
    const yearData = { '2024': 0, '2025': 0, '2026': 0 };
    allData.forEach(f => {
        const year = f.fecha_compra?.split('/')[2];
        const fob = parseFloat(f.fob?.replace(/[^0-9.]/g, '')) || 0;
        if (yearData.hasOwnProperty(year)) yearData[year] += fob;
    });

    if (charts.bar) charts.bar.destroy();
    charts.bar = new Chart(ctxMain, {
        type: 'bar',
        data: {
            labels: Object.keys(yearData),
            datasets: [{ label: 'FOB Estimado USD', data: Object.values(yearData), backgroundColor: '#3b82f6', borderRadius: 6 }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    // 2. Distribución por Estado
    const stateData = { 'Cotización': 0, 'Producción': 0, 'Tránsito': 0, 'Aduana': 0, 'Depósito': 0 };
    allData.forEach(f => { if(stateData.hasOwnProperty(f.estado)) stateData[f.estado]++; });

    if (charts.pie) charts.pie.destroy();
    charts.pie = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: Object.keys(stateData),
            datasets: [{ data: Object.values(stateData), backgroundColor: ['#94a3b8', '#3b82f6', '#f59e0b', '#ef4444', '#10b981'] }]
        },
        options: { responsive: true, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } }
    });
}

// --- TABLE LOGIC (SORTING & SEARCHING) ---
function sortTable(key) {
    if (sortConfig.key === key) {
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortConfig.key = key;
        sortConfig.direction = 'desc';
    }
    applyCurrentState();
}

function applyCurrentState(searchTerm = "") {
    const search = searchTerm || document.getElementById('searchInput')?.value?.toLowerCase() || "";
    
    filteredData = allData.filter(f => {
        const matchStatus = currentFilter === 'all' || f.estado === currentFilter;
        const matchSearch = !search || 
            f.folio?.toString().toLowerCase().includes(search) || 
            f.proveedor?.toLowerCase().includes(search) || 
            f.mercaderia?.toLowerCase().includes(search);
        return matchStatus && matchSearch;
    });

    // Real Sorting Logic (Dates, Numbers, Text)
    filteredData.sort((a, b) => {
        let vA = a[sortConfig.key] || "";
        let vB = b[sortConfig.key] || "";

        if (sortConfig.key === 'fob' || sortConfig.key === 'folio') {
            vA = parseFloat(vA.toString().replace(/[^0-9.]/g, '')) || 0;
            vB = parseFloat(vB.toString().replace(/[^0-9.]/g, '')) || 0;
        } else if (vA.toString().includes('/')) {
            const partsA = vA.split('/');
            const partsB = vB.split('/');
            vA = new Date(partsA[2], partsA[1]-1, partsA[0]).getTime() || 0;
            vB = new Date(partsB[2], partsB[1]-1, partsB[0]).getTime() || 0;
        } else {
            vA = vA.toString().toLowerCase();
            vB = vB.toString().toLowerCase();
        }

        if (vA < vB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (vA > vB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('foliosTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';

    filteredData.forEach(f => {
        const tr = document.createElement('tr');
        tr.onclick = () => openFolioModal(f.folio);
        tr.innerHTML = `
            <td>#${f.folio}</td>
            <td style="font-weight:600;">${f.proveedor}</td>
            <td style="font-size:0.8rem;">${f.mercaderia}</td>
            <td><span class="status-badge status-${f.estado.toLowerCase().replace('í', 'i').replace('ó', 'o')}">${f.estado}</span></td>
            <td>${f.fecha_compra || "-"}</td>
            <td>${f.etd || "-"}</td>
            <td>${f.eta || "-"}</td>
            <td style="color:#60a5fa; font-weight:700;">USD ${parseFloat(f.fob.replace(/[^0-9.]/g, '') || 0).toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- DEEP FICHA FOLIO v2 ---
function openFolioModal(folioId) {
    const f = allData.find(x => x.folio.toString() === folioId.toString());
    if(!f) return;

    document.getElementById('modalFolioId').innerText = `Folio #${f.folio} [ABC: ${f.abc}]`;
    document.getElementById('modalStatus').innerText = f.estado;
    document.getElementById('modalStatus').className = `status-badge status-${f.estado.toLowerCase().replace('í', 'i').replace('ó', 'o')}`;

    document.getElementById('modalBody').innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:30px;">
            <!-- Tech Details -->
            <div class="modal-section">
                <h4 style="color:var(--text-muted); margin-bottom:15px; text-transform:uppercase; font-size:0.75rem;"><i class="fa-solid fa-ship"></i> Logística</h4>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <div class="info-cell"><label>Origen</label><div>${f.origen || "-"}</div></div>
                    <div class="info-cell"><label>Buque</label><div>${f.buque || "-"}</div></div>
                    <div class="info-cell"><label>Incoterm</label><div>${f.incoterm || "-"}</div></div>
                    <div class="info-cell"><label>Contenedores</label><div>${f.contenedores || "-"}</div></div>
                    <div class="info-cell"><label>Volumen (m3)</label><div>${f.vol_m3 || "-"}</div></div>
                    <div class="info-cell"><label>Peso (kg)</label><div>${f.peso || "-"}</div></div>
                </div>
            </div>
            <!-- Finance Details -->
            <div class="modal-section">
                <h4 style="color:var(--text-muted); margin-bottom:15px; text-transform:uppercase; font-size:0.75rem;"><i class="fa-solid fa-coins"></i> Finanzas</h4>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <div class="info-cell"><label>FOB Factura</label><div>USD ${f.fob}</div></div>
                    <div class="info-cell"><label>Seña USD</label><div>USD ${f.sena_usd}</div></div>
                    <div class="info-cell"><label>Balance USD</label><div>USD ${f.balance_usd}</div></div>
                    <div class="info-cell" style="background:rgba(16, 185, 129, 0.05);"><label>Costo Estimado</label><div style="color:var(--success); font-weight:800;">USD ${f.costo_total_estimado}</div></div>
                    <div class="info-cell"><label>Despacho</label><div>UYU ${f.despacho_uyu}</div></div>
                    <div class="info-cell"><label>Lead Time</label><div>${f.lead_time}</div></div>
                </div>
            </div>
        </div>
        <div style="margin-top:20px; padding:15px; background:rgba(255,255,255,0.02); border-radius:12px; font-size:0.85rem; color:var(--text-muted);">
            <i class="fa-solid fa-info-circle"></i> Estado Completitud: <b>${f.estado_completitud}</b>
        </div>
    `;

    document.getElementById('folioModal').classList.add('active');
}
