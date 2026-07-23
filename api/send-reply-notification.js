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
        const { replyId } = await readJsonBody(req);
        if (!replyId) {
            return res.status(400).json({ error: "replyId가 필요합니다." });
        }

        const supabase = getServiceSupabase();

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
    } catch (error) {
        console.error("send-reply-notification failed:", error);
        return res.status(500).json({ ok: false, error: error.message || "답글 알림 전송 실패" });
    }
};
