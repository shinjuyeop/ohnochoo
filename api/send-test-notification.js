const {
    configureWebPush,
    getServiceSupabase,
    readJsonBody,
    sendPushToSubscription,
} = require("./_push-utils");
const { requireAppPost } = require("./_request-guards");

module.exports = async (req, res) => {
    if (!requireAppPost(req, res)) return;
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { memberId, subscription } = await readJsonBody(req);
        if (!memberId || !subscription?.endpoint || !subscription?.keys?.auth) {
            return res.status(400).json({ error: "이 기기의 알림 구독이 필요합니다." });
        }

        configureWebPush();
        const supabase = getServiceSupabase();
        const { data: subscriptions, error } = await supabase
            .from("push_subscriptions")
            .select("endpoint,p256dh,auth")
            .eq("member_id", memberId)
            .eq("endpoint", subscription.endpoint)
            .eq("auth", subscription.keys.auth)
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
