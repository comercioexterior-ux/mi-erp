let SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz9jt9xqz0XC0NyNO4Sx6v3jXKaZz8fKv-dCxVqBoF-wu_IfZWPNevED2jQn7yaPk4I/exec';
let allData = [];
let currentFilter = 'all';
let sortConfig = { key: 'Folio', direction: 'asc' };
let activeFolio = null;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupModalEvents();
});

function setupModalEvents() {
    const modal = document.getElementById('folioModal');
    const closeBtns = [document.getElementById('closeModal'), document.getElementById('closeModalBtn')];
    closeBtns.forEach(btn => btn.onclick = () => modal.classList.remove('active'));
    window.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
}

// --- CARGA DE DATOS (RÁPIDA) ---
async function loadData() {
    const btn = document.getElementById('refreshDataBtn');
    btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Sincronizando...';
    btn.disabled = true;

    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        allData = data;
        updateDashboard();
        applyCurrentState();
    } catch (err) {
        console.error("Error al cargar datos:", err);
        alert("Error de conexión con el ERP. Verifique que el script esté publicado como 'Cualquiera' y haya autorizado los permisos.");
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-sync"></i> Actualizar';
        btn.disabled = false;
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
        document.getElementById(`count-${id}`).innerText = stats[k].c;
        document.getElementById(`val-${id}`).innerText = `USD ${stats[k].v.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    });
}

function filterByStatus(s) {
    currentFilter = s;
    const tag = document.getElementById('activeFilterTag');
    tag.style.display = 'inline-flex';
    tag.innerHTML = `Mostrando: ${s} <i class="fa-solid fa-xmark" onclick="clearFilter()"></i>`;
    applyCurrentState();
}

function clearFilter() {
    currentFilter = 'all';
    document.getElementById('activeFilterTag').style.display = 'none';
    applyCurrentState();
}

function handleSearch(v) { applyCurrentState(v.toLowerCase()); }

function applyCurrentState(searchTerm = '') {
    let filtered = [...allData];
    if (currentFilter !== 'all') filtered = filtered.filter(f => f.Estado === currentFilter);
    if (searchTerm) filtered = filtered.filter(f => f.Folio.toLowerCase().includes(searchTerm) || f.Proveedor.toLowerCase().includes(searchTerm) || f.Mercaderia.toLowerCase().includes(searchTerm));

    filtered.sort((a, b) => {
        let vA = a[sortConfig.key] || '', vB = b[sortConfig.key] || '';
        if (sortConfig.key.includes('Fecha') || sortConfig.key === 'ETA') {
            vA = new Date(vA.split('/').reverse().join('-')) || 0;
            vB = new Date(vB.split('/').reverse().join('-')) || 0;
        } else if (!isNaN(parseFloat(vA)) && isFinite(vA)) { vA = parseFloat(vA); vB = parseFloat(vB); }
        else { vA = vA.toString().toLowerCase(); vB = vB.toString().toLowerCase(); }
        return vA < vB ? (sortConfig.direction === 'asc' ? -1 : 1) : (vA > vB ? (sortConfig.direction === 'asc' ? 1 : -1) : 0);
    });
    renderTable(filtered);
}

function sortTable(key) {
    sortConfig.direction = (sortConfig.key === key && sortConfig.direction === 'asc') ? 'desc' : 'asc';
    sortConfig.key = key;
    applyCurrentState();
}

function renderTable(data) {
    const tbody = document.getElementById('foliosTableBody');
    tbody.innerHTML = '';
    data.forEach(f => {
        const econ = f.Economico || {};
        const fob = econ['FOB Factura Comercial'] ? `USD ${parseFloat(econ['FOB Factura Comercial']).toLocaleString()}` : '-';
        const comp = (econ['Estado Completitud'] || 'Incompleta').toLowerCase().replace(' ', '-');
        const stClass = f.Estado?.toLowerCase().replace(' ', '-') || 'produccion';

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
            <td><span class="badge-${comp}">${econ['Estado Completitud'] || 'Incompleta'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- MODAL & TABS ---
function openFolioModal(id) {
    activeFolio = allData.find(f => f.Folio.toString() === id.toString());
    if (!activeFolio) return;
    document.getElementById('modalFolioId').innerText = `Folio #${activeFolio.Folio}`;
    document.getElementById('modalStatus').innerText = activeFolio.Estado;
    document.getElementById('modalStatus').className = `badge status-${activeFolio.Estado?.toLowerCase().replace(' ', '-')}`;
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
        <div class="folio-details-grid">
            <div class="info-cell"><label>Proveedor</label><div>${activeFolio.Proveedor}</div></div>
            <div class="info-cell"><label>Mercadería</label><div>${activeFolio.Mercaderia}</div></div>
            <div class="info-cell"><label>Incoterm</label><div>${activeFolio.Incoterm || '-'}</div></div>
            <div class="info-cell"><label>Fecha Pedido</label><div>${activeFolio['Fecha Compra']}</div></div>
            <div class="info-cell"><label>Carga</label><div>${activeFolio.Carga || '-'}</div></div>
            <div class="info-cell"><label>Volumen</label><div>${activeFolio.Volumen || '-'}</div></div>
            <div class="info-cell full-width"><label>Observaciones Operativas</label><div>${activeFolio.Observaciones || 'Sin observaciones.'}</div></div>
        </div>
    `;
}

function renderTrackingTab() {
    const steps = [{ n: 'Producción', i: 'fa-industry', s: 'En Producción' }, { n: 'Tránsito', i: 'fa-ship', s: 'En Tránsito' }, { n: 'Aduana', i: 'fa-building-shield', s: 'Aduana' }, { n: 'Depósito', i: 'fa-warehouse', s: 'Depósito' }];
    let cur = steps.findIndex(s => s.s === activeFolio.Estado); if (cur === -1) cur = 0;
    let html = '<div class="timeline">';
    steps.forEach((s, i) => {
        html += `<div class="timeline-item ${i < cur ? 'completed' : ''} ${i === cur ? 'active' : ''}">
            <div class="timeline-dot"><i class="fa-solid ${s.i}"></i></div>
            <div class="timeline-content"><div class="timeline-date">${i === cur ? 'Estado Actual' : (i < cur ? 'Completado' : 'Pendiente')}</div><h4>${s.n}</h4></div>
        </div>`;
    });
    document.getElementById('modalBody').innerHTML = html + '</div>';
}

// --- CARGA DE DOCUMENTOS ON-DEMAND ---
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
                html += `<div class="doc-card">
                    <div class="doc-icon pdf"><i class="fa-solid fa-file-pdf"></i></div>
                    <div class="doc-info"><h4>${t}</h4><span>${file}</span></div>
                    <a href="${driveFiles[file].url}" target="_blank" class="icon-btn"><i class="fa-solid fa-eye"></i></a>
                </div>`;
            } else {
                html += `<div class="doc-card pending">
                    <div class="doc-icon pdf-pending"><i class="fa-solid fa-file-arrow-up"></i></div>
                    <div class="doc-info"><h4>${t}</h4><span>Pendiente en Drive</span></div>
                    <button class="upload-btn" onclick="triggerUpload('${t}')">Subir</button>
                </div>`;
            }
        });
        body.innerHTML = html + '</div>';
    } catch (e) { body.innerHTML = '<div class="error">Error al conectar con Drive. Reintente.</div>'; }
}

function renderEconomicTab() {
    const econ = activeFolio.Economico || {};
    const total = parseFloat(econ['Costo Total USD']) || 0;
    const tc = parseFloat(econ['T. Cambio']) || 1;
    document.getElementById('modalBody').innerHTML = `
        <div class="econ-grid"><div class="total-card"><label>Costo Total Estimado</label><div class="value">USD ${total.toLocaleString('es-AR', {minimumFractionDigits: 2})}</div></div>
        <div class="info-cell"><label>T. Cambio (UYU/USD)</label><div style="display:flex; gap:10px;"><input type="number" id="inputTC" value="${tc}" style="width:80px; padding:5px; background:var(--bg-main); border:1px solid var(--border); color:white; border-radius:4px;"><button class="btn-refresh" onclick="updateFX()" style="padding:5px 10px; font-size:0.8rem;">Guardar</button></div></div></div>
        <div class="group-header">Desglose de Costos</div>
        <div class="folio-details-grid" style="margin-top:10px;">
            <div class="info-cell"><label>FOB Factura</label><div>USD ${parseFloat(econ['FOB Factura Comercial'] || 0).toLocaleString()}</div></div>
            <div class="info-cell"><label>Monto Señado</label><div>USD ${parseFloat(econ['Monto Señado'] || 0).toLocaleString()}</div></div>
            <div class="info-cell"><label>Monto Balance</label><div>USD ${parseFloat(econ['Monto Balance'] || 0).toLocaleString()}</div></div>
            <div class="info-cell"><label>Flete Int.</label><div>USD ${parseFloat(econ['Flete'] || 0).toLocaleString()}</div></div>
            <div class="info-cell"><label>Despacho (UYU)</label><div>${parseFloat(econ['Despacho'] || 0).toLocaleString()}</div></div>
            <div class="info-cell"><label>Flete Nac. (UYU)</label><div>${parseFloat(econ['Flete Nacional'] || 0).toLocaleString()}</div></div>
        </div>
        <div class="group-header" style="color:var(--status-transito);">Observaciones de la IA</div>
        <div class="info-cell full-width" style="border-color:var(--status-transito);"><div>${econ['Observaciones IA'] || 'Sin notas de revisión.'}</div></div>
    `;
}

async function updateFX() {
    const tc = document.getElementById('inputTC').value;
    const btn = document.querySelector('.econ-grid .btn-refresh'); btn.disabled = true; btn.innerText = '...';
    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'updateFX', folioId: activeFolio.Folio, tc: tc }) });
        if ((await res.json()).success) { alert('T. Cambio actualizado.'); await loadData(); activeFolio = allData.find(f => f.Folio.toString() === activeFolio.Folio.toString()); renderEconomicTab(); }
    } catch (e) { alert('Error al actualizar.'); } finally { btn.disabled = false; btn.innerText = 'Guardar'; }
}

function triggerUpload(t) {
    const i = document.createElement('input'); i.type = 'file'; i.onchange = async (e) => {
        const file = e.target.files[0]; const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = async () => {
            const base64 = reader.result.split(',')[1]; await uploadFile(base64, file.name, file.type, t);
        };
    }; i.click();
}

async function uploadFile(base64, filename, mimeType, docType) {
    const body = document.getElementById('modalBody');
    body.innerHTML = '<div class="loading"><i class="fa-solid fa-brain fa-spin"></i> La IA está analizando el documento...</div>';
    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'uploadFile', folioId: activeFolio.Folio, fileBase64: base64, filename: filename, mimeType: mimeType, docType: docType }) });
        if ((await res.json()).success) { alert('Documento procesado.'); await loadData(); activeFolio = allData.find(f => f.Folio.toString() === activeFolio.Folio.toString()); renderDocsTab(); }
    } catch (e) { alert('Error en la subida.'); renderDocsTab(); }
}
