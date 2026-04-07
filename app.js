let SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx2b_MXm0mOLhaeoeLbiAjQ2XaB6ebJV_TAt6TSAhXTcuApDIGslaEfbL32KvOY4ml8/exec';
let allData = [];
let currentFilter = 'all';
let sortConfig = { key: 'Folio', direction: 'asc' };
let activeFolio = null;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Iniciando ERP v4.3...");
    loadData();
    setupModalEvents();
});

function setupModalEvents() {
    const modal = document.getElementById('folioModal');
    const closeBtns = [document.getElementById('closeModal'), document.getElementById('closeModalBtn')];
    closeBtns.forEach(btn => { if(btn) btn.onclick = () => modal.classList.remove('active'); });
    window.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
}

async function loadData() {
    const btn = document.getElementById('refreshDataBtn');
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Conectando...'; btn.disabled = true; }

    try {
        console.log("FETCH a:", SCRIPT_URL);
        const response = await fetch(SCRIPT_URL);
        if (!response.ok) throw new Error("HTTP Status " + response.status);
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        // SI LLEGAMOS AQUÍ, HAY ÉXITO
        alert("--- CONEXIÓN EXITOSA ---\nSe han cargado " + data.length + " folios correctamente.");
        
        allData = data;
        updateDashboard();
        applyCurrentState();
    } catch (err) {
        console.error("DIAGNOSTICO FALLIDO:", err);
        // NUEVO MENSAJE DE ERROR
        alert("--- ERROR CRÍTICO DE CONEXIÓN ---\nMensaje: " + err.message + "\n\nSi ves este cartel, estás en el archivo correcto pero algo bloquea la conexión.");
    } finally {
        if(btn) { btn.innerHTML = '<i class="fa-solid fa-sync"></i> Actualizar'; btn.disabled = false; }
    }
}

function updateDashboard() {
    const stats = { 'En Producción': { c: 0, v: 0 }, 'En Tránsito': { c: 0, v: 0 }, 'Aduana': { c: 0, v: 0 }, 'Depósito': { c: 0, v: 0 } };
    allData.forEach(f => {
        const s = f.Estado || 'En Producción';
        const fob = parseFloat(f.Economico?.['FOB Factura Comercial']) || 0;
        if (stats[s]) { stats[s].c++; stats[s].v += fob; }
    });
    Object.keys(stats).forEach(k => {
        const id = k.toLowerCase().replace('en ', '').replace('ó', 'o');
        const cEl = document.getElementById(`count-${id}`);
        const vEl = document.getElementById(`val-${id}`);
        if(cEl) cEl.innerText = stats[k].c;
        if(vEl) vEl.innerText = `USD ${stats[k].v.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    });
}

function renderTable(data) {
    const tbody = document.getElementById('foliosTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    data.forEach(f => {
        const econ = f.Economico || {};
        const fob = econ['FOB Factura Comercial'] ? `USD ${parseFloat(econ['FOB Factura Comercial']).toLocaleString()}` : '-';
        const stClass = (f.Estado || 'produccion').toLowerCase().replace(' ', '-');
        const tr = document.createElement('tr');
        tr.onclick = () => openFolioModal(f.Folio);
        tr.innerHTML = `
            <td><strong>#${f.Folio}</strong></td>
            <td>${f.Proveedor}</td>
            <td>${f.Mercaderia}</td>
            <td><span class="status-badge status-${stClass}">${f.Estado}</span></td>
            <td>${f['Fecha Compra'] || '-'}</td>
            <td>${f.ETA || '-'}</td>
            <td><span class="text-primary font-bold">${fob}</span></td>
            <td><span class="badge-${(econ['Estado Completitud'] || 'Incompleta').toLowerCase().replace(' ', '-')}">${econ['Estado Completitud'] || 'Incompleta'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function openFolioModal(id) {
    activeFolio = allData.find(f => f.Folio.toString() === id.toString());
    if (!activeFolio) return;
    document.getElementById('modalFolioId').innerText = `Folio #${activeFolio.Folio}`;
    document.getElementById('modalStatus').innerText = activeFolio.Estado;
    switchModalTab('general');
    document.getElementById('folioModal').classList.add('active');
}

function switchModalTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.innerText.toLowerCase().includes(tab.slice(0,3))));
    const body = document.getElementById('modalBody');
    body.innerHTML = '<div class="loading">Cargando...</div>';
    if (tab === 'general') renderGeneralTab();
    else if (tab === 'tracking') renderTrackingTab();
    else if (tab === 'docs') renderDocsTab();
    else if (tab === 'economic') renderEconomicTab();
}

async function renderDocsTab() {
    const body = document.getElementById('modalBody');
    body.innerHTML = '<div class="loading">Escaneando Drive...</div>';
    try {
        const res = await fetch(`${SCRIPT_URL}?tab=docs&folioId=${activeFolio.Folio}`);
        const driveFiles = await res.json();
        const types = ["Factura comercial", "Proforma", "Comprobante de seña", "Comprobante de balance", "Factura de flete internacional", "DUA", "Factura de flete nacional"];
        let html = `<div class="docs-list">`;
        types.forEach(t => {
            const file = Object.keys(driveFiles).find(name => name.toLowerCase().includes(t.toLowerCase()));
            if (file) html += `<div class="doc-card"><h4>${t}</h4><a href="${driveFiles[file].url}" target="_blank">Ver</a></div>`;
            else html += `<div class="doc-card pending"><h4>${t}</h4><span>Pendiente</span></div>`;
        });
        body.innerHTML = html + '</div>';
    } catch (e) { body.innerHTML = 'Error al conectar con Drive.'; }
}

function renderGeneralTab() {
    document.getElementById('modalBody').innerHTML = `
        <div class="folio-grid">
            <div><label>Proveedor</label> ${activeFolio.Proveedor}</div>
            <div><label>Mercadería</label> ${activeFolio.Mercaderia}</div>
        </div>
    `;
}
// ... Funciones simplificadas para rapidez en el diagnóstico
function filterByStatus(s) { applyCurrentState(); }
function applyCurrentState() { renderTable(allData); }
function sortTable(k) { applyCurrentState(); }
