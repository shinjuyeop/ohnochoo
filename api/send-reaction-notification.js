const {
    configureWebPush,
    getServiceSupabase,
    readJsonBody,
    sendDedupedNotification,
} = require("./_push-utils");

function groupSubscriptionsByMemberId(subscriptions) {
    const subscriptionsByMemberId = new Map();
    for (const subscription of subscriptions ?? []) {
        if (!subscription.member_id) continue;
        if (!subscriptionsByMemberId.has(subscription.member_id)) {
            subscriptionsByMemberId.set(subscription.member_id, []);
        }
        subscriptionsByMemberId.get(subscription.member_id).push(subscription);
    }
    return subscriptionsByMemberId;
}

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const {
            voteId,
            songId,
            voterName,
            voterMemberId,
            decision,
            isUpdate: requestedIsUpdate = false,
            notificationKind = "new",
            notificationEventId,
        } = await readJsonBody(req);
        if (!voteId || !songId || !voterName || !decision) {
            return res.status(400).json({ error: "voteId, songId, voterName, decision이 필요합니다." });
        }

        const isUpdate = requestedIsUpdate || notificationKind === "update";

        configureWebPush();
        const supabase = getServiceSupabase();

        const { data: song, error: songError } = await supabase
            .from("songs")
            .select("id,title")
            .eq("id", songId)
            .maybeSingle();

        if (songError) throw songError;
        if (!song) return res.status(404).json({ error: "곡을 찾을 수 없습니다." });

        const { data: subscriptions, error: subscriptionsError } = await supabase
            .from("push_subscriptions")
            .select("member_id,endpoint,p256dh,auth")
            .eq("is_active", true);

        if (subscriptionsError) throw subscriptionsError;

        const title = isUpdate ? "평가가 수정됐어요 ✏️" : "새 평가가 등록됐어요 💬";
        const body = isUpdate
            ? `${voterName}님이 ${song.title}의 평가를 수정했어요.`
            : `${voterName}님이 ${song.title}에 ${decision} 평가를 남겼어요.`;
        const notificationKey = isUpdate
            ? `reaction-update:${voteId}:${notificationEventId || Date.now()}`
            : `reaction-new:${voteId}`;
        const subscriptionsByMemberId = groupSubscriptionsByMemberId(subscriptions);
        let sentCount = 0;
        let memberCount = 0;
        let skippedCount = 0;

        for (const [memberId, memberSubscriptions] of subscriptionsByMemberId) {
            if (isUpdate && voterMemberId && memberId === voterMemberId) {
                skippedCount += 1;
                continue;
            }

            const result = await sendDedupedNotification({
                supabase,
                subscriptions: memberSubscriptions,
                memberId,
                type: isUpdate ? "reaction-update" : "reaction-new",
                dedupeKey: `${notificationKey}:${memberId}`,
                title,
                body,
                url: "/",
                relatedSongId: song.id,
                relatedVoteId: voteId,
            });

            if (result.skipped) {
                skippedCount += 1;
                continue;
            }

            memberCount += 1;
            sentCount += result.count;
        }

        return res.status(200).json({
            ok: true,
            members: memberCount,
            count: sentCount,
            skipped: skippedCount,
        });
    } catch (error) {
        console.error("send-reaction-notification failed:", error);
        return res.status(500).json({ ok: false, error: error.message || "평가 반응 알림 전송 실패" });
    }
};
