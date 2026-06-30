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

module.exports = {
    configureWebPush,
    getServiceSupabase,
    readJsonBody,
    sendPushToSubscription,
};
