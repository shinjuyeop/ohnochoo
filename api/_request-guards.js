const { createHash, timingSafeEqual } = require("node:crypto");

function matchesSecret(actual, expected) {
    if (typeof actual !== "string" || !expected) return false;
    return timingSafeEqual(createHash("sha256").update(actual).digest(), createHash("sha256").update(expected).digest());
}

function requireCron(req, res) {
    if (!process.env.CRON_SECRET) {
        res.status(503).json({ error: "예약 작업 인증이 설정되지 않았습니다." });
        return false;
    }
    if (!matchesSecret(req.headers?.authorization, `Bearer ${process.env.CRON_SECRET}`)) {
        res.status(401).json({ error: "인증이 필요합니다." });
        return false;
    }
    return true;
}

// This prevents cross-site form requests, not impersonation in the profile-picker model.
function requireAppPost(req, res) {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return false;
    }
    const origin = req.headers?.origin;
    const host = req.headers?.host;
    let sameOrigin = false;
    try { sameOrigin = new URL(origin).host === host; } catch { /* Invalid origin. */ }
    if (!sameOrigin || !String(req.headers?.["content-type"] || "").startsWith("application/json")) {
        res.status(403).json({ error: "앱에서 다시 시도해 주세요." });
        return false;
    }
    return true;
}

function songLink(songId, voteId, replyId) {
    const params = new URLSearchParams({ song: songId });
    if (voteId) params.set("vote", voteId);
    if (replyId) params.set("reply", replyId);
    return `/onochoo?${params}`;
}

function voteEventKey(vote) {
    // A caller cannot generate repeated deliveries by inventing event IDs or toggling kind.
    const content = JSON.stringify([vote.id, vote.member_id, vote.voter, vote.decision, Number(vote.rating), vote.reason.trim()]);
    return `reaction:${vote.id}:${createHash("sha256").update(content).digest("hex").slice(0, 24)}`;
}

module.exports = { matchesSecret, requireCron, requireAppPost, songLink, voteEventKey };
