let SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxASsSOlKEpgjtiC2CG9gviznG88tCGwPkbFhoCsDrpxMy7VW2A-1ThDHzagfDyrUJI/exec';
let folios = [];
let allData = []; // Backup for searching
let currentFilter = 'all';
let currentTab = 'import';

// --- UTILIDADES ---
const getVal = (obj, keywords) => {
    if (!obj) return '';
    for (let k of keywords) {
        const foundKey = Object.keys(obj).find(key => key.toLowerCase().trim() === k.toLowerCase().trim());
        if (foundKey && obj[foundKey] && obj[foundKey].toString().trim() !== '') return obj[foundKey];
    }
    return '';
};

const getStatusCode = (statusText) => {
    let txt = (statusText || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    if (txt.includes('producci') || txt.includes('fabrica') || txt === 'confirmado' || txt.includes('produccion')) return 'produccion';
    if (txt.includes('transito') || txt.includes('embarcado') || txt.includes('viaje') || txt.includes('nave')) return 'transito';
    if (txt.includes('aduana') || txt.includes('puerto') || txt.includes('despacho')) return 'aduana';
    if (txt.includes('deposito') || txt.includes('aurora') || txt.includes('recibido') || txt.includes('stock')) return 'deposito';
    return 'desconocido'; 
};

const getStatusBadgeHtml = (status) => {
    const code = getStatusCode(status);
    let icon = '';
    switch(code) {
        case 'produccion': icon = 'fa-gears'; break;
        case 'transito': icon = 'fa-ship'; break;
        case 'aduana': icon = 'fa-building-flag'; break;
        case 'deposito': icon = 'fa-warehouse'; break;
    }
    return `<span class="status-badge status-${code}"><i class="fa-solid ${icon}"></i> ${status || 'Sin Estado'}</span>`;
};

// --- NAVEGACIÓN ---
window.switchView = (tab) => {
    currentTab = tab;
    currentFilter = 'all';
    
    // UI Updates
    document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
    const activeLi = document.getElementById('nav-' + tab) || document.getElementById('nav-dashboard');
    if(activeLi) activeLi.classList.add('active');

    // Show/Hide Dashboard Stats only for 'import'
    const statsGrid = document.querySelector('.stats-grid');
    const headerTitle = document.querySelector('.header-title h1');
    const headerP = document.querySelector('.header-title p');
    
    if (tab === 'import') {
        if(statsGrid) statsGrid.style.display = 'grid';
        headerTitle.innerText = "Resumen de Operaciones";
        headerP.innerText = "Monitoreo en tiempo real de importaciones activas.";
    } else {
        if(statsGrid) statsGrid.style.display = 'none';
        headerTitle.innerText = tab.charAt(0).toUpperCase() + tab.slice(1);
        headerP.innerText = `Visualización de datos avanzados de ${tab}.`;
    }

    loadData();
};

// --- BUSCADOR ---
window.handleSearch = (query) => {
    const q = query.toLowerCase().trim();
    if (!q) {
        folios = [...allData];
    } else {
        folios = allData.filter(item => {
            return Object.values(item).some(val => 
                val && val.toString().toLowerCase().includes(q)
            );
        });
    }
    renderTable();
};

// --- MOTOR DE DASHBOARD ---
const filterByStatus = (status) => {
    currentFilter = (currentFilter === status) ? 'all' : status;
    document.querySelectorAll('.stat-card').forEach(card => card.style.border = '1px solid var(--border)');
    if (currentFilter !== 'all') {
        const activeCard = Array.from(document.querySelectorAll('.stat-card')).find(c => c.querySelector('h3').innerText.toLowerCase().includes(currentFilter.substring(0,4)));
        if(activeCard) activeCard.style.border = '2px solid var(--primary)';
    }
    renderTable();
};

const updateDashboardStats = () => {
    if (currentTab !== 'import') return;
    let stats = { produccion: 0, transito: 0, adua: 0, depo: 0 };
    allData.forEach(f => {
        const statusVal = getVal(f, ['Estado Carga', 'Estado', 'Status']);
        const s = getStatusCode(statusVal);
        if(s === 'produccion') stats.produccion++;
        if(s === 'transito') stats.transito++;
        if(s === 'aduana') stats.adua++;
        if(s === 'deposito') stats.depo++;
    });
    
    document.getElementById('stat-produccion').innerText = stats.produccion;
    document.getElementById('stat-transito').innerText = stats.transito;
    document.getElementById('stat-aduana').innerText = stats.adua;
    document.getElementById('stat-deposito').innerText = stats.depo;

    const cards = document.querySelectorAll('.stat-card');
    cards[0].onclick = () => filterByStatus('produccion');
    cards[1].onclick = () => filterByStatus('transito');
    cards[2].onclick = () => filterByStatus('aduana');
    cards[3].onclick = () => filterByStatus('deposito');
};

// --- RENDERIZADO DE TABLA ---
const renderTable = () => {
    const tbody = document.getElementById('foliosTableBody');
    const thead = document.querySelector('.folios-table thead tr');
    if(!tbody || !thead) return;

    tbody.innerHTML = '';
    
    // Header dinámico según el Tab
    if (currentTab === 'import') {
        thead.innerHTML = `
            <th>Folio</th>
            <th>Proveedor</th>
            <th>Mercadería</th>
            <th>Estado</th>
            <th title="Carga">Carga</th>
            <th title="Volumen">Vol</th>
            <th title="Contenedores">Cont.</th>
            <th title="Bultos">Bultos</th>
            <th>ETA</th>
            <th>Acciones</th>
        `;
    } else {
        // Para otros tabs, mostramos las primeras 5 columnas encontradas
        if (allData.length > 0) {
            const keys = Object.keys(allData[0]).filter(k => k !== 'Economico' && k !== 'Adjunto').slice(0, 5);
            thead.innerHTML = keys.map(k => `<th>${k}</th>`).join('') + `<th>Acciones</th>`;
        }
    }

    let displayItems = folios;
    if (currentTab === 'import' && currentFilter !== 'all') {
        displayItems = folios.filter(f => getStatusCode(getVal(f, ['Estado Carga', 'Estado'])) === currentFilter);
    }

    if (displayItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="15" style="text-align:center; padding: 40px;">No se encontraron resultados.</td></tr>`;
        return;
    }

    [...displayItems].reverse().forEach((item) => {
        const originalIndex = allData.indexOf(item);
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        
        if (currentTab === 'import') {
            tr.innerHTML = `
                <td><strong>${getVal(item, ['Impo', 'Folio', 'Id']) || 'S/N'}</strong></td>
                <td>${getVal(item, ['Proveedor']) || '-'}</td>
                <td>${(getVal(item, ['Mercaderia', 'Articulo']) || '-').substring(0, 25)}...</td>
                <td>${getStatusBadgeHtml(getVal(item, ['Estado Carga', 'Estado', 'Status']))}</td>
                <td>${getVal(item, ['Carga']) || '-'}</td>
                <td>${getVal(item, ['Volumen']) || '-'}</td>
                <td>${getVal(item, ['Contenedores']) || '-'}</td>
                <td>${getVal(item, ['Bultos']) || '-'}</td>
                <td>${getVal(item, ['ETA', 'ETA previsto']) || '-'}</td>
                <td><button class="action-btn" onclick="openModal(${originalIndex}, event)"><i class="fa-solid fa-arrow-right"></i></button></td>
            `;
        } else {
            const keys = Object.keys(item).filter(k => k !== 'Economico' && k !== 'Adjunto').slice(0, 5);
            tr.innerHTML = keys.map(k => `<td>${item[k] || '-'}</td>`).join('') + 
                           `<td><button class="action-btn" onclick="openGenericModal(${originalIndex}, event)"><i class="fa-solid fa-eye"></i></button></td>`;
        }
        
        tr.onclick = (e) => {
            if (currentTab === 'import') openModal(originalIndex);
            else openGenericModal(originalIndex);
        };
        tbody.appendChild(tr);
    });
};

const loadData = async () => {
    const tbody = document.getElementById('foliosTableBody');
    const syncBtn = document.getElementById('syncDataBtn');
    if(syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Actualizando...';

    if(tbody) tbody.innerHTML = '<tr><td colspan="15" style="text-align:center; padding: 40px;"><i class="fa-solid fa-sync fa-spin"></i> Cargando datos...</td></tr>';
    
    try {
        const url = `${SCRIPT_URL}?tab=${currentTab}`;
        const res = await fetch(url, { method: 'GET', redirect: 'follow' });
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        
        allData = data || [];
        folios = [...allData];

        renderTable();
        if (currentTab === 'import') updateDashboardStats();

    } catch (e) {
        console.error("Connection Error:", e);
        if(tbody) tbody.innerHTML = `<tr><td colspan="15" style="text-align:center; color:red; padding:20px;">Error: ${e.message} <button onclick="loadData()">Reintentar</button></td></tr>`;
    } finally {
        if(syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-sync"></i> Actualizar datos';
    }
};

// --- MODALES ---
window.openModal = (index, event) => {
    if(event) event.stopPropagation();
    const folio = allData[index];
    if(!folio) return;

    document.getElementById('modalFolioId').innerText = getVal(folio, ['Impo', 'Folio', 'Id']) || 'S/N';
    document.getElementById('modalStatusBadge').innerHTML = getStatusBadgeHtml(getVal(folio, ['Estado Carga', 'Estado', 'Status']));

    const dynamicContainer = document.getElementById('modalDynamicData');
    const GROUPS = [
        { title: 'Pedido y Producto', icon: 'fa-box', keys: ['Impo', 'Proveedor', 'Mercaderia'] },
        { title: 'Logística', icon: 'fa-truck', keys: ['Origen', 'Incoterm', 'ETD', 'ETA', 'Carga', 'Volumen', 'Contenedores', 'Bultos'] },
        { title: 'Gestión', icon: 'fa-clipboard-list', keys: ['Estado Carga', 'Confirmacion Pedido', 'Zureo', 'LP'] }
    ];
    
    let html = '';
    GROUPS.forEach(g => {
        let cells = '';
        g.keys.forEach(k => {
            const val = getVal(folio, [k, k.toLowerCase()]);
            if(val) cells += `<div class="info-cell"><label>${k}</label><div>${val}</div></div>`;
        });
        if(cells) html += `<div class="group-header"><i class="fa-solid ${g.icon}"></i> ${g.title}</div>${cells}`;
    });
    dynamicContainer.innerHTML = html;

    renderEconomicTab(folio);
    renderDocsTab(getVal(folio, ['Impo']), getVal(folio, ['Adjunto', 'Documentos']));
    updateTracker(getStatusCode(getVal(folio, ['Estado Carga', 'Estado'])));
    switchTab('tab-general');
    document.getElementById('folioModal').classList.add('active');
};

window.openGenericModal = (index, event) => {
    if(event) event.stopPropagation();
    const item = allData[index];
    alert(JSON.stringify(item, null, 2)); // Placeholder para vista genérica
};

const renderEconomicTab = (folio) => {
    const container = document.getElementById('tab-economico');
    if(!container) return;
    const econ = folio.Economico || {};
    const docs = JSON.parse(getVal(folio, ['Adjunto']) || '{}');

    // Lógica avanzada de FOB: Factura o Proforma
    const fobVal = econ['FOB Fac. Comercial'] || econ['FOB Proforma'] || '-';
    const hasFob = fobVal !== '-';

    // Pagos
    const sena = parseFloat(econ['Monto Señado'] || 0);
    const balance = parseFloat(econ['Monto Balance'] || 0);
    const pagado = sena + balance;

    // Saldo
    let saldo = "-";
    if (hasFob) {
        const totalFob = parseFloat(fobVal.toString().replace(/[^0-9.]/g, '')) || 0;
        saldo = (totalFob - pagado).toFixed(2);
    }

    const rows = [
        { l: 'FOB (Factura/Proforma)', v: fobVal, i: 'fa-tag' },
        { l: 'Swift Seña', v: econ['Monto Señado'], i: 'fa-clock-rotate-left' },
        { l: 'Swift Balance', v: econ['Monto Balance'], i: 'fa-receipt' },
        { l: 'Total Pagado', v: pagado > 0 ? pagado.toFixed(2) : '-', i: 'fa-wallet', highlight: true },
        { l: 'Saldo a Pagar', v: saldo, i: 'fa-hand-holding-dollar', alert: saldo > 0 },
        { l: 'Flete Internacional', v: econ['Flete Int.'], i: 'fa-ship' },
        { l: 'Despacho', v: econ['Despacho'], i: 'fa-building-columns' }
    ];

    let grid = '<div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">';
    rows.forEach(r => { 
        if(r.v && r.v !== '-') {
            const style = r.highlight ? 'background: var(--primary-light); color: white;' : (r.alert ? 'background: #fff3cd; color: #856404;' : '');
            grid += `<div class="econ-card" style="${style}"><i class="fa-solid ${r.i}"></i><div><label>${r.l}</label><div>${r.v} USD</div></div></div>`;
        }
    });
    grid += '</div>';

    container.innerHTML = `
        ${grid}
        <div class="total-banner">
            <div><label>COSTO TOTAL ESTIMADO (C.F.O)</label></div>
            <div class="total-value">USD ${econ['Costo Total USD'] || '0.00'}</div>
        </div>
        <p style="font-size: 0.8rem; margin-top: 10px; color: var(--text-muted);"><i class="fa-solid fa-info-circle"></i> El saldo se calcula restando la Seña y el Balance al valor FOB de la Factura o Proforma.</p>
    `;
};

const renderDocsTab = (folioId, adjString) => {
    const container = document.getElementById('docsGridContainer');
    container.innerHTML = '';
    let docs = {};
    try { docs = JSON.parse(adjString || '{}'); } catch(e) {}
    
    // Lista de documentos que buscamos
    const DOC_TYPES = [
        { name: "Proforma Invoice", icon: "fa-file-invoice" },
        { name: "Factura comercial", icon: "fa-file-invoice" },
        { name: "Comprobante de seña", icon: "fa-receipt" },
        { name: "Comprobante de balance", icon: "fa-receipt" },
        { name: "Factura de flete internacional", icon: "fa-ship" },
        { name: "DUA", icon: "fa-file-shield" },
        { name: "Packing list", icon: "fa-list-check" },
        { name: "BL", icon: "fa-anchor" }
    ];

    DOC_TYPES.forEach(doc => {
        const file = docs[doc.name];
        const cleanId = doc.name.replace(/\s/g, '');
        const isDrive = file && file.isDrive;

        container.innerHTML += `
            <div class="doc-box">
                <h4><i class="fa-solid ${doc.icon}"></i> ${doc.name}</h4>
                ${file ? `
                    <div class="doc-active">
                        <i class="fa-solid ${isDrive ? 'fa-cloud' : 'fa-file-pdf'}"></i> 
                        <span>${isDrive ? 'Detectado en Drive' : 'Cargado'}</span>
                    </div>
                    <div class="doc-actions">
                        <a href="${file.url}" target="_blank" class="btn-sm"><i class="fa-solid fa-eye"></i> Ver</a>
                        ${!isDrive ? `<button onclick="deleteDocument('${folioId}', '${doc.name}')" class="btn-sm btn-danger"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </div>
                ` : `
                    <div class="doc-pending">No detectado</div>
                    <button class="btn-primary btn-full" onclick="document.getElementById('in-${cleanId}').click()"><i class="fa-solid fa-upload"></i> Subir Manual</button>
                `}
                <input type="file" id="in-${cleanId}" style="display:none" onchange="uploadToDrive('${folioId}', '${doc.name}', this)">
            </div>
        `;
    });
};

window.uploadToDrive = async (folioId, docType, input) => {
    const file = input.files[0]; if(!file) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active'; overlay.style.zIndex = '9999';
    overlay.innerHTML = `<div class="loader-box"><i class="fa-solid fa-brain fa-spin"></i><h3>Analizando ${docType}...</h3><p>Extrayendo datos con IA...</p></div>`;
    document.body.appendChild(overlay);
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const payload = { 
                action: 'uploadFile', 
                folioId: folioId.toString(), 
                docType, 
                filename: file.name, 
                mimeType: file.type, 
                fileBase64: reader.result.split(',')[1] 
            };
            console.log("Enviando payload a:", SCRIPT_URL);
            const res = await fetch(SCRIPT_URL, { 
                method: 'POST', 
                body: JSON.stringify(payload), 
                redirect: 'follow',
                mode: 'cors' 
            });
            
            if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
            const data = await res.json();
            overlay.remove();
            if(data.success) { 
                alert("¡Documento procesado con éxito!"); 
                loadData(); 
                closeAllModals(); 
            } else {
                throw new Error(data.error || "Error en el servidor");
            }
        } catch(e) { 
            overlay.remove(); 
            console.error("Upload Error Details:", e);
            alert("Error al subir archivo: " + e.message + "\n\nTip: Asegúrate de que el script en Google esté publicado para 'Cualquiera' (Anyone)."); 
        }
    };
    reader.readAsDataURL(file);
};

window.deleteDocument = async (folioId, docType) => {
    if(!confirm(`¿Eliminar ${docType}?`)) return;
    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteFile', folioId: folioId.toString(), docType }), redirect: 'follow' });
        const data = await res.json();
        if(data.success) { loadData(); closeAllModals(); }
    } catch(e) { alert("Error."); }
};

window.switchTab = (id) => {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active-tab'); b.style.borderBottom = 'none'; b.style.color = 'var(--text-muted)'; });
    document.getElementById(id).style.display = 'block';
    const btn = document.getElementById('btn-' + id);
    if(btn) { btn.classList.add('active-tab'); btn.style.borderBottom = '3px solid var(--primary)'; btn.style.color = 'white'; }
};

const updateTracker = (code) => {
    const steps = ['produccion', 'transito', 'aduana', 'deposito'];
    const idx = steps.indexOf(code);
    steps.forEach((s, i) => {
        const stepEl = document.getElementById('track-' + s);
        if(stepEl) stepEl.classList.toggle('active', idx >= i || s === 'produccion');
        const lineEl = document.getElementById('line-' + (i+1));
        if(lineEl) lineEl.classList.toggle('active', idx > i);
    });
};

const closeAllModals = () => document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));

// Event Listeners
document.getElementById('closeModalBtn').onclick = closeAllModals;
document.getElementById('modalCloseActionBtn').onclick = closeAllModals;
document.getElementById('newFolioBtn').onclick = () => document.getElementById('newFolioModal').classList.add('active');
document.getElementById('closeNewFolioBtn').onclick = closeAllModals;
document.getElementById('cancelNewFolioBtn').onclick = closeAllModals;
document.querySelectorAll('.modal-overlay').forEach(o => o.onclick = (e) => { if(e.target === o) closeAllModals(); });

document.getElementById('saveNewFolioBtn').onclick = async (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    const oldHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
    const payload = { id: (allData.length + 100).toString(), supplier: document.getElementById('inputSupplier').value, description: document.getElementById('inputDescription').value, purchaseDate: document.getElementById('inputPurchaseDate').value, status: "En Producción" };
    try {
        const res = await fetch(SCRIPT_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload), 
            redirect: 'follow',
            mode: 'cors'
        });
        const data = await res.json();
        if(data.success) { 
            document.getElementById('newFolioForm').reset(); 
            loadData(); 
            closeAllModals(); 
        } else {
            alert("Error: " + data.error);
        }
    } catch(e) { 
        console.error("Save Folio Error:", e);
        alert("Error al crear folio: " + e.message); 
    } finally { 
        btn.disabled = false; 
        btn.innerHTML = oldHtml; 
    }
};

document.addEventListener('DOMContentLoaded', loadData);
