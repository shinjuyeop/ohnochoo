const { getServiceSupabase, readJsonBody } = require("./_push-utils");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { memberId, subscription, userAgent } = await readJsonBody(req);
        const endpoint = subscription?.endpoint;
        const p256dh = subscription?.keys?.p256dh;
        const auth = subscription?.keys?.auth;

        if (!memberId || !endpoint || !p256dh || !auth) {
            return res.status(400).json({ error: "구독 정보가 부족합니다." });
        }

        const supabase = getServiceSupabase();
        const { error } = await supabase.from("push_subscriptions").upsert(
            {
                member_id: memberId,
                endpoint,
                p256dh,
                auth,
                user_agent: userAgent || null,
                is_active: true,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "endpoint" },
        );

        if (error) throw error;

        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error("save-subscription failed:", error);
        return res.status(500).json({ error: error.message || "구독 저장 실패" });
    }
};
