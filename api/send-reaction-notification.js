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

async function sendReplyNotification({ supabase, replyId, res }) {
    if (!replyId) {
        return res.status(400).json({ error: "replyId가 필요합니다." });
    }

    const { data: reply, error: replyError } = await supabase
        .from("vote_replies")
        .select("id,vote_id,author,member_id")
        .eq("id", replyId)
        .maybeSingle();
    if (replyError) throw replyError;
    if (!reply) return res.status(404).json({ error: "답글을 찾을 수 없습니다." });

    const { data: vote, error: voteError } = await supabase
        .from("votes")
        .select("id,songId,voter,member_id")
        .eq("id", reply.vote_id)
        .maybeSingle();
    if (voteError) throw voteError;
    if (!vote) return res.status(404).json({ error: "평가를 찾을 수 없습니다." });

    let recipientMemberId = vote.member_id;
    if (!recipientMemberId) {
        const { data: member, error: memberError } = await supabase
            .from("members")
            .select("id")
            .eq("name", vote.voter)
            .maybeSingle();
        if (memberError) throw memberError;
        recipientMemberId = member?.id ?? null;
    }

    const isSelfReply = Boolean(
        (recipientMemberId && reply.member_id === recipientMemberId)
        || reply.author === vote.voter,
    );
    if (!recipientMemberId || isSelfReply) {
        return res.status(200).json({ ok: true, members: 0, count: 0, skipped: 1 });
    }

    const [{ data: song, error: songError }, { data: subscriptions, error: subscriptionsError }] = await Promise.all([
        supabase
            .from("songs")
            .select("id,title")
            .eq("id", vote.songId)
            .maybeSingle(),
        supabase
            .from("push_subscriptions")
            .select("member_id,endpoint,p256dh,auth")
            .eq("member_id", recipientMemberId)
            .eq("is_active", true),
    ]);
    const error = songError || subscriptionsError;
    if (error) throw error;
    if (!song) return res.status(404).json({ error: "곡을 찾을 수 없습니다." });

    configureWebPush();
    const result = await sendDedupedNotification({
        supabase,
        subscriptions: subscriptions ?? [],
        memberId: recipientMemberId,
        type: "vote-reply",
        dedupeKey: `vote-reply:${reply.id}:${recipientMemberId}`,
        title: "내 평가에 답글이 달렸어요 💬",
        body: `${reply.author}님이 ${song.title}의 평가에 답글을 남겼어요.`,
        url: "/",
        relatedSongId: song.id,
        relatedVoteId: vote.id,
    });

    return res.status(200).json({
        ok: true,
        members: result.skipped ? 0 : 1,
        count: result.count,
        skipped: result.skipped ? 1 : 0,
    });
}

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const requestBody = await readJsonBody(req);
        const supabase = getServiceSupabase();
        if (requestBody.notificationKind === "reply") {
            return await sendReplyNotification({
                supabase,
                replyId: requestBody.replyId,
                res,
            });
        }

        const {
            voteId,
            songId,
            voterName,
            voterMemberId,
            decision,
            isUpdate: requestedIsUpdate = false,
            notificationKind = "new",
            notificationEventId,
        } = requestBody;
        if (!voteId || !songId || !voterName || !decision) {
            return res.status(400).json({ error: "voteId, songId, voterName, decision이 필요합니다." });
        }

        const isUpdate = requestedIsUpdate || notificationKind === "update";

        configureWebPush();

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
