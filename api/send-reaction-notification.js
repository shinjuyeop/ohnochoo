const {
    configureWebPush,
    getServiceSupabase,
    readJsonBody,
    sendDedupedNotification,
} = require("./_push-utils");

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
            .select("id,title,artist,adder,adder_member_id")
            .eq("id", songId)
            .maybeSingle();

        if (songError) throw songError;
        if (!song) return res.status(404).json({ error: "곡을 찾을 수 없습니다." });

        let recipientMember = null;
        if (song.adder_member_id) {
            const { data, error } = await supabase
                .from("members")
                .select("id,name")
                .eq("id", song.adder_member_id)
                .maybeSingle();
            if (error) throw error;
            recipientMember = data;
        }

        if (!recipientMember && song.adder) {
            const { data, error } = await supabase
                .from("members")
                .select("id,name")
                .eq("name", song.adder)
                .maybeSingle();
            if (error) throw error;
            recipientMember = data;
        }

        if (!recipientMember) {
            return res.status(200).json({ ok: true, count: 0, skipped: "no-recipient" });
        }

        if ((voterMemberId && recipientMember.id === voterMemberId) || (!voterMemberId && recipientMember.name === voterName)) {
            return res.status(200).json({ ok: true, count: 0, skipped: "self-vote" });
        }

        const { data: subscriptions, error: subscriptionsError } = await supabase
            .from("push_subscriptions")
            .select("member_id,endpoint,p256dh,auth")
            .eq("member_id", recipientMember.id)
            .eq("is_active", true);

        if (subscriptionsError) throw subscriptionsError;

        const title = isUpdate ? "내가 올린 곡 평가가 수정됐어요 ✏️" : "내가 올린 곡에 새 평가가 달렸어요 💬";
        const body = isUpdate
            ? `${voterName}이 ${song.title} 평가를 ${decision}로 수정했어요.`
            : `${voterName}이 ${song.title}에 ${decision} 평가를 남겼어요.`;
        const dedupeKey = isUpdate
            ? `reaction-update:${voteId}:${notificationEventId || Date.now()}`
            : `reaction-new:${voteId}`;

        const result = await sendDedupedNotification({
            supabase,
            subscriptions: subscriptions ?? [],
            memberId: recipientMember.id,
            type: isUpdate ? "reaction-update" : "reaction-new",
            dedupeKey,
            title,
            body,
            url: "/",
            relatedSongId: song.id,
            relatedVoteId: voteId,
        });

        return res.status(200).json({
            ok: true,
            count: result.count,
            skipped: result.skipped ? result.reason : false,
        });
    } catch (error) {
        console.error("send-reaction-notification failed:", error);
        return res.status(500).json({ ok: false, error: error.message || "평가 반응 알림 전송 실패" });
    }
};
