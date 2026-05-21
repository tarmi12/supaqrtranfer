// ==========================================
// 🛠️ CONFIGURATION LAYER (เชื่อมต่อหลังบ้าน)
// ==========================================
const SUPABASE_URL = "https://botegyznlpltwrrepdeq.supabase.co";
const SUPABASE_KEY = "sb_publishable_gCCJxJnjeqoC01JbqM3MHA_PTdvtVZR";

// ผูกตัวแปรหลักสำหรับใช้สิทธิ์เรียกใช้บริการคลาวด์
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);