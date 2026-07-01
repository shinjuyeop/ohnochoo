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

function isSongAddedByMember(song, member) {
    if (song.adder_member_id && member.id) {
        return song.adder_member_id === member.id;
    }
    return song.adder === member.name;
}

module.exports = async (req, res) => {
    if (req.method !== "GET" && req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        configureWebPush();
        const supabase = getServiceSupabase();
        const { dateKey, startIso, reminderCutoffIso } = getKstDayRange();

        const [membersResult, songsResult, subscriptionsResult] = await Promise.all([
            supabase.from("members").select("id,name"),
            supabase
                .from("songs")
                .select("id,adder,adder_member_id,createdAt")
                .gte("createdAt", startIso)
                .lte("createdAt", reminderCutoffIso),
            supabase
                .from("push_subscriptions")
                .select("member_id,endpoint,p256dh,auth")
                .eq("is_active", true),
        ]);

        const error = membersResult.error || songsResult.error || subscriptionsResult.error;
        if (error) throw error;

        const todaySongs = songsResult.data ?? [];
        const subscriptionsByMemberId = groupSubscriptionsByMemberId(subscriptionsResult.data);

        let sentCount = 0;
        let memberCount = 0;
        let skipped = 0;

        for (const member of membersResult.data ?? []) {
            const hasAddedToday = todaySongs.some((song) => isSongAddedByMember(song, member));
            if (hasAddedToday) {
                skipped += 1;
                continue;
            }

            const result = await sendDedupedNotification({
                supabase,
                subscriptions: subscriptionsByMemberId.get(member.id) ?? [],
                memberId: member.id,
                type: "add-song-reminder",
                dedupeKey: `add-song-reminder:${dateKey}:${member.id}`,
                title: "오노추",
                body: "오노추 안 올렸제, 빨리 올려라.",
                url: "/",
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
        console.error("send-add-song-reminders failed:", error);
        return res.status(500).json({ ok: false, error: error.message || "오노추 추가 리마인드 전송 실패" });
    }
};
