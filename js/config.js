// ==========================================
// 🛠️ CONFIGURATION LAYER (เชื่อมต่อหลังบ้าน - หน้าเคาน์เตอร์)
// ==========================================
const SUPABASE_URL = "https://botegyznlpltwrrepdeq.supabase.co";

// 🌟 ตัวเว็บหน้าบ้านต้องใช้ตัวย่อพับลิช (anon key) ห้ามเอาคีย์ลับหลังบ้านมาปนกันครับ
const SUPABASE_KEY = "sb_publishable_gCCJxJnjeqoC01JbqM3MHA_PTdvtVZR";

// ผูกตัวแปรหลักสำหรับใช้สิทธิ์เรียกใช้บริการคลาวด์
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);