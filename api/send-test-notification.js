const {
    configureWebPush,
    getServiceSupabase,
    readJsonBody,
    sendPushToSubscription,
} = require("./_push-utils");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { memberId } = await readJsonBody(req);
        if (!memberId) {
            return res.status(400).json({ error: "memberId가 필요합니다." });
        }

        configureWebPush();
        const supabase = getServiceSupabase();
        const { data: subscriptions, error } = await supabase
            .from("push_subscriptions")
            .select("endpoint,p256dh,auth")
            .eq("member_id", memberId)
            .eq("is_active", true);

        if (error) throw error;

        let sentCount = 0;
        for (const subscription of subscriptions ?? []) {
            try {
                await sendPushToSubscription({
                    supabase,
                    subscription,
                    payload: {
                        title: "알림 테스트",
                        body: "알림 설정이 잘 되었어요.",
                        url: "/",
                    },
                });
                sentCount += 1;
            } catch (error) {
                console.error("test push failed:", error);
            }
        }

        return res.status(200).json({ ok: true, count: sentCount });
    } catch (error) {
        console.error("send-test-notification failed:", error);
        return res.status(500).json({ error: error.message || "테스트 알림 전송 실패" });
    }
};
