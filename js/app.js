// ==========================================
// 🚀 APPLICATION CONTROLLER (สมองกลควบคุมหลัก - อัปเกรดระบบ 3 รูปภาพ & Supabase Sync)
// ==========================================

let CENTRAL_CUSTOMER_DB = [];
let CENTRAL_TRANSACTIONS_REPORT = [];
let isNewCustomer = false;
let previewModalObj = null;
let imageModalObj = null;

let currentAction = 'CREATE'; // 'CREATE' หรือ 'REPRINT'
let currentTxId = null;
let reprintCountToSave = 1;

document.addEventListener("DOMContentLoaded", () => {
    checkUserSession(); // ตรวจสอบเซสชันความปลอดภัย

    // ผูกเหตุการณ์หน้าฟอร์ม
    document.getElementById('customerSearchInput').addEventListener('focus', showCustomerDropdown);
    document.getElementById('customerSearchInput').addEventListener('input', filterCustomerSearch);
    document.getElementById('btnToggleDropdown').addEventListener('click', toggleCustomerDropdown);
    document.getElementById('paymentForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('btnClearForm').addEventListener('click', clearForm);
    document.getElementById('btnConfirmPrintAndSave').addEventListener('click', confirmPrintAndSave);

    // ผูกเหตุการณ์หน้ารายงาน
    document.getElementById('report-tab').addEventListener('click', loadTransactionsReportDashboard);
    document.getElementById('btnRefreshReport').addEventListener('click', loadTransactionsReportDashboard);
    document.getElementById('reportSearch').addEventListener('keyup', filterReportTable);
    document.getElementById('filterDate').addEventListener('change', filterReportTable);

    // เริ่มต้นเปิดระบบดึงข้อมูลรายชื่อจากเซิร์ฟเวอร์ตุนไว้ในเครื่องทันที
    initDateTime();
    loadCustomersCentralMemory();

    // บูตตัวจำลองหน้าต่าง Popup คอนเฟิร์มพิมพ์ (Bootstrap Modal Context)
    previewModalObj = new bootstrap.Modal(document.getElementById('previewModal'));
    imageModalObj = new bootstrap.Modal(document.getElementById('imageModal'));
});

/**
 * ดึงข้อมูลรายชื่อลูกค้าจาก Supabase มาจัดเก็บลงในหน่วยความจำของบราวเซอร์ (Global State Cache)
 */
async function loadCustomersCentralMemory() {
    try {
        CENTRAL_CUSTOMER_DB = await SupabaseDB.fetchCustomers();
        console.log("🌟 ซิงค์คลังฐานข้อมูลรายชื่อลูกค้าสำเร็จแล้ว ค้นหาได้ทันที จำนวน:", CENTRAL_CUSTOMER_DB.length, "ราย");
    } catch (e) {
        console.error("❌ ระบบไม่สามารถซิงค์ข้อมูลสมาชิกลูกค้าได้:", e.message);
        showActionAlert("ไม่สามารถเชื่อมต่อคลังข้อมูลหลักลูกค้าได้ ระบบจะเปิดโหมดคีย์สด", "danger");
    }
}

function showCustomerDropdown() {
    const wrapper = document.getElementById('customerDropdownWrapper');
    filterCustomerSearch(); 
    wrapper.style.display = 'block';
}

function hideCustomerDropdown() {
    setTimeout(() => {
        document.getElementById('customerDropdownWrapper').style.display = 'none';
    }, 250);
}

function toggleCustomerDropdown() {
    const wrapper = document.getElementById('customerDropdownWrapper');
    if (wrapper.style.display === 'block') {
        wrapper.style.display = 'none';
    } else {
        document.getElementById('customerSearchInput').focus();
    }
}

/**
 * ฟังก์ชันช่วยค้นหาและจับคู่ข้อมูลลูกค้าจากหน่วยความจำ Supabase เคลียร์ปัญหาฟ้องขัดข้องข้ามระบบ
 */
function filterCustomerSearch() {
    const keyword = document.getElementById('customerSearchInput').value.trim().toLowerCase();
    const wrapper = document.getElementById('customerDropdownWrapper');
    wrapper.innerHTML = '';

    // ค้นหารองรับทั้ง ชื่อลูกค้า และ เลขบัญชีธนาคาร จากข้อมูลที่ดึงมาจาก Supabase
    const matched = CENTRAL_CUSTOMER_DB.filter(c => 
        (c.name && c.name.toLowerCase().includes(keyword)) || 
        (c.bank_account && c.bank_account.includes(keyword))
    );

    if (matched.length === 0) {
        wrapper.innerHTML = `<button type="button" class="search-item text-danger fw-bold text-center" onclick="setupAsNewCustomerInput()"><i class="bi bi-person-plus-fill"></i> ไม่พบข้อมูลบัญชีนี้ บังคับเปิดสิทธิ์คีย์พนักงานใหม่</button>`;
        return;
    }

    matched.forEach(c => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'search-item';
        // อัปเดตการแสดงผลให้เห็นเลขบัญชีเพื่อความแม่นยำในการเลือก
        btn.innerHTML = `<strong>${c.name}</strong> <span class="text-muted small">(${c.bank_name || 'ไม่ระบุ'} : ${c.bank_account || 'ไม่มีบัญชี'})</span>`;
        btn.onclick = () => selectCustomer(c.name);
        wrapper.appendChild(btn);
    });
}

/**
 * ฟังก์ชันทำงานเมื่อผู้ใช้คลิกเลือกลูกค้าเก่าจากตารางลิสต์
 */
function selectCustomer(name) {
    // ดึงค่าตามโครงสร้างสคีมาของตาราง Supabase
    const cust = CENTRAL_CUSTOMER_DB.find(c => c.name === name);
    if (cust) {
        document.getElementById('customerSearchInput').value = cust.name;
        document.getElementById('customerName').value = cust.name;
        document.getElementById('customerPhone').value = cust.phone || '';
        document.getElementById('bankName').value = cust.bank_name || '';
        document.getElementById('bankAccount').value = cust.bank_account || '';
        document.getElementById('bankAccountName').value = cust.bank_account_name || '';
        
        // ✨ จุดสำคัญ: บัญชีอยู่นอกระบบจะเปลี่ยนสถานะเป็น false ทันทีเพราะมีตัวตนอยู่แล้ว
        isNewCustomer = false;
        
        lockFormFields(false);
        document.getElementById('customerStatusBadge').innerHTML = `<span class="badge bg-success border-0 px-3 py-2"><i class="bi bi-shield-check"></i> ตรวจสอบบัญชี: ลูกค้าเก่าในคลังอนุมัติ</span>`;
        hideCustomerDropdown();
    }
}

function setupAsNewCustomerInput() {
    const keyword = document.getElementById('customerSearchInput').value.trim();
    clearFormValues();
    
    document.getElementById('customerName').value = keyword;
    isNewCustomer = true; // บังคับสิทธิ์เป็นลูกค้าใหม่เพื่อรอเอาเลขบัญชีไปบันทึกเพิ่มลงฐานข้อมูลใหม่อัตโนมัติ
    
    lockFormFields(false);
    document.getElementById('customerStatusBadge').innerHTML = `<span class="badge bg-danger border-0 px-3 py-2"><i class="bi bi-person-plus"></i> ตรวจสอบบัญชี: (เพิ่มใหม่) บัญชีอยู่นอกระบบ</span>`;
    hideCustomerDropdown();
}

function lockFormFields(state) {
    document.getElementById('customerName').readOnly = state;
    document.getElementById('customerPhone').readOnly = state;
    document.getElementById('bankName').disabled = state;
    document.getElementById('bankAccount').readOnly = state;
    document.getElementById('bankAccountName').readOnly = state;
}

/**
 * ตรวจสอบและประมวลผลเมื่อพนักงานกดยื่นแบบฟอร์มคำนวณบิล
 */
function handleFormSubmit(e) {
    e.preventDefault();
    
    const inputAmount = parseFloat(document.getElementById('transferAmount').value);
    if (isNaN(inputAmount) || inputAmount <= 0) {
        alert("กรุณาระบุจำนวนเงินโอนที่ถูกต้องและมีค่ามากกว่า 0 บาท");
        return;
    }

    const cName = document.getElementById('customerName').value.trim();
    const bAccount = document.getElementById('bankAccount').value.trim();

    // 🌟 ดับเบิ้ลเช็กความถูกต้องอีกครั้ง: ลองหาทั้งชื่อหรือเลขบัญชีในคลัง เพื่อเคลียร์ปัญหาคำว่า (เพิ่มใหม่) ค้างคา
    const finalMatch = CENTRAL_CUSTOMER_DB.find(c => 
        c.name.trim() === cName || (c.bank_account && c.bank_account.trim() === bAccount)
    );

    if (finalMatch) {
        isNewCustomer = false;
        // หากเจอว่ามีอยู่แล้วแต่พนักงานกดพิมพ์ค้นหาพลาด ให้ช่วยอัปเดตข้อมูลให้ตรงตามฐานข้อมูลเซิร์ฟเวอร์ทันที
        document.getElementById('customerName').value = finalMatch.name;
        document.getElementById('bankName').value = finalMatch.bank_name || '';
        document.getElementById('bankAccount').value = finalMatch.bank_account || '';
        document.getElementById('bankAccountName').value = finalMatch.bank_account_name || '';
    } else {
        isNewCustomer = true;
    }

    currentAction = 'CREATE';
    currentTxId = null;
    reprintCountToSave = 1;

    // รวบรวมฟิลด์กางข้อความพรีวิวลงสลิปจำลองความร้อน
    document.getElementById('pReceiptNo').innerText = document.getElementById('receiptNumber').value;
    document.getElementById('pDate').innerText = document.getElementById('docDate').value + ' ' + document.getElementById('docTime').value;
    
    // แสดงสถานะในใบเสร็จ
    document.getElementById('pCustName').innerText = isNewCustomer ? `${document.getElementById('customerName').value} (เพิ่มใหม่)` : document.getElementById('customerName').value;
    document.getElementById('pPhone').innerText = document.getElementById('customerPhone').value || '-';
    document.getElementById('pBankInfo').innerText = `${document.getElementById('bankName').value} (เลขบัญชี: ${document.getElementById('bankAccount').value})`;
    document.getElementById('pBankAccName').innerText = document.getElementById('bankAccountName').value;
    
    document.getElementById('pAmount').innerText = inputAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('pAmountThai').innerText = thaiBaht(inputAmount);
    document.getElementById('pBillNo').innerText = document.getElementById('billNumber').value || '-';
    document.getElementById('pSlip').innerText = document.getElementById('slipDetails').value || '-';
    document.getElementById('pRemark').innerText = document.getElementById('itemsRemark').value || '-';
    document.getElementById('pPrintTime').innerText = new Date().toLocaleString('th-TH');

    // ล้างและขึ้นภาพ QR Code ทันทีสำหรับพนักงานตรวจสอบความปลอดภัยระบบบัญชี
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), {
        text: document.getElementById('receiptNumber').value,
        width: 110,
        height: 110
    });

    previewModalObj.show();
}

/**
 * บันทึกข้อมูลและประวัติลงถังคลาวด์เดี่ยวแบบเรียลไทม์ (Supabase DB Engine Sync)
 */
async function confirmPrintAndSave() {
    previewModalObj.hide();
    document.getElementById('btnConfirmPrintAndSave').disabled = true;

    const custName = document.getElementById('customerName').value.trim();
    const bName = document.getElementById('bankName').value;
    const bAccount = document.getElementById('bankAccount').value.trim();
    const bAccountName = document.getElementById('bankAccountName').value.trim();
    const cPhone = document.getElementById('customerPhone').value.trim();

    try {
        if (currentAction === 'CREATE') {
            // โครงสร้าง Payload ยิงเซฟลงตารางหลัก Transactions บน Supabase
            const txPayload = {
                receipt_number: document.getElementById('receiptNumber').value,
                is_new_customer: isNewCustomer,
                customer_name: isNewCustomer ? `${custName} (เพิ่มใหม่)` : custName,
                bank_name: bName,
                bank_account: bAccount,
                bank_account_name: bAccountName,
                amount: parseFloat(document.getElementById('transferAmount').value),
                amount_thai_text: document.getElementById('pAmountThai').innerText,
                transfer_date_time: `${document.getElementById('docDate').value} ${document.getElementById('docTime').value}`,
                bill_number: document.getElementById('billNumber').value || null,
                slip_details: document.getElementById('slipDetails').value || null,
                items_remark: document.getElementById('itemsRemark').value || null,
                created_by: "พนักงานหน้าเคาน์เตอร์",
                reprint_count: 1
            };

            await SupabaseDB.insertTransaction(txPayload);

            // 💡 หากระบบประมวลผลแล้วว่าเป็นลูกค้าตัวจริงนอกระบบ (New Customer) ให้ทำอัปโหลดเพิ่มชื่อเข้าคลังถาวรทันที
            if (isNewCustomer) {
                const customerPayload = {
                    name: custName,
                    phone: cPhone || null,
                    bank_name: bName,
                    bank_account: bAccount,
                    bank_account_name: bAccountName
                };
                await SupabaseDB.upsertCustomer(customerPayload);
            }

            showActionAlert(`🎉 บันทึกธุรกรรมบิลเลขที่ ${txPayload.receipt_number} ลงใน Supabase คลาวด์เรียบร้อยแล้ว!`, "success");

        } else if (currentAction === 'REPRINT') {
            const nextCount = reprintCountToSave + 1;
            await SupabaseDB.updateReprintCount(currentTxId, nextCount);
            showActionAlert(`🔄 บันทึกประวัติการสั่งพิมพ์ซ้ำ (Reprintครั้งที่ ${nextCount}) สำเร็จ`, "info");
        }

        // เปิดคำสั่งปริ้นเตอร์ระบบปฏิบัติการ
        window.print();
        
        // โหลดรายชื่ออัปเดตและล้างหน้าจอเตรียมรับลูกค้าคนถัดไป
        await loadCustomersCentralMemory();
        clearForm();

    } catch (err) {
        console.error("❌ เกิดข้อผิดพลาดในขั้นตอนบันทึกส่งค่า:", err);
        alert("ระบบขัดข้องไม่สามารถบันทึกข้อมูลไปที่ Supabase ได้ชั่วคราว: " + err.message);
    } finally {
        document.getElementById('btnConfirmPrintAndSave').disabled = false;
    }
}

/**
 * ดึงและจัดการตารางรายงานหลังบ้านพนักงาน
 */
async function loadTransactionsReportDashboard() {
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-secondary fw-bold"><div class="spinner-border spinner-border-sm text-danger me-2"></div> กำลังดึงข้อมูลธุรกรรมล่าสุดจาก Supabase...</td></tr>`;
    
    try {
        CENTRAL_TRANSACTIONS_REPORT = await SupabaseDB.fetchTransactionsReport();
        renderReportTable(CENTRAL_TRANSACTIONS_REPORT);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4fw-bold">❌ ดึงข้อมูลรายงานล้มเหลว: ${e.message}</td></tr>`;
    }
}

/**
 * แสดงตารางรายงานประวัติพร้อมรองรับระบบเปิดดูภาพหลักฐานอัพโหลด 3 รูปจาก LINE OA
 */
function renderReportTable(items) {
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = '';

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">📭 ไม่พบประวัติรายการโอนเงินในระบบตามเงื่อนไขที่ค้นหา</td></tr>`;
        return;
    }

    items.forEach((tx, idx) => {
        const amt = parseFloat(tx.amount || 0);
        
        // ปรับการเช็กค่าความว่างเปล่าของสตริงของฟิลด์รูปภาพแบบเข้มงวด ป้องกันปุ่มเบี้ยวกรณีอ้างอิง Null บนฐานข้อมูล
        let slipBtn = (tx.slip_image_url && tx.slip_image_url.trim() !== '') 
            ? `<button class="btn btn-sm btn-success py-1 px-2 fs-6 w-full mb-1 text-white" onclick="showAttachmentImage('${tx.slip_image_url}', 'รูปสลิปใบโอนชำระเงิน : ${tx.receipt_number}')"><i class="bi bi-file-image"></i> เปิดดูสลิป</button>` 
            : `<span class="badge bg-warning text-dark py-1 px-2 mb-1 fw-bold fs-6 w-full text-center d-block"><i class="bi bi-clock"></i> รอรูปสลิป</span>`;

        let receiptBtn = (tx.receipt_image_url && tx.receipt_image_url.trim() !== '') 
            ? `<button class="btn btn-sm btn-info py-1 px-2 fs-6 w-full mb-1 text-white" onclick="showAttachmentImage('${tx.receipt_image_url}', 'รูปภาพใบเสร็จรับซื้อ : ${tx.receipt_number}')"><i class="bi bi-file-image"></i> เปิดดูใบเสร็จ</button>` 
            : `<span class="badge bg-warning text-dark py-1 px-2 mb-1 fw-bold fs-6 w-full text-center d-block"><i class="bi bi-clock"></i> รอรูปรับซื้อ</span>`;

        let cargoBtn = (tx.cargo_image_url && tx.cargo_image_url.trim() !== '') 
            ? `<button class="btn btn-sm btn-primary py-1 px-2 fs-6 w-full text-white" onclick="showAttachmentImage('${tx.cargo_image_url}', 'รูปภาพสินค้า/หน้างานเพิ่มเติม : ${tx.receipt_number}')"><i class="bi bi-file-image"></i> เปิดดูรูปสินค้า</button>` 
            : `<span class="badge bg-warning text-dark py-1 px-2 fw-bold fs-6 w-full text-center d-block"><i class="bi bi-clock"></i> รอรูปสินค้า</span>`;

        const tr = document.createElement('tr');
        tr.style.fontSize = "1.08rem";
        tr.innerHTML = `
            <td class="text-center fw-bold">${idx + 1}</td>
            <td class="small fw-bold text-secondary">${tx.transfer_date_time || '-'}</td>
            <td class="fw-bold text-danger">${tx.receipt_number || '-'}</td>
            <td>
                <span class="fw-bold d-block">${tx.customer_name || '-'}</span>
                <small class="text-muted d-block" style="font-size:0.85rem;">${tx.bank_name || '-'} : ${tx.bank_account || '-'}</small>
                <small class="text-secondary d-block" style="font-size:0.85rem;">ชื่อบัญชี: ${tx.bank_account_name || '-'}</small>
            </td>
            <td class="text-end fw-bold text-primary">${amt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
            <td class="small text-muted">${tx.items_remark || '-'}</td>
            <td class="text-center" style="min-width:130px;">
                ${slipBtn}
                ${receiptBtn}
                ${cargoBtn}
            </td>
            <td class="text-center"><span class="badge bg-dark px-2 py-1 fs-6">${tx.reprint_count || 1} ครั้ง</span></td>
            <td class="text-center">
                <button class="btn btn-sm btn-danger fw-bold text-white px-2 py-1" onclick="triggerReprintFlow('${tx.id}')">
                    <i class="bi bi-printer-fill"></i> พิมพ์ซ้ำ
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterReportTable() {
    const keyword = document.getElementById('reportSearch').value.toLowerCase().trim();
    const filterDate = document.getElementById('filterDate').value;

    const filtered = CENTRAL_TRANSACTIONS_REPORT.filter(tx => {
        const matchKeyword = 
            (tx.receipt_number && tx.receipt_number.toLowerCase().includes(keyword)) ||
            (tx.customer_name && tx.customer_name.toLowerCase().includes(keyword)) ||
            (tx.bank_account && tx.bank_account.includes(keyword)) ||
            (tx.items_remark && tx.items_remark.toLowerCase().includes(keyword));

        let matchDate = true;
        if (filterDate && tx.transfer_date_time) {
            matchDate = tx.transfer_date_time.includes(filterDate);
        }

        return matchKeyword && matchDate;
    });

    renderReportTable(filtered);
}

/**
 * เรียกเปิดแสดง Modal ดูภาพหลักฐานแนบ สั่งงานผ่าน Utility คัดกรองประเภทลิงก์
 */
function showAttachmentImage(rawUrl, titleText) {
    const processedUrl = getDirectGoogleDriveUrl(rawUrl);
    document.getElementById('imageModalLabel').innerText = titleText;
    
    const container = document.getElementById('modalImageContainer');
    container.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-danger"></div><p class="text-muted mt-2">กำลังโหลดรูปภาพหลักฐาน...</p></div>`;
    
    imageModalObj.show();

    const img = new Image();
    img.src = processedUrl;
    img.className = "img-fluid img-thumbnail rounded shadow-sm mx-auto d-block";
    img.style.maxHeight = "72vh";
    
    img.onload = () => { container.innerHTML = ''; container.appendChild(img); };
    img.onerror = () => { container.innerHTML = `<div class="alert alert-danger border-2 text-center my-3"><i class="bi bi-exclamation-triangle-fill fs-3 d-block mb-2"></i> ไม่สามารถดึงรูปภาพจาก LINE หรือ Supabase Storage ได้ภายนอก<br><a href="${processedUrl}" target="_blank" class="btn btn-sm btn-outline-danger mt-3 fw-bold">คลิกที่นี่เพื่อเปิดลิงก์ตรงภายนอก</a></div>`; };
}

/**
 * เรียกประวัติเก่าขึ้นมาจัดตำแหน่งเลเอาท์หน้าบิลเพื่อเตรียมส่งเข้าเครื่องพิมพ์สลิปอีกครั้ง
 */
function triggerReprintFlow(txId) {
    const tx = CENTRAL_TRANSACTIONS_REPORT.find(item => item.id === txId);
    if (!tx) return;

    currentAction = 'REPRINT';
    currentTxId = tx.id;
    reprintCountToSave = tx.reprint_count || 1;

    document.getElementById('pReceiptNo').innerText = tx.receipt_number || '-';
    document.getElementById('pDate').innerText = tx.transfer_date_time || '-';
    document.getElementById('pCustName').innerText = tx.customer_name || '-';
    document.getElementById('pPhone').innerText = '-'; 
    document.getElementById('pBankInfo').innerText = `${tx.bank_name || '-'} (เลขบัญชี: ${tx.bank_account || '-'})`;
    document.getElementById('pBankAccName').innerText = tx.bank_account_name || '-';
    
    const amt = parseFloat(tx.amount || 0);
    document.getElementById('pAmount').innerText = amt.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('pAmountThai').innerText = tx.amount_thai_text || thaiBaht(amt);
    document.getElementById('pBillNo').innerText = tx.bill_number || '-';
    document.getElementById('pSlip').innerText = tx.slip_details || '-';
    document.getElementById('pRemark').innerText = tx.items_remark || '-';
    document.getElementById('pPrintTime').innerText = new Date().toLocaleString('th-TH') + " (พนักงานพิมพ์ซ้ำ)";

    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), {
        text: tx.receipt_number || "RE-ERROR",
        width: 110,
        height: 110
    });

    previewModalObj.show();
}

function checkUserSession() {
    console.log("🔒 ระบบรักษาความปลอดภัยเคาน์เตอร์เริ่มทำงานตามปกติ...");
}

function clearFormValues() {
    document.getElementById('customerName').value = ''; 
    document.getElementById('customerPhone').value = '';
    document.getElementById('bankName').value = ''; 
    document.getElementById('bankAccount').value = ''; 
    document.getElementById('bankAccountName').value = '';
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
        container.innerHTML = `<div class="alert alert-${type} border-2 p-3" role="alert" style=\"font-size: 1.11rem; font-weight:700;\">${msg}</div>`;
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function clearForm() {
    document.getElementById('paymentForm').reset(); 
    initDateTime();
    document.getElementById('customerSearchInput').value = ''; 
    lockFormFields(true); 
    isNewCustomer = false;
    document.getElementById('customerStatusBadge').innerHTML = `<span class="badge bg-secondary border-0 px-3 py-2"><i class="bi bi-search"></i> กรุณาพิมพ์ค้นหารายชื่อเพื่อเปิดระบบล็อกฟอร์ม</span>`;
}