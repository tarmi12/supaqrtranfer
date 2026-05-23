// ==========================================
// 🗄️ SUPABASE DATA SERVICE (คำสั่งจัดการข้อมูลดิบ)
// ==========================================

const SupabaseDB = {
    /**
     * ดึงข้อมูลรายชื่อลูกค้าทั้งหมดในตารางคลังหลัก
     */
    async fetchCustomers() {
        let { data, error } = await supabaseClient
            .from('customers')
            .select('name, phone, bank_name, bank_account, bank_account_name')
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * ดึงประวัติรายการธุรกรรมการโอนเงินทั้งหมดเพื่อกางในตารางรายงานสรุป
     */
    async fetchTransactionsReport() {
        let { data, error } = await supabaseClient
            .from('transactions')
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * ดึงจำนวนธุรกรรมเฉพาะวันนี้เพื่อมารันเลข Running บิล
     */
    async countTodayTransactions() {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

        let { count, error } = await supabaseClient
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .gte('timestamp', startOfDay)
            .lte('timestamp', endOfDay);

        if (error) {
            console.error("นับธุรกรรมสำหรับ Running บิลล้มเหลว:", error.message);
            return 0;
        }
        return count || 0;
    },

    /**
     * เพิ่มรายชื่อลูกค้าใหม่กรณีคีย์สดหน้าร้าน (Upsert ป้องกันชื่อซ้ำ)
     */
    async upsertCustomer(customerData) {
        const { error } = await supabaseClient
            .from('customers')
            .upsert(customerData, { onConflict: 'name' });

        if (error) console.error("Auto customer register failure log:", error.message);
    },

    /**
     * บันทึกข้อมูลบิลธุรกรรมจ่ายเงินโอนรายใหม่เข้าตารางหลัก
     */
    async insertTransaction(transactionPayload) {
        const { error } = await supabaseClient
            .from('transactions')
            .insert([transactionPayload]);

        if (error) throw error;
    },

    /**
     * อัปเดตสถิติจำนวนครั้งการสั่งพิมพ์กรณีที่พนักงานกดพิมพ์ซ้ำ (Reprint)
     */
    async updatePrintCount(txId, newCount) {
        const { error } = await supabaseClient
            .from('transactions')
            .update({ print_count: newCount })
            .eq('id', txId);

        if (error) throw error;
    },

    /**
     * 🌟 ยกเลิกรายการธุรกรรมโดยระบุหมายเหตุความจำเป็น
     * @param {string} txId รหัสไอดีรายการธุรกรรมในฐานข้อมูล
     * @param {string} remark เหตุผล/หมายเหตุในการยกเลิกบิล
     */
    async cancelTransaction(txId, remark) {
        const { error } = await supabaseClient
            .from('transactions')
            .update({ 
                status: 'cancelled', 
                cancel_remark: remark,
                cancelled_at: new Date().toISOString()
            })
            .eq('id', txId);

        if (error) throw error;
    }
};