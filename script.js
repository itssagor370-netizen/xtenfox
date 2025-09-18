/* -----------------------
   Storage & utilities
   ----------------------- */
const STORAGE_KEY = 'mobixpress_customers_v1';
function loadCustomers(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch(e){console.error(e); return []} }
function saveCustomers(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); renderAll(); }
function uid(){ return 'c_' + Math.random().toString(36).slice(2,9); }
function showToast(title, msg, timeout=2500){ const c=document.getElementById('toast-container'); const el=document.createElement('div'); el.className='toast'; el.innerHTML=`<strong style="display:block">${title}</strong><div style="opacity:0.9">${msg}</div>`; c.appendChild(el); setTimeout(()=>el.remove(), timeout); }
function escapeHtml(str){ if(!str && str !== 0) return ''; return String(str).replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]||s)); }

/* -----------------------
   Payment schedule generator
   ----------------------- */
function buildSchedule(startDateISO, tenure, emi){
    const arr = [];
    const start = startDateISO ? new Date(startDateISO) : new Date();
    for(let i=0;i<tenure;i++){
        const d = new Date(start);
        d.setMonth(start.getMonth() + i);
        const label = d.toLocaleString('default', { month:'long', year:'numeric' });
        arr.push({ monthLabel: label, amount: emi, status: 'due' });
    }
    return arr;
}

/* -----------------------
   Calculations & Stats
   ----------------------- */
function computeStats(list){
    const totalCustomers = list.length;
    const totalAmount = list.reduce((s,c)=> s + (Number(c.amount)||0), 0);
    const totalProfit = list.reduce((s,c)=> s + (Number(c.profit)||0), 0);
    const avgProfit = totalAmount ? Math.round((totalProfit/totalAmount)*100) : 0;

    let totalPaid = 0, totalDue = 0;
    list.forEach(c=>{
        (c.payments||[]).forEach(p=>{
            if (p.status === 'paid' || p.status === 'auto') totalPaid += Number(p.amount)||0;
            else totalDue += Number(p.amount)||0;
        });
    });

    return { totalCustomers, totalAmount, totalProfit, avgProfit, totalPaid, totalDue };
}

/* -----------------------
   Renderers
   ----------------------- */
function renderStats(list){
    const s = computeStats(list);
    document.getElementById('total-customers').textContent = s.totalCustomers;
    document.getElementById('total-amount').textContent = '₹' + s.totalAmount.toLocaleString();
    document.getElementById('total-profit').textContent = '₹' + s.totalProfit.toLocaleString();
    document.getElementById('avg-profit').textContent = s.avgProfit + '%';
    document.getElementById('total-paid').textContent = '₹' + s.totalPaid.toLocaleString();
    document.getElementById('total-due').textContent = '₹' + s.totalDue.toLocaleString();
}

function customerCardHTML(c){
    const start = c.startDate ? new Date(c.startDate).toLocaleDateString() : '—';
    const paymentsHtml = (c.payments||[]).map((p, idx) => {
        const isDue = p.status === 'due';
        const btns = isDue ? `<button class="small-btn small-pay" data-id="${c.id}" data-idx="${idx}" data-action="paid">Pay</button>
                              <button class="small-btn small-auto" data-id="${c.id}" data-idx="${idx}" data-action="auto">Auto</button>` :
                              `<button class="small-btn small-none" disabled>${p.status.toUpperCase()}</button>`;
        const statusClass = p.status === 'paid' ? 'status-paid' : p.status === 'auto' ? 'status-auto' : 'status-due';
        return `<div class="schedule-row">
                    <div style="flex:1">${escapeHtml(p.monthLabel)} — ₹${Number(p.amount).toLocaleString()}</div>
                    <div style="min-width:200px;display:flex;gap:6px;justify-content:flex-end;align-items:center">
                      <div class="${statusClass}">${p.status.toUpperCase()}</div>
                      ${btns}
                    </div>
                </div>`;
    }).join('');

    return `
    <div class="customer-card card" data-id="${c.id}">
        <div class="customer-name">${escapeHtml(c.customerName)}</div>
        <div class="customer-detail"><span>Investor</span><strong>${escapeHtml(c.investorName||'—')}</strong></div>
        <div class="customer-detail"><span>Device</span><strong>${escapeHtml(c.deviceModel||'—')}</strong></div>
        <div class="customer-detail"><span>Amount</span><strong>₹${Number(c.amount||0).toLocaleString()}</strong></div>
        <div class="customer-detail"><span>Profit</span><strong>₹${Number(c.profit||0).toLocaleString()}</strong></div>
        <div class="customer-detail"><span>Monthly EMI</span><strong>₹${Number(c.monthlyEmi||0).toLocaleString()}</strong></div>
        <div class="customer-detail"><span>Tenure</span><strong>${c.tenure} months</strong></div>
        <div class="customer-detail"><span>Start</span><strong>${start}</strong></div>
        <div class="customer-detail"><span>Status</span><strong style="text-transform:capitalize">${escapeHtml(c.status||'—')}</strong></div>
        <div style="margin-top:8px;color:var(--text-secondary);font-size:0.9rem">${escapeHtml(c.notes||'')}</div>

        <div class="schedule" aria-live="polite">
            ${paymentsHtml || '<div style="color:var(--text-secondary)">No schedule</div>'}
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
            <button class="btn btn-secondary btn-edit" data-id="${c.id}"><i class="fas fa-edit"></i></button>
            <button class="btn btn-secondary btn-copy" data-id="${c.id}"><i class="fas fa-copy"></i></button>
            <button class="btn btn-secondary btn-delete" data-id="${c.id}"><i class="fas fa-trash"></i></button>
        </div>
    </div>`;
}

function renderRecent(list){
    const recent = list.slice(0,6);
    document.getElementById('recent-customers').innerHTML = recent.map(customerCardHTML).join('') || '<div style="color:var(--text-secondary)">No customers yet.</div>';
    bindCustomerButtons();
}

function renderAllCustomers(list){
    document.getElementById('all-customers').innerHTML = list.map(customerCardHTML).join('') || '<div style="color:var(--text-secondary)">No customers yet.</div>';
    bindCustomerButtons();
}

function renderAll(){
    const list = loadCustomers();
    renderStats(list);
    renderRecent(list);
    // default: show all customers sorted by createdAt desc
    renderAllCustomers(list);
}

/* -----------------------
   CRUD & Form handling
   ----------------------- */
function addCustomer(c){ const list=loadCustomers(); list.unshift(c); saveCustomers(list); showToast('Saved','Customer saved'); }
function updateCustomer(id, payload){ let list=loadCustomers().map(c => c.id === id ? Object.assign({}, c, payload) : c); saveCustomers(list); showToast('Updated','Customer updated'); }
function deleteCustomer(id){ if(!confirm('Delete this customer?')) return; let list=loadCustomers().filter(c => c.id !== id); saveCustomers(list); showToast('Deleted','Customer removed'); }

/* -----------------------
   Bind buttons inside cards
   ----------------------- */
function bindCustomerButtons(){
    document.querySelectorAll('.btn-edit').forEach(b => b.onclick = e => startEdit(b.dataset.id));
    document.querySelectorAll('.btn-copy').forEach(b => b.onclick = e => copyDevice(b.dataset.id));
    document.querySelectorAll('.btn-delete').forEach(b => b.onclick = e => deleteCustomer(b.dataset.id));
    document.querySelectorAll('.small-pay, .small-auto').forEach(btn => {
        btn.onclick = (ev) => {
            const id = btn.dataset.id;
            const idx = Number(btn.dataset.idx);
            const action = btn.dataset.action; // 'paid' or 'auto'
            markPaymentAtIndex(id, idx, action);
        }
    });
}

/* -----------------------
   Payment marking
   ----------------------- */
function markPaymentAtIndex(id, idx, action){
    const list = loadCustomers();
    const c = list.find(x => x.id === id);
    if (!c) return;
    if (!c.payments || !c.payments[idx]) return;
    c.payments[idx].status = action; // 'paid' or 'auto'
    saveCustomers(list);
    showToast('Payment', `Marked ${c.customerName} / ${c.payments[idx].monthLabel} as ${action.toUpperCase()}`);
}

/* -----------------------
   Start edit
   ----------------------- */
function startEdit(id){
    const list = loadCustomers();
    const c = list.find(x => x.id === id);
    if (!c) return;
    document.getElementById('investorName').value = c.investorName || '';
    document.getElementById('customerName').value = c.customerName || '';
    document.getElementById('deviceModel').value = c.deviceModel || '';
    document.getElementById('amount').value = c.amount || '';
    document.getElementById('profit').value = c.profit || '';
    document.getElementById('startDate').value = c.startDate || '';
    document.getElementById('tenure').value = c.tenure || '';
    document.getElementById('status').value = c.status || 'active';
    document.getElementById('notes').value = c.notes || '';
    document.getElementById('customerId').value = c.id;
    document.getElementById('cancel-edit-btn').style.display = 'inline-flex';
    document.querySelector('.tab[data-tab="add-customer"]').click();
}

/* -----------------------
   Copy device model
   ----------------------- */
function copyDevice(id){
    const list = loadCustomers();
    const c = list.find(x => x.id === id);
    if (!c) return;
    navigator.clipboard?.writeText(c.deviceModel || '')
        .then(()=> showToast('Copied','Device model copied to clipboard'))
        .catch(()=> showToast('Failed','Could not copy to clipboard'));
}

/* -----------------------
   Search filter
   ----------------------- */
function applyFilters(){
    const q = document.getElementById('search-input').value.trim().toLowerCase();
    const status = document.getElementById('status-filter').value;

    const list = loadCustomers().filter(c => {
        const matchesText = (c.customerName||'').toLowerCase().includes(q) ||
                            (c.deviceModel||'').toLowerCase().includes(q) ||
                            (c.investorName||'').toLowerCase().includes(q);
        const matchesStatus = !status || c.status === status;
        return matchesText && matchesStatus;
    });
    renderAllCustomers(list);
}

/* -----------------------
   Export / Import / Clear (JSON & Excel)
   ----------------------- */
// Export JSON (full objects)
document.getElementById('export-json').addEventListener('click', ()=>{
    const data = JSON.stringify(loadCustomers(), null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mobixpress_customers_backup_' + new Date().toISOString().slice(0,19).replace(/[:T]/g,'-') + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Exported','Data exported to JSON');
});

// Import JSON (maps phone -> deviceModel for older files)
document.getElementById('import-file').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
        try {
            const data = JSON.parse(reader.result);
            if (!Array.isArray(data)) throw new Error('Invalid format');
            // Normalize imported objects
            const normalized = data.map(r => ({
                id: r.id || uid(),
                investorName: r.investorName || r.investor || r.Investor || '',
                customerName: r.customerName || r.customer || r.Customer || '',
                deviceModel: r.deviceModel || r.deviceModel || r.Device || r.phone || r.Phone || '',
                amount: Number(r.amount||r.Amount)||0,
                profit: Number(r.profit||r.Profit)||0,
                tenure: Number(r.tenure||r.Tenure)||0,
                monthlyEmi: Number(r.monthlyEmi||r.MonthlyEMI)||0,
                startDate: r.startDate || r.StartDate || '',
                status: r.status || r.Status || 'active',
                notes: r.notes || r.Notes || '',
                payments: Array.isArray(r.payments) ? r.payments : (typeof r.payments === 'string' && r.payments.trim().startsWith('[') ? JSON.parse(r.payments) : (r.Payments && typeof r.Payments === 'string' && r.Payments.trim().startsWith('[') ? JSON.parse(r.Payments) : [])),
                createdAt: r.createdAt || new Date().toISOString()
            }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
            renderAll();
            showToast('Imported','Data imported successfully');
        } catch (err) {
            console.error(err);
            showToast('Import Failed','Invalid JSON file');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

// Excel Export
document.getElementById('export-xlsx').addEventListener('click', ()=>{
    const list = loadCustomers();
    const rows = list.map(c=>({
        Investor: c.investorName||'',
        Customer: c.customerName||'',
        Device: c.deviceModel||'',
        Amount: c.amount||0,
        Profit: c.profit||0,
        Tenure: c.tenure||0,
        MonthlyEMI: c.monthlyEmi||0,
        StartDate: c.startDate||'',
        Status: c.status||'',
        Notes: c.notes||'',
        Payments: JSON.stringify(c.payments||[])
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, "mobixpress_customers.xlsx");
    showToast('Exported','Excel file created');
});

// Excel Import
document.getElementById('import-xlsx').addEventListener('change',(e)=>{
    const file=e.target.files[0];
    if(!file) return;
    const reader=new FileReader();
    reader.onload=(evt)=>{
        try {
            const data=new Uint8Array(evt.target.result);
            const workbook=XLSX.read(data,{type:'array'});
            const sheet=workbook.Sheets[workbook.SheetNames[0]];
            const rows=XLSX.utils.sheet_to_json(sheet);
            const restored=rows.map(r=>({
                id: uid(),
                investorName: r.Investor||"",
                customerName: r.Customer||"",
                deviceModel: r.Device||r.Device||"",
                phone: undefined,
                amount: Number(r.Amount)||0,
                profit: Number(r.Profit)||0,
                tenure: Number(r.Tenure)||0,
                monthlyEmi: Number(r.MonthlyEMI)||0,
                startDate: r.StartDate||"",
                status: r.Status||"active",
                notes: r.Notes||"",
                payments: (typeof r.Payments === 'string' && r.Payments.trim().startsWith('[')) ? JSON.parse(r.Payments) : (r.Payments || []),
                createdAt: new Date().toISOString()
            }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
            renderAll();
            showToast('Imported','Excel file restored');
        } catch (err) {
            console.error(err);
            showToast('Import Failed','Could not parse Excel file');
        }
    };
    reader.readAsArrayBuffer(file);
    e.target.value='';
});

// Clear All
document.getElementById('clear-all').addEventListener('click', ()=>{
    if (!confirm('This will remove ALL customers permanently. Continue?')) return;
    localStorage.removeItem(STORAGE_KEY);
    renderAll();
    showToast('Cleared','All customers removed');
});

/* -----------------------
   Form handling
   ----------------------- */
document.getElementById('customer-form').addEventListener('submit', (e)=>{
    e.preventDefault();
    const id = document.getElementById('customerId').value;
    const investorName = document.getElementById('investorName').value.trim();
    const customerName = document.getElementById('customerName').value.trim();
    const deviceModel = document.getElementById('deviceModel').value.trim();
    const amount = Number(document.getElementById('amount').value) || 0;
    const profit = Number(document.getElementById('profit').value) || 0;
    const tenure = Number(document.getElementById('tenure').value) || 0;
    const status = document.getElementById('status').value;
    const notes = document.getElementById('notes').value.trim();
    const startDateVal = document.getElementById('startDate').value;

    if (!customerName || !deviceModel || amount <= 0 || tenure <= 0) {
        showToast('Validation','Please fill required fields (Name, Device, Amount, Tenure)');
        return;
    }

    const total = amount + profit;
    const emi = tenure > 0 ? Math.ceil(total / tenure) : 0;
    const payments = buildSchedule(startDateVal, tenure, emi);

    const payload = {
        investorName, customerName, deviceModel, amount, profit, tenure,
        monthlyEmi: emi, startDate: startDateVal || new Date().toISOString().slice(0,10),
        status, notes, payments
    };

    if (id) {
        updateCustomer(id, payload);
        document.getElementById('customerId').value = '';
        document.getElementById('cancel-edit-btn').style.display = 'none';
    } else {
        payload.id = uid();
        payload.createdAt = new Date().toISOString();
        addCustomer(payload);
    }

    e.target.reset();
    document.querySelector('.tab[data-tab="customers"]').click();
});

/* -----------------------
   Clear form / cancel edit
   ----------------------- */
document.getElementById('clear-form-btn').addEventListener('click', ()=>{ document.getElementById('customer-form').reset(); document.getElementById('customerId').value=''; document.getElementById('cancel-edit-btn').style.display='none'; });
document.getElementById('cancel-edit-btn').addEventListener('click', ()=>{ document.getElementById('customer-form').reset(); document.getElementById('customerId').value=''; document.getElementById('cancel-edit-btn').style.display='none'; });

/* -----------------------
   Tabs handling + View All fix
   ----------------------- */
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');
        document.getElementById(target + '-tab').style.display = 'block';
        if (target === 'customers') document.getElementById('search-input').focus();
    });
});

// Make "View All" go to customers tab
document.getElementById('view-all-btn').addEventListener('click', () => {
    document.querySelector('.tab[data-tab="customers"]').click();
});

/* -----------------------
   Sync indicator
   ----------------------- */
const syncEl = document.getElementById('sync-indicator');
function setSync(state){
    syncEl.className = 'sync-indicator ' + state;
    syncEl.innerHTML = state === 'online' ? '<i class="fas fa-wifi sync-icon"></i> Online' : state === 'offline' ? '<i class="fas fa-plug"></i> Offline' : '<i class="fas fa-spinner sync-icon"></i> Syncing';
}
window.addEventListener('online', ()=> setSync('online'));
window.addEventListener('offline', ()=> setSync('offline'));
setSync(navigator.onLine ? 'online' : 'offline');

/* -----------------------
   Seed sample data (Device model used)
   ----------------------- */
(function seedIfEmpty(){
    const list = loadCustomers();
    if (list.length === 0) {
        const sample = [
            { id: uid(), investorName: 'Ramesh Das', customerName: 'Arjun Sen', deviceModel: 'iPhone 12', amount: 15000, profit: 2500, startDate: '', tenure: 9, monthlyEmi: Math.ceil((15000+2500)/9), payments: buildSchedule('',9, Math.ceil((15000+2500)/9)), status:'active', notes:'EMI every month', createdAt: new Date().toISOString() },
            { id: uid(), investorName: 'Sunita Roy', customerName: 'Maya Ghosh', deviceModel: 'Samsung A32', amount: 12000, profit: 2000, startDate: '', tenure: 6, monthlyEmi: Math.ceil((12000+2000)/6), payments: buildSchedule('',6, Math.ceil((12000+2000)/6)), status:'active', notes:'Good payer', createdAt: new Date().toISOString() }
        ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
    }
})();

/* -----------------------
   Initial render
   ----------------------- */
renderAll();

/* -----------------------
   Accessibility: focus search with /
   ----------------------- */
window.addEventListener('keydown', (e)=>{ if (e.key === '/') { e.preventDefault(); document.getElementById('search-input').focus(); } });

/* -----------------------
   Bind search & filter inputs
   ----------------------- */
document.getElementById('search-input').addEventListener('input', applyFilters);
document.getElementById('status-filter').addEventListener('change', applyFilters);