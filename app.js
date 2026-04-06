let SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxQ_8s9ykJOpErTxj_VvYjCxycyxOcfolylnLtTvGLyuIf8Mv3PFIf-bQ6aS8N9jZZG/exec';
let folios = [];
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

// --- CARGA DE DATOS ---
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
        alert("Error de conexión con el ERP. Verifique los permisos del script.");
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-sync"></i> Actualizar';
        btn.disabled = false;
    }
}

function updateDashboard() {
    const stats = {
        'En Producción': { count: 0, val: 0 },
        'En Tránsito': { count: 0, val: 0 },
        'Aduana': { count: 0, val: 0 },
        'Depósito': { count: 0, val: 0 }
    };

    allData.forEach(f => {
        const status = f.Estado || 'En Producción';
        const fob = parseFloat(f.Economico?.['FOB Factura Comercial']) || 0;
        
        if (stats[status]) {
            stats[status].count++;
            stats[status].val += fob;
        }
    });

    Object.keys(stats).forEach(key => {
        const baseId = key.toLowerCase().replace('en ', '').replace('ó', 'o');
        const countEl = document.getElementById(`count-${baseId}`);
        const valEl = document.getElementById(`val-${baseId}`);
        if (countEl) countEl.innerText = stats[key].count;
        if (valEl) valEl.innerText = `USD ${stats[key].val.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    });
}

// --- FILTROS Y BÚSQUEDA ---
function filterByStatus(status) {
    currentFilter = status;
    const tag = document.getElementById('activeFilterTag');
    tag.style.display = 'inline-flex';
    tag.innerHTML = `Mostrando: ${status} <i class="fa-solid fa-xmark" onclick="clearFilter()"></i>`;
    applyCurrentState();
}

function clearFilter() {
    currentFilter = 'all';
    document.getElementById('activeFilterTag').style.display = 'none';
    applyCurrentState();
}

function handleSearch(val) {
    applyCurrentState(val.toLowerCase());
}

function applyCurrentState(searchTerm = '') {
    let filtered = [...allData];

    if (currentFilter !== 'all') {
        filtered = filtered.filter(f => f.Estado === currentFilter);
    }

    if (searchTerm) {
        filtered = filtered.filter(f => 
            f.Folio.toLowerCase().includes(searchTerm) || 
            f.Proveedor.toLowerCase().includes(searchTerm) || 
            f.Mercaderia.toLowerCase().includes(searchTerm)
        );
    }

    // Aplicar Ordenamiento
    filtered.sort((a, b) => {
        let valA = a[sortConfig.key] || '';
        let valB = b[sortConfig.key] || '';

        // Detectar si es fecha o número
        if (sortConfig.key.includes('Fecha') || sortConfig.key === 'ETA') {
            valA = new Date(valA.split('/').reverse().join('-')) || 0;
            valB = new Date(valB.split('/').reverse().join('-')) || 0;
        } else if (!isNaN(parseFloat(valA)) && isFinite(valA)) {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        } else {
            valA = valA.toString().toLowerCase();
            valB = valB.toString().toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    renderTable(filtered);
}

// --- TABLA ---
function sortTable(key) {
    if (sortConfig.key === key) {
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortConfig.key = key;
        sortConfig.direction = 'asc';
    }
    applyCurrentState();
}

function renderTable(data) {
    const tbody = document.getElementById('foliosTableBody');
    tbody.innerHTML = '';

    data.forEach(f => {
        const fobFormatted = f.Economico?.['FOB Factura Comercial'] ? 
            `USD ${parseFloat(f.Economico['FOB Factura Comercial']).toLocaleString()}` : '-';
        
        const completitudClass = (f.Economico?.['Estado Completitud'] || 'Incompleta').toLowerCase().replace(' ', '-');

        const tr = document.createElement('tr');
        tr.onclick = () => openFolioModal(f.Folio);
        tr.innerHTML = `
            <td><strong>#${f.Folio}</strong></td>
            <td>${f.Proveedor}</td>
            <td>${f.Mercaderia}</td>
            <td><span class="status-badge status-${f.Estado?.toLowerCase().replace(' ', '-') || 'produccion'}">${f.Estado}</span></td>
            <td>${f['Fecha Compra'] || '-'}</td>
            <td>${f.ETA || '-'}</td>
            <td><span class="text-primary font-bold">${fobFormatted}</span></td>
            <td><span class="badge-${completitudClass}">${f.Economico?.['Estado Completitud'] || 'Incompleta'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- MODAL ---
function openFolioModal(folioId) {
    activeFolio = allData.find(f => f.Folio.toString() === folioId.toString());
    if (!activeFolio) return;

    document.getElementById('modalFolioId').innerText = `Folio #${activeFolio.Folio}`;
    document.getElementById('modalStatus').innerText = activeFolio.Estado;
    document.getElementById('modalStatus').className = `badge status-${activeFolio.Estado?.toLowerCase().replace(' ', '-')}`;
    
    switchModalTab('general');
    document.getElementById('folioModal').classList.add('active');
}

function switchModalTab(tabName) {
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(btn => btn.classList.toggle('active', btn.innerText.toLowerCase().includes(tabName.slice(0,3))));
    
    const body = document.getElementById('modalBody');
    body.innerHTML = '<div class="loading">Cargando...</div>';

    setTimeout(() => {
        if (tabName === 'general') renderGeneralTab();
        else if (tabName === 'tracking') renderTrackingTab();
        else if (tabName === 'docs') renderDocsTab();
        else if (tabName === 'economic') renderEconomicTab();
    }, 100);
}

function renderGeneralTab() {
    const body = document.getElementById('modalBody');
    body.innerHTML = `
        <div class="folio-details-grid">
            <div class="info-cell"><label>Proveedor</label><div>${activeFolio.Proveedor}</div></div>
            <div class="info-cell"><label>Mercadería</label><div>${activeFolio.Mercaderia}</div></div>
            <div class="info-cell"><label>Incoterm</label><div>${activeFolio.Incoterm || '-'}</div></div>
            <div class="info-cell"><label>Fecha Compra</label><div>${activeFolio['Fecha Compra']}</div></div>
            <div class="info-cell"><label>Carga</label><div>${activeFolio.Carga || '-'}</div></div>
            <div class="info-cell"><label>Volumen</label><div>${activeFolio.Volumen || '-'}</div></div>
            <div class="info-cell full-width"><label>Observaciones Operativas</label><div>${activeFolio.Observaciones || 'Sin observaciones.'}</div></div>
        </div>
    `;
}

function renderTrackingTab() {
    const body = document.getElementById('modalBody');
    const steps = [
        { name: 'Producción', icon: 'fa-industry', status: 'En Producción' },
        { name: 'Tránsito', icon: 'fa-ship', status: 'En Tránsito' },
        { name: 'Aduana', icon: 'fa-building-shield', status: 'Aduana' },
        { name: 'Depósito', icon: 'fa-warehouse', status: 'Depósito' }
    ];

    let currentIdx = steps.findIndex(s => s.status === activeFolio.Estado);
    if (currentIdx === -1) currentIdx = 0;

    let timelineHtml = '<div class="timeline">';
    steps.forEach((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isActive = idx === currentIdx;
        timelineHtml += `
            <div class="timeline-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}">
                <div class="timeline-dot"><i class="fa-solid ${step.icon}"></i></div>
                <div class="timeline-content">
                    <div class="timeline-date">${isActive ? 'Estado Actual' : (isCompleted ? 'Completado' : 'Pendiente')}</div>
                    <h4>${step.name}</h4>
                    <p>${isActive ? 'El folio se encuentra actualmente en este proceso.' : ''}</p>
                </div>
            </div>
        `;
    });
    timelineHtml += '</div>';
    body.innerHTML = timelineHtml;
}

function renderDocsTab() {
    const body = document.getElementById('modalBody');
    const driveFiles = JSON.parse(activeFolio.Adjuntos_Drive || '{}');
    const docTypes = [
        "Factura comercial", "Proforma", "Comprobante de seña", "Comprobante de balance", 
        "Factura de flete internacional", "DUA", "Factura de flete nacional"
    ];

    let html = `<h3>Gestión Documental Automática (Drive)</h3><div class="docs-list">`;
    
    docTypes.forEach(type => {
        const file = Object.keys(driveFiles).find(name => name.toLowerCase().includes(type.toLowerCase()));
        if (file) {
            html += `
                <div class="doc-card">
                    <div class="doc-icon pdf"><i class="fa-solid fa-file-pdf"></i></div>
                    <div class="doc-info">
                        <h4>${type}</h4>
                        <span>${file}</span>
                    </div>
                    <a href="${driveFiles[file].url}" target="_blank" class="icon-btn"><i class="fa-solid fa-eye"></i></a>
                </div>
            `;
        } else {
            html += `
                <div class="doc-card pending">
                    <div class="doc-icon pdf-pending"><i class="fa-solid fa-file-arrow-up"></i></div>
                    <div class="doc-info">
                        <h4>${type}</h4>
                        <span>Pendiente de carga en Drive</span>
                    </div>
                    <button class="upload-btn" onclick="triggerUpload('${type}')">Subir</button>
                </div>
            `;
        }
    });

    html += '</div>';
    body.innerHTML = html;
}

function renderEconomicTab() {
    const body = document.getElementById('modalBody');
    const econ = activeFolio.Economico || {};
    const total = parseFloat(econ['Costo Total USD']) || 0;
    const tc = parseFloat(econ['T. Cambio']) || 1;

    body.innerHTML = `
        <div class="econ-grid">
            <div class="total-card">
                <label>Costo Total Estimado</label>
                <div class="value">USD ${total.toLocaleString('es-AR', {minimumFractionDigits: 2})}</div>
            </div>
            <div class="info-cell">
                <label>Tipo de Cambio (UYU/USD)</label>
                <div style="display:flex; gap:10px; align-items:center;">
                    <input type="number" id="inputTC" value="${tc}" style="width:80px; padding:5px; background:var(--bg-main); border:1px solid var(--border); color:white; border-radius:4px;">
                    <button class="btn-refresh" onclick="updateFX()" style="padding:5px 10px; font-size:0.8rem;">Guardar</button>
                </div>
                <small style="color:var(--text-muted); margin-top:5px; display:block;">Se utiliza para convertir Despacho y Flete Nacional.</small>
            </div>
        </div>

        <div class="group-header" style="margin-top:20px;">Desglose de Costos</div>
        <div class="folio-details-grid" style="margin-top:10px;">
            <div class="info-cell"><label>FOB Factura</label><div>USD ${parseFloat(econ['FOB Factura Comercial'] || 0).toLocaleString()}</div></div>
            <div class="info-cell"><label>Monto Señado</label><div>USD ${parseFloat(econ['Monto Señado'] || 0).toLocaleString()}</div></div>
            <div class="info-cell"><label>Monto Balance</label><div>USD ${parseFloat(econ['Monto Balance'] || 0).toLocaleString()}</div></div>
            <div class="info-cell"><label>Flete Int.</label><div>USD ${parseFloat(econ['Flete'] || 0).toLocaleString()}</div></div>
            <div class="info-cell"><label>Despacho</label><div>${parseFloat(econ['Despacho'] || 0).toLocaleString()} ${econ['Moneda'] || ''}</div></div>
            <div class="info-cell"><label>Flete Nacional</label><div>${parseFloat(econ['Flete Nacional'] || 0).toLocaleString()} ${econ['Moneda'] || ''}</div></div>
        </div>

        <div class="group-header" style="margin-top:20px; color:var(--status-transito);">Observaciones de la IA</div>
        <div class="info-cell full-width" style="border-color:var(--status-transito);">
            <div>${econ['Observaciones IA'] || 'Sin notas de revisión.'}</div>
        </div>
    `;
}

// --- ACCIONES BACKEND ---
async function updateFX() {
    const tc = document.getElementById('inputTC').value;
    const btn = document.querySelector('.econ-grid .btn-refresh');
    btn.disabled = true;
    btn.innerText = '...';

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'updateFX', folioId: activeFolio.Folio, tc: tc })
        });
        const result = await res.json();
        if (result.success) {
            alert('Tipo de cambio actualizado. Recalculando...');
            await loadData();
            // Re-abrir folio para ver cambios
            activeFolio = allData.find(f => f.Folio.toString() === activeFolio.Folio.toString());
            renderEconomicTab();
        }
    } catch (e) {
        alert('Error al actualizar tipo de cambio.');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Guardar';
    }
}

function triggerUpload(docType) {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = reader.result.split(',')[1];
            await uploadFile(base64, file.name, file.type, docType);
        };
    };
    input.click();
}

async function uploadFile(base64, filename, mimeType, docType) {
    const body = document.getElementById('modalBody');
    body.innerHTML = '<div class="loading"><i class="fa-solid fa-brain fa-spin"></i> La IA está analizando el documento...</div>';

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'uploadFile',
                folioId: activeFolio.Folio,
                fileBase64: base64,
                filename: filename,
                mimeType: mimeType,
                docType: docType
            })
        });
        const result = await res.json();
        if (result.success) {
            alert('Documento procesado con éxito.');
            await loadData();
            activeFolio = allData.find(f => f.Folio.toString() === activeFolio.Folio.toString());
            renderDocsTab();
        }
    } catch (e) {
        alert('Error en la subida.');
        renderDocsTab();
    }
}
