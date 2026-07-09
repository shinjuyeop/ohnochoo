const {
    configureWebPush,
    getServiceSupabase,
    readJsonBody,
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

function isSongAddedByMember(song, member, fallbackAdderName) {
    if (song.adder_member_id && member.id) {
        return song.adder_member_id === member.id;
    }
    return song.adder === member.name || fallbackAdderName === member.name;
}

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { songId, adderName } = await readJsonBody(req);
        if (!songId) {
            return res.status(400).json({ error: "songId가 필요합니다." });
        }

        configureWebPush();
        const supabase = getServiceSupabase();

        const [songResult, membersResult, subscriptionsResult] = await Promise.all([
            supabase
                .from("songs")
                .select("id,title,artist,adder,adder_member_id")
                .eq("id", songId)
                .maybeSingle(),
            supabase.from("members").select("id,name"),
            supabase
                .from("push_subscriptions")
                .select("member_id,endpoint,p256dh,auth")
                .eq("is_active", true),
        ]);

        const error = songResult.error || membersResult.error || subscriptionsResult.error;
        if (error) throw error;
        if (!songResult.data) return res.status(404).json({ error: "곡을 찾을 수 없습니다." });

        const song = songResult.data;
        const subscriptionsByMemberId = groupSubscriptionsByMemberId(subscriptionsResult.data);
        const displayAdderName = song.adder || adderName || "누군가";
        const title = "새 오노추가 올라왔어요 🎵";
        const body = `${displayAdderName}님이 ${song.title} - ${song.artist}를 추가했어요.`;

        let sentCount = 0;
        let memberCount = 0;
        let skipped = 0;

        for (const member of membersResult.data ?? []) {
            if (isSongAddedByMember(song, member, adderName)) {
                skipped += 1;
                continue;
            }

            const result = await sendDedupedNotification({
                supabase,
                subscriptions: subscriptionsByMemberId.get(member.id) ?? [],
                memberId: member.id,
                type: "song-added",
                dedupeKey: `song-added:${song.id}:${member.id}`,
                title,
                body,
                url: "/",
                relatedSongId: song.id,
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
        console.error("send-song-added-notification failed:", error);
        return res.status(500).json({ ok: false, error: error.message || "오노추 추가 알림 전송 실패" });
    }
};
