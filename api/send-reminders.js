const {
    configureWebPush,
    getServiceSupabase,
    sendPushToSubscription,
} = require("./_push-utils");

module.exports = async (req, res) => {
    if (req.method !== "GET" && req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        configureWebPush();
        const supabase = getServiceSupabase();
        const oneDayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const [membersResult, songsResult, votesResult, mutigoeulResult, subscriptionsResult] = await Promise.all([
            supabase.from("members").select("id,name"),
            supabase.from("songs").select("id,title,artist,createdAt").lte("createdAt", oneDayAgoIso),
            supabase.from("votes").select("songId,voter"),
            supabase.from("mutigoeul_songs").select("songId"),
            supabase
                .from("push_subscriptions")
                .select("member_id,endpoint,p256dh,auth")
                .eq("is_active", true),
        ]);

        const error = membersResult.error || songsResult.error || votesResult.error || mutigoeulResult.error || subscriptionsResult.error;
        if (error) throw error;

        const mutigoeulSongIdSet = new Set((mutigoeulResult.data ?? []).map((item) => item.songId));
        const reminderSongs = (songsResult.data ?? []).filter((song) => !mutigoeulSongIdSet.has(song.id));
        const votesByMemberName = new Map();

        for (const vote of votesResult.data ?? []) {
            if (!votesByMemberName.has(vote.voter)) {
                votesByMemberName.set(vote.voter, new Set());
            }
            votesByMemberName.get(vote.voter).add(vote.songId);
        }

        const subscriptionsByMemberId = new Map();
        for (const subscription of subscriptionsResult.data ?? []) {
            if (!subscriptionsByMemberId.has(subscription.member_id)) {
                subscriptionsByMemberId.set(subscription.member_id, []);
            }
            subscriptionsByMemberId.get(subscription.member_id).push(subscription);
        }

        let sentCount = 0;
        let memberCount = 0;

        for (const member of membersResult.data ?? []) {
            const subscriptions = subscriptionsByMemberId.get(member.id) ?? [];
            if (subscriptions.length === 0) continue;

            const votedSongIds = votesByMemberName.get(member.name) ?? new Set();
            const pendingSongs = reminderSongs.filter((song) => !votedSongIds.has(song.id));
            if (pendingSongs.length === 0) continue;

            memberCount += 1;
            const firstSong = pendingSongs[0];
            const body = pendingSongs.length === 1
                ? `${firstSong.title} - ${firstSong.artist} 평가가 기다리고 있어요.`
                : `${firstSong.title} 외 ${pendingSongs.length - 1}곡의 평가가 기다리고 있어요.`;

            for (const subscription of subscriptions) {
                try {
                    await sendPushToSubscription({
                        supabase,
                        subscription,
                        payload: {
                            title: "오노추 평가 리마인드",
                            body,
                            url: "/",
                        },
                    });
                    sentCount += 1;
                } catch (error) {
                    console.error("reminder push failed:", error);
                }
            }
        }

        return res.status(200).json({ ok: true, members: memberCount, count: sentCount });
    } catch (error) {
        console.error("send-reminders failed:", error);
        return res.status(500).json({ error: error.message || "리마인드 전송 실패" });
    }
};
