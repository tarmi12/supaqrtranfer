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
 * แกะวิเคราะห์และแปลงลิงก์รูปภาพ รองรับ Supabase URL, LINE CDN และแปลง Google Drive ให้แสดงผลได้ทันที
 * @param {string} url ลิงก์จากฐานข้อมูล
 * @returns {string} URL รูปภาพที่พร้อมใช้งานในแท็ก img
 */
function getDirectGoogleDriveUrl(url) {
    if (!url) return '';
    const cleanUrl = url.trim();
    
    // หากเป็นลิงก์ตรงที่เปิดได้อยู่แล้ว หรือรูปภาพ Base64 ให้ส่งออกไปใช้งานตรงๆ ได้เลย
    if (cleanUrl.includes('supabase.co') || cleanUrl.includes('line-apps.com') || cleanUrl.includes('lh3.googleusercontent.com') || cleanUrl.startsWith('data:image') || cleanUrl.includes('googleusercontent.com/profile/picture')) {
        return cleanUrl;
    }
    
    // แกะรหัสไอดีของรูปภาพจากลิงก์แชร์ของ Google Drive ปกติ
    let fileId = '';
    const regLongFormat = /\/file\/d\/([^\/]+)/;
    const regQueryFormat = /[?&]id=([^&]+)/;

    if (regLongFormat.test(cleanUrl)) {
        fileId = cleanUrl.match(regLongFormat)[1];
    } else if (regQueryFormat.test(cleanUrl)) {
        fileId = cleanUrl.match(regQueryFormat)[1];
    }

    // 🌟 แก้ไขจุดนี้: ใส่เครื่องหมาย $ หน้าปีกกาให้สมบูรณ์ เพื่อให้ระบบดึงค่ารหัสไฟล์ไปต่อเป็นลิงก์รูปภาพที่ถูกต้อง
    if (fileId) {
        return `https://lh3.googleusercontent.com/d/$${fileId}`;
    }

    return cleanUrl;
}