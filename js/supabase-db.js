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
    }
};