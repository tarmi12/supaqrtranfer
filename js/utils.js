// ==========================================
// 💡 UTILITY & CALCULATION SERVICES (ตัวช่วยระบบ)
// ==========================================

/**
 * สร้างรหัสใบเสร็จรับเงินอัตโนมัติอ้างอิง วันที่ปัจจุบัน (ปี 2 หลัก) + เลขรันนิ่งนับหนึ่งใหม่ทุกวัน
 * @param {number} runningNumber ลำดับบิลของวันนี้ (เช่น 0, 1, 2)
 * @returns {string} RE-YYMMDD-XXX (เช่น RE-260523-001)
 */
function generateReceiptNo(runningNumber) {
    const now = new Date();
    
    // ดึงปี ค.ศ. แปลงเป็นอักษร แล้วตัดเอาเฉพาะ 2 หลักท้าย (เช่น "2026" จะเหลือแค่ "26")
    const yearShort = String(now.getFullYear()).slice(-2);
    
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    // บิลถัดไปคือ ลำดับปัจจุบันจากหลังบ้าน + 1
    const nextNumber = runningNumber + 1;
    
    // เติมเลขศูนย์ข้างหน้าให้เป็น 3 หลักเสมอ เช่น บิลที่ 1 -> "001"
    const runningStr = String(nextNumber).padStart(3, '0'); 
    
    return `RE-${yearShort}${month}${day}-${runningStr}`;
}

/**
 * ตรวจสอบชื่อธนาคารแล้วส่งกลับคลาสดีไซน์ป้ายสีเฉพาะตามแบรนดิ้งจริง
 * @param {string} bankName ชื่อธนาคารที่พิมพ์ในข้อมูล
 * @returns {string} ชื่อ Class CSS
 */
function getBankBadgeClass(bankName) {
    if (!bankName) return 'bg-secondary text-white';
    
    const name = bankName.toLowerCase().trim();
    
    if (name.includes('กสิกร') || name.includes('kbank') || name.includes('kasikorn')) return 'badge-kbank';
    if (name.includes('ไทยพาณิชย์') || name.includes('scb') || name.includes('siam commercial')) return 'badge-scb';
    if (name.includes('กรุงเทพ') || name.includes('bbl') || name.includes('bangkok')) return 'badge-bbl';
    if (name.includes('กรุงศรี') || name.includes('bay') || name.includes('krungsri')) return 'badge-bay';
    if (name.includes('กรุงไทย') || name.includes('ktb') || name.includes('krungthai')) return 'badge-ktb';
    if (name.includes('ทหารไทย') || name.includes('ธนชาต') || name.includes('ttb')) return 'badge-ttb';
    if (name.includes('ออมสิน') || name.includes('gsb')) return 'badge-gsb';
    if (name.includes('ธกส') || name.includes('ธ.ก.ส.') || name.includes('baac')) return 'badge-baac';
    if (name.includes('ธอส') || name.includes('ธ.อ.ส.') || name.includes('ghb')) return 'badge-ghb';
    if (name.includes('uob') || name.includes('ยูโอบี')) return 'badge-uob';
    
    return 'bg-secondary text-white'; // ส่งคลาสสีเทากลางมาตรฐานหากไม่ตรงคีย์เวิร์ด
}

/**
 * แปลงจำนวนเงินตัวเลขทศนิยมให้กลายเป็นตัวอักษรภาษาไทยอ้างอิงมาตรฐานบัญชี
 * @param {number|string} num จำนวนเงิน
 * @returns {string} ข้อความบาทถ้วน / สตางค์
 */
function thaiBaht(num) {
    if (isNaN(num) || num === null || num === undefined) return "(-ศูนย์บาทถ้วน-)";
    num = parseFloat(num).toFixed(2);
    if (num === "0.00") return "(-ศูนย์บาทถ้วน-)";
    const thaiNum = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const thaiUnit = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
    let [baht, satang] = num.split(".");
    
    function convertSection(str) {
        let len = str.length; let text = "";
        for (let i = 0; i < len; i++) {
            let digit = parseInt(str.charAt(i)); let pos = len - i - 1;
            if (digit !== 0) {
                if (pos === 1 && digit === 1) text += "สิบ";
                else if (pos === 1 && digit === 2) text += "ยี่สิบ";
                else if (pos === 0 && digit === 1 && len > 1) text += "เอ็ด";
                else text += thaiNum[digit] + thaiUnit[pos];
            }
        }
        return text;
    }
    let bahtText = "";
    while (baht.length > 6) {
        let chunk = baht.slice(-6); baht = baht.slice(0, -6);
        bahtText = "ล้าน" + convertSection(chunk) + bahtText;
    }
    bahtText = convertSection(baht) + bahtText;
    let result = bahtText !== "" ? bahtText + "บาท" : "";
    if (satang === "00") result += "ถ้วน";
    else result += convertSection(satang) + "สตางค์";
    return `(-${result}-)`;
}

/**
 * แกะวิเคราะห์และแปลงลิงก์รูปภาพ รองรับ Supabase URL, LINE CDN และแปลง Google Drive ให้แสดงผลได้ทันที
 * @param {string} url ลิงก์จากฐานข้อมูล
 * @returns {string} URL รูปภาพที่พร้อมใช้งานในแท็ก img
 */
function getDirectGoogleDriveUrl(url) {
    if (!url) return '';
    const cleanUrl = url.trim();
    
    // หากเป็นรูปภาพแบบ Base64 หรือโดเมนพรีวิวตรง lh3 อยู่แล้ว ให้ใช้งานได้ทันที
    if (cleanUrl.startsWith('data:image') || cleanUrl.includes('lh3.googleusercontent.com')) {
        return cleanUrl;
    }
    
    if (cleanUrl.includes('supabase.co') || cleanUrl.includes('line-apps.com')) {
        return cleanUrl;
    }
    
    let fileId = '';
    const regLongFormat = /\/file\/d\/([^\/]+)/;
    const regQueryFormat = /[?&]id=([^&]+)/;

    if (regLongFormat.test(cleanUrl)) {
        fileId = cleanUrl.match(regLongFormat)[1];
    } else if (regQueryFormat.test(cleanUrl)) {
        fileId = cleanUrl.match(regQueryFormat)[1];
    } else if (cleanUrl.length > 15 && !cleanUrl.includes('/') && !cleanUrl.includes('.')) {
        fileId = cleanUrl;
    }

    // แก้ไข Template Literal เพื่อให้ดึงลิ้งก์แสดงพรีวิวตรงสมบูรณ์แบบ
    if (fileId) {
        return `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    return cleanUrl;
}