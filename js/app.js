// ==========================================
// 🚀 APPLICATION CONTROLLER (สมองกลควบคุมหลัก - เวอร์ชันซ่อมระบบตรวจจับลูกค้าเก่า)
// ==========================================

let CENTRAL_CUSTOMER_DB = [];
let CENTRAL_TRANSACTIONS_REPORT = [];
let isNewCustomer = false;
let previewModalObj = null;
let imageModalObj = null;

let currentAction = 'CREATE'; // 'CREATE' หรือ 'REPRINT'
let currentTxId = null;
let reprintCountToSave = 1;

// 🟢 ส่วนเริ่มต้นคำสั่งเมื่อเบราว์เซอร์โหลดหน้าเว็บเสร็จ
document.addEventListener("DOMContentLoaded", () => {
    checkUserSession(); // ตรวจสอบสิทธิ์การเข้าใช้งาน

    // ผูกเหตุการณ์หน้าฟอร์มบันทึก
    document.getElementById('customerSearchInput').addEventListener('focus', showCustomerDropdown);
    document.getElementById('customerSearchInput').addEventListener('input', filterCustomerSearch);
    document.getElementById('btnToggleDropdown').addEventListener('click', toggleCustomerDropdown);
    document.getElementById('paymentForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('btnClearForm').addEventListener('click', clearForm);
    document.getElementById('btnConfirmPrintAndSave').addEventListener('click', confirmPrintAndSave);

    // ผูกเหตุการณ์หน้ารายงานแดชบอร์ด
    document.getElementById('report-tab').addEventListener('click', loadTransactionsReportDashboard);
    document.getElementById('btnRefreshReport').addEventListener('click', loadTransactionsReportDashboard);
    document.getElementById('reportSearch').addEventListener('keyup', filterReportTable);
    document.getElementById('reportStartDate').addEventListener('change', filterReportTable);
    document.getElementById('reportEndDate').addEventListener('change', filterReportTable);
    document.getElementById('btnClearReportFilter').addEventListener('click', clearReportFilters);
});

// ==========================================
// 🔒 ระบบจัดการความปลอดภัยและการเข้าสู่ระบบ (Authentication)
// ==========================================
async function checkUserSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        
        if (session) {
            onAuthSuccess(session.user);
        } else {
            onAuthRequired();
        }
    } catch (err) {
        console.error("Session check error:", err);
        onAuthRequired();
    }
}

supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        onAuthSuccess(session.user);
    } else if (event === 'SIGNED_OUT') {
        onAuthRequired();
    }
});

function onAuthSuccess(user) {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('appMainSection').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'block';
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    const userEmailPrefix = user.email.split('@')[0];
    document.getElementById('createdBy').value = userEmailPrefix;

    initDateTime();
    loadCustomersData();
}

function onAuthRequired() {
    document.getElementById('appMainSection').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('loginForm').addEventListener('submit', handleLoginSubmit);
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = document.getElementById('loginSubmitBtn');
    const alertContainer = document.getElementById('loginAlertContainer');

    alertContainer.innerHTML = '';
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> ตรวจสอบสิทธิ์...`;

    try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
    } catch (err) {
        console.error("Login failed:", err.message);
        alertContainer.innerHTML = `<div class="alert alert-danger border-2 p-3 fw-bold fs-6"><i class="bi bi-shield-slash-fill me-1"></i> รหัสผ่านไม่ถูกต้อง!</div>`;
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i> เข้าสู่ระบบทันที`;
    }
}

async function handleLogout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
    } catch (err) {
        console.error("Logout error:", err.message);
        onAuthRequired();
    }
}

// ==========================================
// 🔮 ระบบค้นหา Autocomplete คลังรายชื่อลูกค้า
// ==========================================
async function loadCustomersData() {
    try {
        CENTRAL_CUSTOMER_DB = await SupabaseDB.fetchCustomers();
        showActionAlert('⚡ อัปเดตคลังรายชื่อลูกค้าล่าสุดเรียบร้อย!', 'success');
        document.getElementById('customerSearchInput').placeholder = `🔍 พิมพ์ค้นหาจากคลังลูกค้า (${CENTRAL_CUSTOMER_DB.length} รายชื่อ)...`;
    } catch (err) {
        console.error("Error loading customers:", err);
        showActionAlert('📡 เชื่อมต่อฐานข้อมูลล้มเหลว: ' + err.message, 'danger');
    }
}

function showCustomerDropdown() {
    document.getElementById('customerSearchDropdown').style.display = 'block';
    filterCustomerSearch();
}

function toggleCustomerDropdown() {
    const dropdown = document.getElementById('customerSearchDropdown');
    if (dropdown.style.display === 'block') dropdown.style.display = 'none';
    else { dropdown.style.display = 'block'; document.getElementById('customerSearchInput').focus(); filterCustomerSearch(); }
}

function filterCustomerSearch() {
    const keyword = document.getElementById('customerSearchInput').value.toLowerCase().trim();
    const dropdown = document.getElementById('customerSearchDropdown');
    dropdown.innerHTML = '';

    const newCustBtn = document.createElement('button');
    newCustBtn.type = 'button';
    newCustBtn.className = 'search-item d-flex align-items-center justify-content-between text-danger fw-bold';
    newCustBtn.style.backgroundColor = '#fff5f5';
    newCustBtn.innerHTML = `<span><i class="bi bi-person-plus-fill me-2"></i>➕ กรอกข้อมูลลูกค้าใหม่เอง (ระบุบัญชีเอง)</span><span class="badge bg-danger text-white fs-6">คีย์ใหม่</span>`;
    newCustBtn.onclick = () => selectCustomerItem('NEW');
    dropdown.appendChild(newCustBtn);

    let filteredList = CENTRAL_CUSTOMER_DB;
    if (keyword !== '' && !keyword.startsWith('➕')) {
        filteredList = CENTRAL_CUSTOMER_DB.filter(c => {
            // 🛠️ แก้ไข: รองรับคีย์ตัวแปรทั้งแบบสไตล์เก่า (c.bank/c.account) และสไตล์ใหม่
            const bName = c.bank_name || c.bank || "";
            const bAcc = c.bank_account || c.account || "";
            const pPhone = c.phone || "";
            return c.name.toLowerCase().includes(keyword) || 
                   pPhone.includes(keyword) || 
                   bName.toLowerCase().includes(keyword) || 
                   bAcc.includes(keyword);
        });
    }

    if (filteredList.length === 0) {
        dropdown.innerHTML += `<div class="p-3 text-center text-muted fw-bold fs-6"><i class="bi bi-exclamation-circle me-1"></i> ไม่พบรายชื่อลูกค้า</div>`;
    } else {
        filteredList.forEach((cust) => {
            const originalIndex = CENTRAL_CUSTOMER_DB.indexOf(cust);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'search-item d-flex flex-column align-items-start';
            
            let phoneBadge = cust.phone ? `<span class="badge bg-light text-dark border ms-2"><i class="bi bi-telephone-fill"></i> ${cust.phone}</span>` : '';
            
            // 🛠️ แก้ไข: การดึงชื่อธนาคารและเลขบัญชีให้รองรับตัวแปรจาก Google Sheets เพื่อนำมาแสดงใน Dropdown
            let bName = cust.bank_name || cust.bank || '-';
            let bAcc = cust.bank_account || cust.account || '-';
            let bAccName = cust.bank_account_name || cust.accountName || '-';
            let bankBadge = bName !== '-' ? `<span class="badge bg-secondary text-white ms-2">${bName}</span>` : '';

            btn.innerHTML = `
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <strong class="text-dark fs-5">${cust.name}</strong><div>${phoneBadge}${bankBadge}</div>
                </div>
                <small class="text-muted mt-1" style="font-size: 0.95rem;"><i class="bi bi-credit-card-2-front"></i> บัญชี: ${bAcc} | ชื่อบัญชี: ${bAccName}</small>
            `;
            btn.onclick = () => selectCustomerItem(originalIndex);
            dropdown.appendChild(btn);
        });
    }
}

function selectCustomerItem(indexValue) {
    const searchInput = document.getElementById('customerSearchInput');
    document.getElementById('customerSearchDropdown').style.display = 'none';

    if (indexValue === 'NEW') {
        searchInput.value = "➕ เพิ่มรายชื่อลูกค้าใหม่เอง (ระบุบัญชีเอง)";
        lockFormFields(false); clearFormValues(); isNewCustomer = true;
        document.getElementById('customerBadge').className = "badge bg-danger";
        document.getElementById('customerBadge').textContent = "โหมดคีย์สดใหม่";
        showActionAlert('⚠️ คุณกำลังระบุข้อมูลบัญชีโอนด้วยตนเอง กรุณาตรวจสอบให้ละเอียด!', 'warning');
    } else {
        lockFormFields(true);
        const c = CENTRAL_CUSTOMER_DB[parseInt(indexValue)];
        if (c) {
            // 🛠️ แก้ไขสำคัญ: ดึงค่าและแมปค่าตัวแปรให้ถูกต้องทั้งสองระบบ เพื่อนำค่ามาหยอดลงช่องอินพุตในฟอร์ม
            searchInput.value = c.name;
            document.getElementById('customerName').value = c.name;
            document.getElementById('customerPhone').value = c.phone || '';
            document.getElementById('bankName').value = c.bank_name || c.bank || '';
            document.getElementById('bankAccount').value = c.bank_account || c.account || '';
            document.getElementById('bankAccountName').value = c.bank_account_name || c.accountName || '';
            
            isNewCustomer = false;
            document.getElementById('customerBadge').className = "badge bg-success";
            document.getElementById('customerBadge').textContent = "ลูกค้าในคลัง";
            showActionAlert(`📂 โหลดข้อมูลบัญชีของ "${c.name}" เรียบร้อยแล้ว`, 'info');
        }
    }
}

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('customerSearchDropdown');
    const searchInput = document.getElementById('customerSearchInput');
    if (dropdown && searchInput) {
        const parent = searchInput.closest('.position-relative');
        if (parent && !parent.contains(e.target)) dropdown.style.display = 'none';
    }
});

// ==========================================
// 🔄 ระบบเรนเดอร์จัดพิมพ์สลิปคู่
// ==========================================
function distributeSlipData(basePrefix, suffix, data) {
    document.getElementById(`${basePrefix}ReceiptNo${suffix}`).innerText = data.receiptNo;
    document.getElementById(`${basePrefix}Customer${suffix}`).innerText = data.customerName;
    document.getElementById(`${basePrefix}CustomerPhone${suffix}`).innerText = data.customerPhone;
    document.getElementById(`${basePrefix}Date${suffix}`).innerText = data.formattedDate;
    document.getElementById(`${basePrefix}Bill${suffix}`).innerText = data.billNo;
    document.getElementById(`${basePrefix}Bank${suffix}`).innerText = data.bankName;
    document.getElementById(`${basePrefix}BankAcc${suffix}`).innerText = data.bankAccount;
    document.getElementById(`${basePrefix}BankName${suffix}`).innerText = data.bankAccountName;
    document.getElementById(`${basePrefix}Amount${suffix}`).innerText = data.formattedAmount;
    document.getElementById(`${basePrefix}AmountText${suffix}`).innerText = data.thaiBahtText;
    document.getElementById(`${basePrefix}Remark${suffix}`).innerText = data.itemsRemark;
    
    const slipEl = document.getElementById(`${basePrefix}Slip${basePrefix === 'v' ? 'Details' : ''}${suffix}`);
    if (slipEl) slipEl.innerText = data.slipDetails;

    document.getElementById(`${basePrefix}PrintTime${suffix}`).innerText = data.finalPrintTimestamp;
    if (document.getElementById(`${basePrefix}Creator${suffix}`)) document.getElementById(`${basePrefix}Creator${suffix}`).innerText = data.createdBy;
}

function handleFormSubmit(e) {
    e.preventDefault();
    if (!document.getElementById('customerName').value.trim() || isNaN(parseFloat(document.getElementById('amount').value))) {
        showActionAlert('⚠️ กรุณากรอกข้อมูลให้ครบถ้วนก่อนตรวจสอบ', 'warning'); return;
    }

    currentAction = 'CREATE'; currentTxId = null; reprintCountToSave = 1;
    toggleReprintWidgets(false);
    
    const amountVal = document.getElementById('amount').value;
    const docDateVal = document.getElementById('docDate').value;
    const docTimeVal = document.getElementById('docTime').value;
    let d = docDateVal ? new Date(docDateVal) : new Date();
    const now = new Date();

    const slipData = {
        receiptNo: document.getElementById('receiptNumber').value,
        customerName: isNewCustomer ? document.getElementById('customerName').value.trim() + ' (เพิ่มใหม่)' : document.getElementById('customerName').value.trim(),
        customerPhone: document.getElementById('customerPhone').value.trim() || '-',
        billNo: document.getElementById('billNumber').value.trim(),
        bankName: document.getElementById('bankName').value.trim() || '-',
        bankAccount: document.getElementById('bankAccount').value.trim() || '-',
        bankAccountName: document.getElementById('bankAccountName').value.trim() || '-',
        itemsRemark: document.getElementById('itemsRemark').value.trim() || '-',
        slipDetails: document.getElementById('slipDetails').value.trim() || '-',
        createdBy: document.getElementById('createdBy').value.trim(),
        formattedDate: docDateVal ? `${d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })} เวลา ${docTimeVal || '00:00'} น.` : '-',
        finalPrintTimestamp: `${now.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} น.`,
        formattedAmount: parseFloat(amountVal).toLocaleString('th-TH', { minimumFractionDigits: 2 }) + ' บาท',
        thaiBahtText: thaiBaht(amountVal)
    };

    const warningStatus = isNewCustomer ? 'block' : 'none';
    document.getElementById('vNewCustWarning').style.display = warningStatus;
    document.getElementById('vNewCustWarningCopy').style.display = warningStatus;
    document.getElementById('pNewCustWarning').style.display = warningStatus;
    document.getElementById('pNewCustWarningCopy').style.display = warningStatus;

    distributeSlipData('v', '', slipData); distributeSlipData('v', 'Copy', slipData);
    distributeSlipData('p', '', slipData); distributeSlipData('p', 'Copy', slipData);

    renderReceiptQrCode(slipData.receiptNo);
}

function renderReceiptQrCode(receiptNo) {
    const lineOaId = "@365xfrzy"; const lineOaLink = `https://line.me/R/oaMessage/${lineOaId}/?${receiptNo}`;
    document.getElementById("vQrCode").innerHTML = ""; document.getElementById("pQrCode").innerHTML = "";
    new QRCode(document.getElementById("vQrCode"), { text: lineOaLink, width: 110, height: 110 });
    new QRCode(document.getElementById("pQrCode"), { text: lineOaLink, width: 110, height: 110 });

    if (!previewModalObj) previewModalObj = new bootstrap.Modal(document.getElementById('previewModal'));
    previewModalObj.show();
}

async function confirmPrintAndSave() {
    if (previewModalObj) previewModalObj.hide();
    showActionAlert('⏳ กำลังบันทึกข้อมูลธุรกรรมลงระบบจัดเก็บข้อมูล...', 'info');

    const customerName = document.getElementById('customerName').value.trim();
    const customerPhoneVal = document.getElementById('customerPhone').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const docDate = document.getElementById('docDate').value;
    const docTime = document.getElementById('docTime').value;

    try {
        if (currentAction === 'CREATE') {
            if (isNewCustomer) {
                await SupabaseDB.upsertCustomer({ name: customerName, phone: customerPhoneVal, bank_name: document.getElementById('bankName').value, bank_account: document.getElementById('bankAccount').value.trim(), bank_account_name: document.getElementById('bankAccountName').value.trim() });
            }
            await SupabaseDB.insertTransaction({
                receipt_number: document.getElementById('vReceiptNo').innerText,
                is_new_customer: isNewCustomer ? "ใช่ (พนักงานคีย์เองที่หน้าจอ)" : "ไม่ใช่ (เลือกจากฐานข้อมูล)",
                customer_name: isNewCustomer ? `${customerName} (เพิ่มใหม่)` : customerName,
                customer_phone: customerPhoneVal,
                bank_name: document.getElementById('bankName').value,
                bank_account: document.getElementById('bankAccount').value.trim(),
                bank_account_name: document.getElementById('bankAccountName').value.trim(),
                amount: amount,
                amount_thai_text: thaiBaht(amount),
                transfer_date_time: `${docDate} เวลา ${docTime}`,
                bill_number: document.getElementById('billNumber').value.trim(),
                slip_details: document.getElementById('slipDetails').value.trim(),
                items_remark: document.getElementById('itemsRemark').value.trim(),
                created_by: document.getElementById('createdBy').value.trim(),
                print_count: 1
            });
        } else if (currentAction === 'REPRINT') {
            await SupabaseDB.updatePrintCount(currentTxId, reprintCountToSave);
        }

        showActionAlert('✅ ดำเนินการธุรกรรมเรียบร้อย! กำลังเรียกใช้คำสั่งพิมพ์...', 'success');
        setTimeout(() => { window.print(); clearForm(); loadCustomersData(); }, 800);
    } catch (err) {
        console.error("Save Error log:", err);
        showActionAlert('❌ ไม่สามารถบันทึกข้อมูลได้: ' + err.message + ' (ระบบอนุญาตพิมพ์กรณีฉุกเฉินด่วนได้)', 'danger');
        setTimeout(() => { window.print(); clearForm(); }, 3000);
    }
}

// ==========================================
// 📊 ระบบหน้ารายงานสรุปแดชบอร์ด
// ==========================================
async function loadTransactionsReportDashboard() {
    const spinner = document.getElementById('reportSpinner');
    const tableArea = document.getElementById('reportTableArea');
    spinner.style.display = 'block'; tableArea.style.display = 'none';

    try {
        CENTRAL_TRANSACTIONS_REPORT = await SupabaseDB.fetchTransactionsReport();
        renderReportTable(CENTRAL_TRANSACTIONS_REPORT);
        spinner.style.display = 'none'; tableArea.style.display = 'block';
    } catch (err) {
        console.error("Error loading report:", err);
        spinner.style.display = 'none';
        document.getElementById('reportTableBody').innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4 fw-bold"><i class="bi bi-exclamation-triangle-fill"></i> รีพอร์ตล้มเหลว: ${err.message}</td></tr>`;
        tableArea.style.display = 'block';
    }
}

function renderReportTable(items) {
    const tbody = document.getElementById('reportTableBody'); tbody.innerHTML = '';
    if (items.length === 0) { tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">ไม่พบข้อมูลประวัติธุรกรรมใดๆ</td></tr>`; return; }

    items.forEach((tx) => {
        const regDate = new Date(tx.timestamp);
        const regDateTimeStr = regDate.toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' }) + ' ' + regDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
        
        let slipBtn = (tx.slip_image_url && tx.slip_image_url.trim() !== '') ? `<button class="btn btn-sm btn-success py-1 px-2 fs-6 w-full mb-1 text-white" onclick="showAttachmentImage('${tx.slip_image_url}', 'รูปสลิปใบโอนชำระเงิน : ${tx.receipt_number}')"><i class="bi bi-file-image"></i> เปิดดูสลิป</button>` : `<span class="badge bg-warning text-dark py-1 px-2 mb-1 fw-bold fs-6 w-full text-center d-block"><i class="bi bi-clock"></i> รอรูปสลิป</span>`;
        let receiptBtn = (tx.receipt_image_url && tx.receipt_image_url.trim() !== '') ? `<button class="btn btn-sm btn-info py-1 px-2 fs-6 w-full mb-1 text-white" onclick="showAttachmentImage('${tx.receipt_image_url}', 'รูปภาพใบเสร็จรับซื้อ : ${tx.receipt_number}')"><i class="bi bi-file-image"></i> เปิดดูใบเสร็จ</button>` : `<span class="badge bg-warning text-dark py-1 px-2 mb-1 fw-bold fs-6 w-full text-center d-block"><i class="bi bi-clock"></i> รอรูปรับซื้อ</span>`;
        let cargoBtn = (tx.cargo_image_url && tx.cargo_image_url.trim() !== '') ? `<button class="btn btn-sm btn-primary py-1 px-2 fs-6 w-full text-white" onclick="showAttachmentImage('${tx.cargo_image_url}', 'รูปภาพสินค้า/หน้างานเพิ่มเติม : ${tx.receipt_number}')"><i class="bi bi-file-image"></i> เปิดดูรูปสินค้า</button>` : `<span class="badge bg-warning text-dark py-1 px-2 fw-bold fs-6 w-full text-center d-block"><i class="bi bi-clock"></i> รอรูปสินค้า</span>`;
        
        let nameBadge = (tx.is_new_customer && tx.is_new_customer.indexOf("ใช่") !== -1) ? `<span class="badge bg-danger text-white py-1 px-2 me-1 fs-6">ใหม่</span> ${tx.customer_name}` : tx.customer_name;
        const displayPhone = tx.customer_phone ? `<br><small class="text-muted"><i class="bi bi-telephone-fill"></i> ${tx.customer_phone}</small>` : '<br><small class="text-muted">-</small>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-size: 1.1rem; color: #475569;">${regDateTimeStr}</td><td class="text-danger fw-bold">${tx.receipt_number}</td><td>${nameBadge}${displayPhone}</td>
            <td class="text-end text-success fw-bold fs-5">${parseFloat(tx.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
            <td style="font-size: 1.1rem;"><span class="badge bg-secondary mb-1">${tx.bank_name || '-'}</span><br><span class="text-break">${tx.bank_account || '-'}</span><br><span class="text-muted text-break">${tx.bank_account_name || '-'}</span></td>
            <td class="text-center"><span class="badge bg-dark fs-6">${tx.print_count || 1} ครั้ง</span></td><td class="text-muted" style="font-size: 1.1rem;">${tx.created_by || '-'}</td>
            <td><div class="d-flex flex-column">${slipBtn}${receiptBtn}${cargoBtn}</div></td>
            <td class="text-center"><button class="btn btn-outline-danger btn-sm w-full py-2 fs-6" onclick="reprintFromReport('${tx.id}')"><i class="bi bi-printer-fill"></i> พิมพ์ซ้ำ</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function filterReportTable() {
    const keyword = document.getElementById('reportSearch').value.toLowerCase().trim();
    const startDateVal = document.getElementById('reportStartDate').value;
    const endDateVal = document.getElementById('reportEndDate').value;

    const filtered = CENTRAL_TRANSACTIONS_REPORT.filter((tx) => {
        const matchSearch = tx.receipt_number.toLowerCase().includes(keyword) || tx.customer_name.toLowerCase().includes(keyword) || (tx.customer_phone && tx.customer_phone.includes(keyword)) || (tx.created_by && tx.created_by.toLowerCase().includes(keyword));
        let matchDate = true;
        if (tx.timestamp) {
            const txDate = new Date(tx.timestamp); txDate.setHours(0,0,0,0);
            if (startDateVal) { const start = new Date(startDateVal); start.setHours(0,0,0,0); if (txDate < start) matchDate = false; }
            if (endDateVal) { const end = new Date(endDateVal); end.setHours(0,0,0,0); if (txDate > end) matchDate = false; }
        }
        return matchSearch && matchDate;
    });
    renderReportTable(filtered);
}

function clearReportFilters() {
    document.getElementById('reportSearch').value = ''; document.getElementById('reportStartDate').value = ''; document.getElementById('reportEndDate').value = '';
    renderReportTable(CENTRAL_TRANSACTIONS_REPORT);
}

function showAttachmentImage(url, title) {
    document.getElementById('imageModalTitle').innerText = title;
    document.getElementById('imageModalTarget').src = getDirectGoogleDriveUrl(url);
    document.getElementById('imageModalDownloadLink').href = url;
    if (!imageModalObj) imageModalObj = new bootstrap.Modal(document.getElementById('imageModal'));
    imageModalObj.show();
}

function reprintFromReport(txId) {
    const tx = CENTRAL_TRANSACTIONS_REPORT.find(t => t.id === txId); if (!tx) return;
    currentAction = 'REPRINT'; currentTxId = txId; reprintCountToSave = (tx.print_count || 1) + 1;

    toggleReprintWidgets(true);
    document.getElementById('vReprintCount').innerText = reprintCountToSave; document.getElementById('vReprintCountCopy').innerText = reprintCountToSave;
    document.getElementById('pReprintCount').innerText = reprintCountToSave; document.getElementById('pReprintCountCopy').innerText = reprintCountToSave;

    const now = new Date();
    const slipData = {
        receiptNo: tx.receipt_number, customerName: tx.customer_name, customerPhone: tx.customer_phone || '-',
        billNo: tx.bill_number || '-', bankName: tx.bank_name || '-', bankAccount: tx.bank_account || '-', bankAccountName: tx.bank_account_name || '-',
        itemsRemark: tx.items_remark || '-', slipDetails: tx.slip_details || '-', createdBy: tx.created_by || '-', formattedDate: tx.transfer_date_time || '-',
        finalPrintTimestamp: `${now.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} น.`,
        formattedAmount: parseFloat(tx.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 }) + ' บาท', thaiBahtText: tx.amount_thai_text || thaiBaht(tx.amount)
    };

    const isCustNew = tx.is_new_customer && tx.is_new_customer.indexOf("ใช่") !== -1;
    document.getElementById('vNewCustWarning').style.display = isCustNew ? 'block' : 'none';
    document.getElementById('vNewCustWarningCopy').style.display = isCustNew ? 'block' : 'none';
    document.getElementById('pNewCustWarning').style.display = isCustNew ? 'block' : 'none';
    document.getElementById('pNewCustWarningCopy').style.display = isCustNew ? 'block' : 'none';

    distributeSlipData('v', '', slipData); distributeSlipData('v', 'Copy', slipData);
    distributeSlipData('p', '', slipData); distributeSlipData('p', 'Copy', slipData);
    renderReceiptQrCode(slipData.receiptNo);
}

function toggleReprintWidgets(show) {
    const displayStyle = show ? 'block' : 'none';
    document.getElementById('vReprintStatus').style.display = displayStyle; document.getElementById('vReprintStatusCopy').style.display = displayStyle;
    document.getElementById('pReprintStatus').style.display = displayStyle; document.getElementById('pReprintStatusCopy').style.display = displayStyle;
}

// ==========================================
// 💡 กลุ่มฟังก์ชันตัวช่วยฟอร์ม (Form Utilities)
// ==========================================
function lockFormFields(shouldLock) {
    document.getElementById('customerName').readOnly = shouldLock; document.getElementById('customerPhone').readOnly = shouldLock;
    document.getElementById('bankName').readOnly = shouldLock; document.getElementById('bankAccount').readOnly = shouldLock; document.getElementById('bankAccountName').readOnly = shouldLock;
}

function clearFormValues() {
    document.getElementById('customerName').value = ''; document.getElementById('customerPhone').value = '';
    document.getElementById('bankName').value = ''; document.getElementById('bankAccount').value = ''; document.getElementById('bankAccountName').value = '';
}

function initDateTime() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    document.getElementById('docDate').value = `${now.getFullYear()}-${month}-${day}`;
    document.getElementById('docTime').value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    document.getElementById('receiptNumber').value = generateReceiptNo();
}

function showActionAlert(msg, type) {
    const container = document.getElementById('alertContainer');
    if (container) {
        container.innerHTML = `<div class="alert alert-${type} border-2 p-3" role="alert" style="font-size: 1.11rem; font-weight:700;">${msg}</div>`;
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function clearForm() {
    document.getElementById('paymentForm').reset(); initDateTime();
    document.getElementById('customerSearchInput').value = ''; lockFormFields(true); isNewCustomer = false;
    document.getElementById('customerBadge').className = "badge bg-secondary";
    document.getElementById('customerBadge').textContent = "รอลูกค้าใหม่";
}