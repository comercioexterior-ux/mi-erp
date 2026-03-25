// app.js - ERP DISER SAS (UNIFIED VERSION V3)

// Por favor, si el script web cambia al moverlo a "operativa", actualizalo aquí
let SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzxJSnuLvphh5V7SIVVBnQa5BHFj86B3C9CUwilMAdrP6g1WPjr4DitgaqPx-mJOlnn/exec';
let folios = [];
let currentFilter = 'all';

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

// --- MOTOR DE DASHBOARD ---
const filterByStatus = (status) => {
    currentFilter = (currentFilter === status) ? 'all' : status;
    
    // UI Active State for Cards
    document.querySelectorAll('.stat-card').forEach(card => card.style.border = '1px solid var(--border)');
    if (currentFilter !== 'all') {
        const activeCard = Array.from(document.querySelectorAll('.stat-card')).find(c => c.querySelector('h3').innerText.toLowerCase().includes(currentFilter.substring(0,4)));
        if(activeCard) activeCard.style.border = '2px solid var(--primary)';
    }
    
    renderTable();
    document.querySelector('.folios-section').scrollIntoView({ behavior: 'smooth' });
};

const updateDashboardStats = () => {
    let stats = { produccion: 0, transito: 0, adua: 0, depo: 0 };
    folios.forEach(f => {
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

    // Attach Click Events
    const cards = document.querySelectorAll('.stat-card');
    cards[0].onclick = () => filterByStatus('produccion');
    cards[1].onclick = () => filterByStatus('transito');
    cards[2].onclick = () => filterByStatus('aduana');
    cards[3].onclick = () => filterByStatus('deposito');
};

// --- RENDERIZADO DE TABLA ---
const renderTable = () => {
    const tbody = document.getElementById('foliosTableBody');
    tbody.innerHTML = '';
    
    let displayFolios = folios;
    if (currentFilter !== 'all') {
        displayFolios = folios.filter(f => getStatusCode((f['Estado Carga'] || '') + ' ' + (f['Estado'] || '')) === currentFilter);
    }

    if (displayFolios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 40px;">No hay folios en "${currentFilter}".</td></tr>`;
        return;
    }

    [...displayFolios].reverse().forEach((folio) => {
        const originalIndex = folios.indexOf(folio);
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.innerHTML = `
            <td><strong>${getVal(folio, ['Impo', 'Folio', 'Id']) || 'S/N'}</strong></td>
            <td>${getVal(folio, ['Proveedor']) || '-'}</td>
            <td>${(getVal(folio, ['Mercaderia', 'Articulo']) || '-').substring(0, 40)}</td>
            <td>${getStatusBadgeHtml(getVal(folio, ['Estado Carga', 'Estado', 'Status']))}</td>
            <td>${getVal(folio, ['ETA', 'ETA previsto', 'Fecha Arribo']) || '-'}</td>
            <td><button class="action-btn" onclick="openModal(${originalIndex}, event)"><i class="fa-solid fa-arrow-right"></i></button></td>
        `;
        tr.onclick = () => openModal(originalIndex);
        tbody.appendChild(tr);
    });
};

const loadData = async () => {
    const tbody = document.getElementById('foliosTableBody');
    const loadingHtml = '<tr><td colspan="6" style="text-align:center; padding: 40px;"><i class="fa-solid fa-sync fa-spin"></i> Conectando con Google Sheets...</td></tr>';
    if(tbody) tbody.innerHTML = loadingHtml;
    
    try {
        console.log("Fetching from:", SCRIPT_URL);
        const res = await fetch(SCRIPT_URL, { 
            method: 'GET',
            redirect: 'follow'
        });
        
        const data = await res.json();
        console.log("Full Data received:", data);
        
        if (data.error) throw new Error(data.error);
        
        // Normalización extra en el frontend por seguridad
        folios = (data || []).map(item => {
            // Si el item es un array (poco probable con mi backend actual pero posible), lo ignoramos
            if (Array.isArray(item)) return null;
            return item;
        }).filter(f => f && (f['Impo'] || f['impo'] || f['Folio']));

        console.log("Processed Folios:", folios);

        if (folios.length === 0) {
            if(tbody) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 40px;">
                    <i class="fa-solid fa-database"></i> La conexión fue exitosa, pero no se encontraron folios.<br>
                    <small>Asegúrate de tener datos en la pestaña "operativa" bajo la columna "Impo".</small>
                </td></tr>`;
            }
        } else {
            renderTable();
            updateDashboardStats();
        }
    } catch (e) {
        console.error("Connection Error:", e);
        if(tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red; padding: 20px;">
                <i class="fa-solid fa-circle-exclamation"></i> Error de conexión.<br>
                <small>${e.message}</small><br>
                <button onclick="loadData()" class="btn-sm" style="margin-top:10px;">Reintentar</button>
            </td></tr>`;
        }
    }
};

// --- FICHA DEL FOLIO (MODAL INTEGRAL) ---
window.openModal = (index, event) => {
    if(event) event.stopPropagation();
    const folio = folios[index];
    if(!folio) return;

    document.getElementById('modalFolioId').innerText = getVal(folio, ['Impo', 'Folio', 'Id']) || 'S/N';
    
    const badgeContainer = document.getElementById('modalStatusBadge');
    badgeContainer.innerHTML = getStatusBadgeHtml(getVal(folio, ['Estado Carga', 'Estado', 'Status']));

    // 1. Info General
    const dynamicContainer = document.getElementById('modalDynamicData');
    dynamicContainer.innerHTML = '';
    const GROUPS = [
        { title: 'Pedido y Producto', icon: 'fa-box', keys: ['Impo', 'Confirmacion', 'Proveedor', 'Mercaderia'] },
        { title: 'Logística', icon: 'fa-truck', keys: ['Origen', 'Incoterm', 'ETD', 'ETA', 'Arriba en (dias)'] },
        { title: 'Gestión', icon: 'fa-clipboard-list', keys: ['Estado Carga', 'Confirmacion Pedido', 'Zureo', 'LP'] }
    ];
    
    let html = '';
    GROUPS.forEach(g => {
        let cells = '';
        g.keys.forEach(k => {
            const val = getVal(folio, [k, k.toLowerCase(), k.toUpperCase()]);
            if(val) cells += `<div class="info-cell"><label>${k}</label><div>${val}</div></div>`;
        });
        if(cells) html += `<div class="group-header"><i class="fa-solid ${g.icon}"></i> ${g.title}</div>${cells}`;
    });
    dynamicContainer.innerHTML = html;

    // 2. Resumen Económico
    renderEconomicTab(folio.Economico);

    // 3. Documentos
    renderDocsTab(folio['Impo'], folio['Adjunto'] || folio['Documentos']);

    updateTracker(getStatusCode(folio['Estado Carga'] || folio['Estado']));
    switchTab('tab-general');
    document.getElementById('folioModal').classList.add('active');
};

const renderEconomicTab = (econ) => {
    const container = document.getElementById('tab-economico');
    if(!container) return;
    
    if(!econ) {
        container.innerHTML = `<div style="text-align:center; padding:50px; opacity:0.5;"><i class="fa-solid fa-calculator fa-3x"></i><br><br>Pendiente de análisis. Sube documentos para activar el resumen económico.</div>`;
        return;
    }

    const rows = [
        { l: 'FOB Factura', v: econ['FOB Fac. Comercial'], i: 'fa-tag' },
        { l: 'Monto Señado', v: econ['Monto Señado'], i: 'fa-clock-rotate-left' },
        { l: 'Monto Balance', v: econ['Monto Balance'], i: 'fa-wallet' },
        { l: 'Flete Internacional', v: econ['Flete Int.'], i: 'fa-ship' },
        { l: 'Despacho', v: econ['Despacho'], i: 'fa-building-columns', s: econ['Moneda Despacho'] },
        { l: 'Flete Nacional', v: econ['Flete Nacional'], i: 'fa-truck-fast', s: econ['Moneda Flete Nac.'] },
        { l: 'Tipo de Cambio', v: econ['T. Cambio (Ingresar Manual)'], i: 'fa-comments-dollar' }
    ];

    let grid = '<div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:15px;">';
    rows.forEach(r => {
        if(r.v && r.v !== '-') {
            grid += `<div class="econ-card"><i class="fa-solid ${r.i}"></i><div><label>${r.l}</label><div>${r.v} ${r.s || 'USD'}</div></div></div>`;
        }
    });
    grid += '</div>';

    container.innerHTML = `
        ${grid}
        <div class="total-banner">
            <div><label>COSTO TOTAL ESTIMADO (C.F.O)</label><span>Consolidado en Resumen Importaciones</span></div>
            <div class="total-value">USD ${econ['Costo Total USD'] || '0.00'}</div>
        </div>
        <div class="ia-obs"><i class="fa-solid fa-robot"></i> <strong>IA Notes:</strong> ${econ['Observaciones IA'] || 'Sin observaciones.'}</div>
    `;
};

// --- GESTIÓN DOCUMENTAL ---
const renderDocsTab = (folioId, adjString) => {
    const container = document.getElementById('docsGridContainer');
    container.innerHTML = '';
    let docs = {};
    try { docs = JSON.parse(adjString || '{}'); } catch(e) {}

    const DOCS = ["Factura comercial", "Comprobante de seña", "Comprobante de balance", "Factura de flete internacional", "DUA", "Factura de flete nacional", "Packing list"];
    
    DOCS.forEach(name => {
        const file = docs[name];
        const cleanId = name.replace(/\s/g, '');
        container.innerHTML += `
            <div class="doc-box">
                <h4>${name}</h4>
                ${file ? `
                    <div class="doc-active"><i class="fa-solid fa-file-pdf"></i> <span>Archivo Cargado</span></div>
                    <div class="doc-actions">
                        <a href="${file.url}" target="_blank" class="btn-sm"><i class="fa-solid fa-eye"></i></a>
                        <button onclick="document.getElementById('in-${cleanId}').click()" class="btn-sm"><i class="fa-solid fa-rotate"></i></button>
                        <button onclick="deleteDocument('${folioId}', '${name}')" class="btn-sm btn-danger"><i class="fa-solid fa-trash"></i></button>
                    </div>
                ` : `
                    <div class="doc-pending">Pendiente</div>
                    <button class="btn-primary btn-full" onclick="document.getElementById('in-${cleanId}').click()">Subir</button>
                `}
                <input type="file" id="in-${cleanId}" style="display:none" onchange="uploadToDrive('${folioId}', '${name}', this)">
            </div>
        `;
    });
};

window.uploadToDrive = async (folioId, docType, input) => {
    const file = input.files[0];
    if(!file) return;

    // UI Loading State (Improved)
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.style.zIndex = '9999';
    overlay.innerHTML = `
        <div class="loader-box">
            <i class="fa-solid fa-brain fa-spin"></i>
            <h3>Analizando ${docType}...</h3>
            <p>La IA está extrayendo los importes para el reporte económico. Por favor espera.</p>
        </div>`;
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

            const res = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                redirect: 'follow', // Critical for Apps Script redirects
                mode: 'cors'
            });
            
            const data = await res.json();
            overlay.remove();
            
            if(data.success) { 
                alert("¡Documento procesado con éxito!\n" + (data.ai_message || "")); 
                loadData(); 
                closeAllModals(); 
            } else {
                throw new Error(data.error || "Error desconocido en el servidor.");
            }
        } catch(e) { 
            overlay.remove(); 
            console.error("Upload Error:", e);
            alert("Error al subir archivo: " + e.message); 
        }
    };
    reader.onerror = () => { overlay.remove(); alert("Error al leer el archivo local."); };
    reader.readAsDataURL(file);
};

window.deleteDocument = async (folioId, docType) => {
    if(!confirm(`¿Eliminar ${docType} del folio ${folioId}?`)) return;
    try {
        const res = await fetch(SCRIPT_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'deleteFile', folioId: folioId.toString(), docType }),
            redirect: 'follow'
        });
        const data = await res.json();
        if(data.success) { loadData(); closeAllModals(); }
    } catch(e) { alert("Error al eliminar documento."); }
};

// --- UI HELPERS ---
window.switchTab = (id) => {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active-tab');
        b.style.borderBottom = 'none';
        b.style.color = 'var(--text-muted)';
    });
    
    document.getElementById(id).style.display = 'block';
    const btn = document.getElementById('btn-' + id);
    if(btn) {
        btn.classList.add('active-tab');
        btn.style.borderBottom = '3px solid var(--primary)';
        btn.style.color = 'white';
    }
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
    const btn = e.currentTarget; // Use currentTarget to ensure we get the button even if icon is clicked
    const oldHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

    const payload = {
        id: (folios.length + 100).toString(),
        supplier: document.getElementById('inputSupplier').value,
        description: document.getElementById('inputDescription').value,
        purchaseDate: document.getElementById('inputPurchaseDate').value,
        status: "En Producción"
    };

    try {
        const res = await fetch(SCRIPT_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload),
            redirect: 'follow'
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
        alert("Error al crear folio."); 
    } finally { 
        btn.disabled = false; 
        btn.innerHTML = oldHtml;
    }
};

document.addEventListener('DOMContentLoaded', loadData);
