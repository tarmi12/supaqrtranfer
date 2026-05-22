/**
 * แกะวิเคราะห์และแปลงลิงก์รูปภาพ รองรับ Supabase URL, LINE CDN และแปลง Google Drive ให้แสดงผลได้ทันที
 * @param {string} url ลิงก์จากฐานข้อมูล
 * @returns {string} URL รูปภาพที่พร้อมใช้งานในแท็ก img
 */
function getDirectGoogleDriveUrl(url) {
    if (!url) return '';
    const cleanUrl = url.trim();
    
    // หากเป็นลิงก์ตรงที่เปิดได้อยู่แล้ว หรือรูปภาพ Base64 ให้ส่งออกไปใช้งานตรงๆ ได้เลย
    if (cleanUrl.includes('supabase.co') || cleanUrl.includes('line-apps.com') || cleanUrl.includes('lh3.googleusercontent.com') || cleanUrl.startsWith('data:image')) {
        return cleanUrl;
    }
    
    // หากหลุดมาเป็นลิงก์แชร์ของ Google Drive ปกติ ให้แปลงโครงสร้างเป็นลิงก์ตรงสำหรับเปิดแสดงผล
    let fileId = '';
    const regLongFormat = /\/file\/d\/([^\/]+)/;
    const regQueryFormat = /[?&]id=([^&]+)/;

    if (regLongFormat.test(cleanUrl)) {
        fileId = cleanUrl.match(regLongFormat)[1];
    } else if (regQueryFormat.test(cleanUrl)) {
        fileId = cleanUrl.match(regQueryFormat)[1];
    }

    if (fileId) {
        return `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    return cleanUrl;
}