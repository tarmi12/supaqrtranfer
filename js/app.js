// ==========================================
// 🚀 APPLICATION CONTROLLER (สมองกลควบคุมหลัก - สไตล์แบรนด์ธนาคาร & แก้ไขบั๊กแบรนดิ้ง "ไม่ใช่")
// ==========================================

let CENTRAL_CUSTOMER_DB = [];
let CENTRAL_TRANSACTIONS_REPORT = [];
let isNewCustomer = false;
let previewModalObj = null;
let imageModalObj = null;
let cancelModalObj = null; // 🌟 เพิ่มตัวแปรสำหรับจัดการหน้าต่างยืนยันยกเลิก

let currentAction = 'CREATE'; // 'CREATE' หรือ 'REPRINT'
let currentTxId = null;
let cancelTxId = null; // 🌟 เก็บ ID รายการที่กำลังยกเลิก
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
    
    // 🌟 ผูกเหตุการณ์ยืนยันการยกเลิกใน Modal
    document.getElementById('btnConfirmCancelTx').addEventListener('click', submitCancellation);
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

async function onAuthSuccess(user) {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('appMainSection').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'block';
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    const userEmailPrefix = user.email.split('@')[0];
    document.getElementById('createdBy').value = userEmailPrefix;

    await initDateTime();
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
            
            let bName = cust.bank_name || cust.bank || '-';
            let bAcc = cust.bank_account || cust.account || '-';
            let bAccName = cust.bank_account_name || cust.accountName || '-';
            
            let bankBadgeColorClass = getBankBadgeClass(bName);
            let bankBadge = bName !== '-' ? `<span class="badge ${bankBadgeColorClass} ms-2">${bName}</span>` : '';

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
        lockFormFields(false); 
        clearFormValues(); 
        isNewCustomer = true;
        document.getElementById('customerBadge').className = "badge bg-danger";
        document.getElementById('customerBadge').textContent = "โหมดคีย์สดใหม่";
        showActionAlert('⚠️ คุณกำลังระบุข้อมูลบัญชีโอนด้วยตนเอง กรุณาตรวจสอบให้ละเอียด!', 'warning');
    } else {
        lockFormFields(true);
        const c = CENTRAL_CUSTOMER_DB[parseInt(indexValue)];
        if (c) {
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

    const searchVal = document.getElementById('customerSearchInput').value.trim();
    const checkMatched = CENTRAL_CUSTOMER_DB.some(cust => cust.name.toLowerCase() === searchVal.toLowerCase());
    if (checkMatched) {
        isNewCustomer = false;
    }

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
            const checkExist = CENTRAL_CUSTOMER_DB.some(c => c.name.toLowerCase() === customerName.toLowerCase());
            if (checkExist) {
                isNewCustomer = false;
            }

            if (isNewCustomer) {
                await SupabaseDB.upsertCustomer({ 
                    name: customerName, 
                    phone: customerPhoneVal, 
                    bank_name: document.getElementById('bankName').value, 
                    bank_account: document.getElementById('bankAccount').value.trim(), 
                    bank_account_name: document.getElementById('bankAccountName').value.trim() 
                });
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
                print_count: 1,
                image_urls: [] 
            });
        } else if (currentAction === 'REPRINT') {
            await SupabaseDB.updatePrintCount(currentTxId, reprintCountToSave);
        }

        showActionAlert('✅ ดำเนินการธุรกรรมเรียบร้อย! กำลังเรียกใช้คำสั่งพิมพ์...', 'success');
        
        setTimeout(async () => { 
            window.print(); 
            await clearForm(); 
            loadCustomersData(); 
        }, 800);
    } catch (err) {
        console.error("Save Error log:", err);
        showActionAlert('❌ ไม่สามารถบันทึกข้อมูลได้: ' + err.message + ' (ระบบอนุญาตพิมพ์กรณีฉุกเฉินด่วนได้)', 'danger');
        setTimeout(async () => { 
            window.print(); 
            await clearForm(); 
        }, 3000);
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
        const isCancelled = tx.status === 'cancelled';
        const regDate = new Date(tx.timestamp);
        const regDateTimeStr = regDate.toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' }) + ' ' + regDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
        
        let imgsData = [];
        if (tx.image_urls && Array.isArray(tx.image_urls)) {
            imgsData = tx.image_urls.filter(url => url && url.trim() !== '');
        } else {
            if (tx.slip_image_url && tx.slip_image_url.trim() !== '') imgsData.push(tx.slip_image_url);
            if (tx.receipt_image_url && tx.receipt_image_url.trim() !== '') imgsData.push(tx.receipt_image_url);
            if (tx.cargo_image_url && tx.cargo_image_url.trim() !== '') imgsData.push(tx.cargo_image_url);
            if (tx.weight_doc_image_url && tx.weight_doc_image_url.trim() !== '') imgsData.push(tx.weight_doc_image_url);
        }

        let photoBtn = "";
        if (imgsData.length > 0) {
            const imgsJson = encodeURIComponent(JSON.stringify(imgsData));
            photoBtn = `<button class="btn btn-sm btn-success py-2 px-3 fs-5 w-full text-white" onclick="showAllBillImages('${imgsJson}', '${tx.receipt_number}')"><i class="bi bi-images"></i> เปิดดูหลักฐานทั้งหมด (${imgsData.length} รูป)</button>`;
        } else {
            photoBtn = `<span class="badge bg-warning text-dark py-2 px-3 fw-bold fs-6 w-full text-center d-block"><i class="bi bi-clock"></i> รอยิงรูปภาพเข้าไลน์</span>`;
        }
        
        // 🌟 แก้ไขบั๊กแบรนดิ้งป้ายลูกค้าใหม่สีแดง โดยเช็กตรงๆ จากชื่อลูกค้าในตารางเลยว่ามีวงเล็บ "(เพิ่มใหม่)" หรือไม่ เพื่อความเสถียรและแม่นยำสูงสุด
        const isActuallyNew = tx.customer_name && tx.customer_name.includes('(เพิ่มใหม่)');
        
        // ตัดคำว่า " (เพิ่มใหม่)" ออกจากชื่อเพื่อเอาไปโชว์ที่หน้าจอรายงานแดชบอร์ดแบบสะอาดตา
        let customerNameToShow = tx.customer_name || '';
        if (isActuallyNew) {
            customerNameToShow = customerNameToShow.replace('(เพิ่มใหม่)', '').trim();
        }
        
        let strikeClass = isCancelled ? "text-strike" : "";
        let nameBadge = isActuallyNew ? `<span class="badge bg-danger text-white py-1 px-2 me-1 fs-6">ใหม่</span> ${customerNameToShow}` : customerNameToShow;
        
        // 🌟 แก้ไข Syntax Error: เอาตัวแปรประกาศซ้ำซ้อนออก ( displayPhone มีอันเดียวแล้วครับ)
        const displayPhone = tx.customer_phone ? `<br><small class="text-muted"><i class="bi bi-telephone-fill"></i> ${tx.customer_phone}</small>` : '<br><small class="text-muted">-</small>';

        const bankNameText = tx.bank_name || '-';
        const bankBadgeColorClass = getBankBadgeClass(bankNameText);

        let actionColumnContent = "";
        if (isCancelled) {
            actionColumnContent = `
                <div class="d-flex flex-column gap-1">
                    <span class="badge bg-danger py-2 fs-6 fw-bold w-100 d-block"><i class="bi bi-slash-circle-fill"></i> ยกเลิกถาวร</span>
                    <small class="text-danger fw-bold text-wrap" style="font-size: 0.85rem; line-height:1.2;">เหตุผล: ${tx.cancel_remark || '-'}</small>
                </div>
            `;
        } else {
            actionColumnContent = `
                <div class="d-flex flex-column gap-1">
                    <button class="btn btn-outline-danger btn-sm w-full py-1 fs-6" onclick="reprintFromReport('${tx.id}')"><i class="bi bi-printer-fill"></i> พิมพ์ซ้ำ</button>
                    <button class="btn btn-danger btn-sm w-full py-1 fs-6" onclick="openCancelModal('${tx.id}', '${tx.receipt_number}')"><i class="bi bi-x-circle-fill"></i> ยกเลิกรายการ</button>
                </div>
            `;
        }

        const tr = document.createElement('tr');
        if (isCancelled) {
            tr.className = "row-cancelled";
        }
        
        tr.innerHTML = `
            <td style="font-size: 1.1rem; color: #475569;" class="${strikeClass}">${regDateTimeStr}</td>
            <td class="text-danger fw-bold ${strikeClass}">${tx.receipt_number}</td>
            <td class="${strikeClass}">${nameBadge}${displayPhone}</td>
            <td class="text-end text-success fw-bold fs-5 ${strikeClass}">${parseFloat(tx.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
            <td style="font-size: 1.1rem;" class="${strikeClass}"><span class="badge ${bankBadgeColorClass} mb-1">${bankNameText}</span><br><span class="text-break">${tx.bank_account || '-'}</span><br><span class="text-muted text-break">${tx.bank_account_name || '-'}</span></td>
            <td class="text-center ${strikeClass}"><span class="badge bg-dark fs-6">${tx.print_count || 1} ครั้ง</span></td>
            <td class="text-muted ${strikeClass}" style="font-size: 1.1rem;">${tx.created_by || '-'}</td>
            <td><div class="d-flex flex-column">${photoBtn}</div></td>
            <td class="text-center">${actionColumnContent}</td>
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
    
    if (tx.status === 'cancelled') {
        showActionAlert('❌ รายการนี้ถูกยกเลิกถาวรแล้ว ไม่สามารถสั่งพิมพ์ซ้ำได้!', 'danger');
        return;
    }

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

    // 🌟 [แก้ไขบั๊กเตือนบัญชีใหม่อยู่นอกระบบขึ้นทุกบิลตอนพิมพ์ซ้ำ]
    // สั่งให้สลีปดึงสถานะ Warning จากการตรวจสอบคำว่า "(เพิ่มใหม่)" ในชื่อลูกค้าโดยตรง ซึ่งจะตรงกับสลิปจริงตอนจัดทำขึ้นมาครั้งแรกครับ
    const isCustNew = tx.customer_name && tx.customer_name.includes('(เพิ่มใหม่)');
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
// 🌟 ฟังก์ชันจัดการยกเลิกรายการด้วย Modal (Cancellation Flow)
// ==========================================
function openCancelModal(txId, receiptNo) {
    cancelTxId = txId;
    document.getElementById('cancelReceiptNo').innerText = receiptNo;
    document.getElementById('cancelRemarkInput').value = '';
    document.getElementById('cancelRemarkInput').classList.remove('is-invalid');
    
    if (!cancelModalObj) {
        cancelModalObj = new bootstrap.Modal(document.getElementById('cancelModal'));
    }
    cancelModalObj.show();
}

async function submitCancellation() {
    const remarkInput = document.getElementById('cancelRemarkInput');
    const remark = remarkInput.value.trim();

    if (!remark) {
        remarkInput.classList.add('is-invalid');
        return;
    }
    remarkInput.classList.remove('is-invalid');

    if (cancelModalObj) {
        cancelModalObj.hide();
    }

    showActionAlert('⏳ กำลังจัดส่งข้อมูลการยกเลิกไปยังคลาวด์หลังบ้าน...', 'warning');

    try {
        await SupabaseDB.cancelTransaction(cancelTxId, remark);
        showActionAlert('⚠️ ดำเนินการยกเลิกรายการสำเร็จแล้ว! (รายการนี้เปลี่ยนเป็นสถานะถูกยกเลิกถาวร)', 'success');
        await loadTransactionsReportDashboard(); // รีเฟรชแดชบอร์ดสรุปแบบเรียลไทม์
    } catch (err) {
        console.error("Cancel Transaction Error Log:", err);
        showActionAlert('❌ ไม่สามารถทำรายการยกเลิกได้: ' + err.message, 'danger');
    }
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

async function initDateTime() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    document.getElementById('docDate').value = `${now.getFullYear()}-${month}-${day}`;
    document.getElementById('docTime').value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    try {
        const todayCount = await SupabaseDB.countTodayTransactions();
        document.getElementById('receiptNumber').value = generateReceiptNo(todayCount);
    } catch (err) {
        console.error("เรียกเลขรันนิ่งบิลผิดพลาด คืนค่าเป็นระบบรันเวลาสำรอง:", err);
        const fallbackTime = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        document.getElementById('receiptNumber').value = `RE-${String(now.getFullYear()).slice(-2)}${month}${day}-${fallbackTime}`;
    }
}

function showActionAlert(msg, type) {
    const container = document.getElementById('alertContainer');
    if (container) {
        container.innerHTML = `<div class="alert alert-${type} border-2 p-3" role="alert" style="font-size: 1.11rem; font-weight:700;">${msg}</div>`;
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

async function clearForm() {
    document.getElementById('paymentForm').reset(); 
    await initDateTime(); 
    document.getElementById('customerSearchInput').value = ''; 
    lockFormFields(true); 
    isNewCustomer = false; 
    
    document.getElementById('customerBadge').className = "badge bg-secondary";
    document.getElementById('customerBadge').textContent = "รอลูกค้าใหม่";
}

// 🌟 ฟังก์ชันพิเศษสำหรับดึงรูปภาพทั้งหมดมาแสดงผลในแบบต่อยาวลงมาในป๊อปอัปเดียวกัน
function showAllBillImages(encodedImgs, receiptNo) {
    const imgs = JSON.parse(decodeURIComponent(encodedImgs));
    document.getElementById('imageModalTitle').innerText = `หลักฐานเอกสารแนบทั้งหมดของบิล : ${receiptNo}`;
    
    const container = document.getElementById('modalImageContainer');
    container.innerHTML = ""; 
    
    imgs.forEach((url, index) => {
        const directUrl = getDirectGoogleDriveUrl(url);
        const imgWrapper = document.createElement('div');
        imgWrapper.className = "mb-4 p-2 bg-white rounded shadow-sm border border-light";
        imgWrapper.innerHTML = `
            <div class="badge bg-dark mb-2 fs-6">รูปหลักฐานใบที่ ${index + 1}</div>
            <img src="${directUrl}" class="img-fluid rounded border d-block mx-auto" style="max-height: 75vh; width: auto;" alt="หลักฐานชิ้นที่ ${index + 1}">
        `;
        container.appendChild(imgWrapper);
    });
    
    document.getElementById('imageModalDownloadLink').style.display = "none"; 
    
    if (!imageModalObj) imageModalObj = new bootstrap.Modal(document.getElementById('imageModal'));
    imageModalObj.show();
}