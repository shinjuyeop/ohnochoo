const { getServiceSupabase, readJsonBody } = require("./_push-utils");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { endpoint } = await readJsonBody(req);
        if (!endpoint) {
            return res.status(400).json({ error: "endpoint가 필요합니다." });
        }

        const supabase = getServiceSupabase();
        const { error } = await supabase
            .from("push_subscriptions")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("endpoint", endpoint);

        if (error) throw error;

        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error("remove-subscription failed:", error);
        return res.status(500).json({ error: error.message || "구독 해지 실패" });
    }
};
