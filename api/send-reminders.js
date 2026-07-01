const {
    configureWebPush,
    getKstDayRange,
    getServiceSupabase,
    sendDedupedNotification,
} = require("./_push-utils");

function groupSubscriptionsByMemberId(subscriptions) {
    const byMemberId = new Map();
    for (const subscription of subscriptions ?? []) {
        if (!byMemberId.has(subscription.member_id)) {
            byMemberId.set(subscription.member_id, []);
        }
        byMemberId.get(subscription.member_id).push(subscription);
    }
    return byMemberId;
}

function hasVoteByMember(votes, songId, member) {
    return votes.some((vote) => {
        if (vote.songId !== songId) return false;
        if (vote.member_id && member.id) return vote.member_id === member.id;
        return vote.voter === member.name;
    });
}

module.exports = async (req, res) => {
    if (req.method !== "GET" && req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        configureWebPush();
        const supabase = getServiceSupabase();
        const { dateKey } = getKstDayRange();
        const oneDayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const [membersResult, songsResult, votesResult, mutigoeulResult, subscriptionsResult] = await Promise.all([
            supabase.from("members").select("id,name"),
            supabase.from("songs").select("id,title,artist,createdAt").lte("createdAt", oneDayAgoIso),
            supabase.from("votes").select("songId,voter,member_id"),
            supabase.from("mutigoeul_songs").select("songId"),
            supabase
                .from("push_subscriptions")
                .select("member_id,endpoint,p256dh,auth")
                .eq("is_active", true),
        ]);

        const error = membersResult.error || songsResult.error || votesResult.error || mutigoeulResult.error || subscriptionsResult.error;
        if (error) throw error;

        const mutigoeulSongIds = new Set((mutigoeulResult.data ?? []).map((item) => item.songId));
        const reminderSongs = (songsResult.data ?? []).filter((song) => !mutigoeulSongIds.has(song.id));
        const subscriptionsByMemberId = groupSubscriptionsByMemberId(subscriptionsResult.data);

        let sentCount = 0;
        let memberCount = 0;
        let skipped = 0;

        for (const member of membersResult.data ?? []) {
            const pendingSongs = reminderSongs.filter((song) => !hasVoteByMember(votesResult.data ?? [], song.id, member));
            if (pendingSongs.length === 0) {
                skipped += 1;
                continue;
            }

            const firstSong = pendingSongs[0];
            const body = pendingSongs.length === 1
                ? `${firstSong.title} - ${firstSong.artist} 평가해 주세요.`
                : `${firstSong.title} 외 ${pendingSongs.length - 1}곡을 평가해 주세요.`;
            const result = await sendDedupedNotification({
                supabase,
                subscriptions: subscriptionsByMemberId.get(member.id) ?? [],
                memberId: member.id,
                type: "vote-reminder",
                dedupeKey: `vote-reminder:${dateKey}:${member.id}`,
                title: "평가할 곡이 남아있어요 🎧",
                body,
                url: "/",
                relatedSongId: firstSong.id,
            });

            if (result.skipped) {
                skipped += 1;
                continue;
            }

            memberCount += 1;
            sentCount += result.count;
        }

        return res.status(200).json({ ok: true, members: memberCount, count: sentCount, skipped });
    } catch (error) {
        console.error("send-reminders failed:", error);
        return res.status(500).json({ ok: false, error: error.message || "리마인드 전송 실패" });
    }
};
