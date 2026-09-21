const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const { requireCron, requireAppPost, voteEventKey } = require("../../api/_request-guards");

function response() {
    return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
function load(file, mocks) {
    const filename = path.resolve(__dirname, "../../api", file);
    const localRequire = createRequire(filename);
    const context = { module: { exports: {} }, require: (name) => mocks[name] ?? localRequire(name), process, console: { error() {}, warn() {} }, URL, URLSearchParams };
    vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
    return context.module.exports;
}
const appRequest = (body) => ({ method: "POST", headers: { origin: "https://club.example", host: "club.example", "content-type": "application/json" }, body });

test("cron authentication fails closed without a secret and rejects forged credentials", () => {
    const saved = process.env.CRON_SECRET;
    try {
        delete process.env.CRON_SECRET;
        let res = response();
        assert.equal(requireCron({ headers: {} }, res), false);
        assert.equal(res.statusCode, 503);
        process.env.CRON_SECRET = "a-test-server-secret";
        res = response();
        assert.equal(requireCron({ headers: { authorization: "Bearer wrong" } }, res), false);
        assert.equal(res.statusCode, 401);
        assert.equal(requireCron({ headers: { authorization: "Bearer a-test-server-secret" } }, response()), true);
    } finally {
        if (saved === undefined) delete process.env.CRON_SECRET;
        else process.env.CRON_SECRET = saved;
    }
});

test("app mutation endpoints reject cross-origin and form requests", () => {
    assert.equal(requireAppPost(appRequest({}), response()), true);
    for (const headers of [
        { origin: "https://attacker.example", host: "club.example", "content-type": "application/json" },
        { origin: "https://club.example", host: "club.example", "content-type": "text/plain" },
        { host: "club.example", "content-type": "application/json" },
    ]) assert.equal(requireAppPost({ method: "POST", headers }, response()), false);
});

test("all direct notification and cron routes reject unauthenticated requests before accessing data", async () => {
    for (const file of ["send-reaction-notification.js", "send-song-added-notification.js", "send-reminders.js", "send-add-song-reminders.js", "cleanup-push-subscriptions.js"]) {
        let accessed = false;
        const handler = load(file, { "./_push-utils": { getServiceSupabase() { accessed = true; throw Error("unexpected access"); } } });
        const res = response();
        await handler({ method: "POST", headers: {}, body: {} }, res);
        assert.ok([401, 503].includes(res.statusCode), file);
        assert.equal(accessed, false, file);
    }
});

test("reaction notification uses the stored author and song, ignoring fabricated payload fields", async () => {
    const vote = { id: "v1", songId: "s1", voter: "실제 작성자", member_id: "m1", decision: "승격", rating: 4, reason: "실제 평가" };
    const tables = { votes: [vote], songs: [{ id: "s1", title: "실제 곡" }], push_subscriptions: [{ member_id: "m2", endpoint: "test" }], members: [] };
    const supabase = { from(table) {
        let rows = tables[table];
        return {
            select() { return this; },
            eq(key, value) { if (key !== "is_active") rows = rows.filter((r) => r[key] === value); return this; },
            async maybeSingle() { return { data: rows[0] ?? null, error: null }; },
            then(resolve) { return Promise.resolve({ data: rows, error: null }).then(resolve); },
        };
    } };
    const sent = [];
    const handler = load("send-reaction-notification.js", { "./_push-utils": {
        getServiceSupabase: () => supabase, configureWebPush() {}, readJsonBody: async (req) => req.body,
        sendDedupedNotification: async (args) => { sent.push(args); return { count: 1, skipped: false }; },
    } });
    for (const notificationEventId of ["fake-1", "fake-2"]) {
        await handler.send({ method: "POST", body: { voteId: "v1", songId: "fake", voterName: "fake", decision: "방출", notificationKind: "update", notificationEventId } }, response());
    }
    assert.equal(sent[0].body, "실제 작성자님이 실제 곡의 평가를 수정했어요.");
    assert.equal(sent[0].url, "/onochoo?song=s1&vote=v1");
    assert.equal(sent[0].dedupeKey, sent[1].dedupeKey);
    assert.notEqual(voteEventKey(vote), voteEventKey({ ...vote, reason: "새 평가" }));
});

test("saving resolves the selected profile server-side and only changed successful saves notify", async () => {
    const previousUrl = process.env.SUPABASE_URL;
    const previousAnon = process.env.SUPABASE_ANON_KEY;
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-anon";
    try {
        const calls = [], notices = [];
        let changed = true, failed = false;
        const client = {
            from() { return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { id: "m1", name: "서버 이름" }, error: null }; } }; },
            async rpc(name, input) { calls.push({ name, input }); return failed ? { error: { message: "rejected" } } : { error: null, data: [{ vote_id: "v1", is_new: false, changed }] }; },
        };
        const handler = load("save-activity.js", {
            "@supabase/supabase-js": { createClient: (_url, key) => { assert.equal(key, "test-anon"); return client; } },
            "./_push-utils": { readJsonBody: async (req) => req.body },
            "./send-reaction-notification": { send: async (req) => notices.push(req.body) },
        });
        const req = appRequest({ kind: "vote", memberId: "m1", voterName: "가짜 이름", songId: "s1", decision: "승격", rating: 3.5, reason: "좋아요" });
        const res = response();
        await handler(req, res);
        assert.equal(res.statusCode, 200);
        assert.equal(calls[0].input.p_voter, "서버 이름");
        assert.equal(notices.length, 1);
        changed = false;
        await handler(req, response());
        assert.equal(notices.length, 1);
        failed = true;
        const failedRes = response();
        await handler(req, failedRes);
        assert.equal(failedRes.statusCode, 400);
        assert.equal(notices.length, 1);
        const invalid = response();
        await handler(appRequest({ ...req.body, rating: 3.2 }), invalid);
        assert.equal(invalid.statusCode, 400);
    } finally {
        if (previousUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousUrl;
        if (previousAnon === undefined) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = previousAnon;
    }
});
