// ==========================================
// 💡 UTILITY & CALCULATION SERVICES (ตัวช่วยระบบ)
// ==========================================

/**
 * สร้างรหัสใบเสร็จรับเงินอัตโนมัติอ้างอิงเวลาจริงเสี้ยววินาที ณ ปัจจุบัน
 * @returns {string} RE-YYYYMMDD-HHMMSS
 */
function generateReceiptNo() {
    const now = new Date();
    return `RE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
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
 * แกะวิเคราะห์และแปลงลิงก์แชร์ Google Drive ให้เป็น Direct URL เพื่อนำรูปภาพมาวาดบนแท็ก img ได้ทันที
 * @param {string} url ลิงก์จาก Google Drive
 * @returns {string} Direct Image URL
 */
function getDirectGoogleDriveUrl(url) {
    if (!url) return '';
    const cleanUrl = url.trim();
    
    if (cleanUrl.includes('lh3.googleusercontent.com') || cleanUrl.includes('drive.google.com/uc')) {
        return cleanUrl;
    }

    let fileId = '';
    const regLongFormat = /\/file\/d\/([^\/]+)/;
    const regQueryFormat = /[?&]id=([^&]+)/;

    let match = cleanUrl.match(regLongFormat);
    if (match && match[1]) {
        fileId = match[1];
    } else {
        match = cleanUrl.match(regQueryFormat);
        if (match && match[1]) {
            fileId = match[1];
        }
    }

    if (fileId) {
        return "https://lh3.googleusercontent.com/d/" + fileId;
    }
    return cleanUrl;
}