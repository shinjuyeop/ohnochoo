const { getServiceSupabase } = require("./_push-utils");

const INACTIVE_RETENTION_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

module.exports = async (req, res) => {
    if (req.method !== "GET" && req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const supabase = getServiceSupabase();
        const cutoffIso = new Date(Date.now() - INACTIVE_RETENTION_DAYS * MS_PER_DAY).toISOString();

        const { data, error } = await supabase
            .from("push_subscriptions")
            .delete()
            .eq("is_active", false)
            .lt("updated_at", cutoffIso)
            .select("id");

        if (error) throw error;

        return res.status(200).json({
            ok: true,
            deleted: data?.length ?? 0,
            cutoff: cutoffIso,
        });
    } catch (error) {
        console.error("cleanup-push-subscriptions failed:", error);
        return res.status(500).json({ ok: false, error: error.message || "구독 정리 실패" });
    }
};
