const webPush = require("web-push");
const { createClient } = require("@supabase/supabase-js");

function getServiceSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.");
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
        },
    });
}

function configureWebPush() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:example@example.com";

    if (!publicKey || !privateKey) {
        throw new Error("VAPID_PUBLIC_KEY 또는 VAPID_PRIVATE_KEY가 설정되지 않았습니다.");
    }

    webPush.setVapidDetails(subject, publicKey, privateKey);
}

async function readJsonBody(req) {
    if (req.body && typeof req.body === "object") return req.body;
    if (typeof req.body === "string") return JSON.parse(req.body || "{}");

    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }

    const rawBody = Buffer.concat(chunks).toString("utf8");
    return rawBody ? JSON.parse(rawBody) : {};
}

async function sendPushToSubscription({ supabase, subscription, payload }) {
    const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
        },
    };

    try {
        await webPush.sendNotification(pushSubscription, JSON.stringify(payload));
        return true;
    } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
            await supabase
                .from("push_subscriptions")
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq("endpoint", subscription.endpoint);
        }

        throw error;
    }
}

function getKstDateParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const [year, month, day] = formatter.format(date).split("-").map(Number);

    return { year, month, day, dateKey: formatter.format(date) };
}

function getKstDayRange(date = new Date()) {
    const { year, month, day, dateKey } = getKstDateParts(date);
    const startUtc = new Date(Date.UTC(year, month - 1, day, -9, 0, 0, 0));
    const nextStartUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
    const reminderCutoffUtc = new Date(Date.UTC(year, month - 1, day, 11, 0, 0, 0));

    return {
        dateKey,
        startIso: startUtc.toISOString(),
        nextStartIso: nextStartUtc.toISOString(),
        reminderCutoffIso: reminderCutoffUtc.toISOString(),
    };
}

async function hasNotificationLog(supabase, dedupeKey) {
    const { data, error } = await supabase
        .from("notification_logs")
        .select("id")
        .eq("dedupe_key", dedupeKey)
        .maybeSingle();

    if (error) throw error;
    return Boolean(data);
}

async function writeNotificationLog(supabase, log) {
    const { error } = await supabase.from("notification_logs").insert({
        member_id: log.memberId,
        type: log.type,
        dedupe_key: log.dedupeKey,
        title: log.title,
        body: log.body,
        related_song_id: log.relatedSongId || null,
        related_vote_id: log.relatedVoteId || null,
        sent_at: new Date().toISOString(),
        status: log.status || "sent",
    });

    if (error && error.code !== "23505") throw error;
    return !error;
}

async function sendDedupedNotification({
    supabase,
    subscriptions,
    memberId,
    type,
    dedupeKey,
    title,
    body,
    url = "/",
    relatedSongId = null,
    relatedVoteId = null,
}) {
    if (await hasNotificationLog(supabase, dedupeKey)) {
        return { skipped: true, reason: "deduped", count: 0 };
    }

    const activeSubscriptions = subscriptions ?? [];
    if (activeSubscriptions.length === 0) {
        return { skipped: true, reason: "no-subscriptions", count: 0 };
    }

    const logInserted = await writeNotificationLog(supabase, {
        memberId,
        type,
        dedupeKey,
        title,
        body,
        relatedSongId,
        relatedVoteId,
        status: "sending",
    });

    if (!logInserted) {
        return { skipped: true, reason: "deduped", count: 0 };
    }

    let count = 0;
    for (const subscription of activeSubscriptions) {
        try {
            await sendPushToSubscription({
                supabase,
                subscription,
                payload: { title, body, url },
            });
            count += 1;
        } catch (error) {
            console.error("push failed:", error);
        }
    }

    await supabase
        .from("notification_logs")
        .update({ status: count > 0 ? "sent" : "failed" })
        .eq("dedupe_key", dedupeKey);

    return { skipped: false, count };
}

module.exports = {
    configureWebPush,
    getKstDayRange,
    getServiceSupabase,
    readJsonBody,
    sendDedupedNotification,
    sendPushToSubscription,
};
