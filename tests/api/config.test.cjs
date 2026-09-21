const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function config(env) {
    const context = { module: { exports: {} }, process: { env } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../../api/config.js"), "utf8"), context);
    return context.module.exports;
}

function response() {
    return {
        statusCode: 200, headers: {},
        setHeader(name, value) { this.headers[name] = value; },
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = JSON.parse(JSON.stringify(body)); return this; },
    };
}

test("public config and the legacy push-key alias preserve their response shapes", () => {
    const handler = config({
        SUPABASE_URL: "https://test.supabase.co", SUPABASE_ANON_KEY: "public-anon",
        VAPID_PUBLIC_KEY: "public-push", SUPABASE_SERVICE_ROLE_KEY: "private-service",
        VAPID_PRIVATE_KEY: "private-push", CRON_SECRET: "private-cron",
    });
    const normal = response();
    handler({ query: {} }, normal);
    assert.deepEqual(normal.body, { supabaseUrl: "https://test.supabase.co", supabaseAnonKey: "public-anon" });
    const rewrite = require("../../vercel.json").rewrites.find((rule) => rule.source === "/api/vapid-public-key");
    const target = new URL(rewrite.destination, "https://club.example");
    assert.equal(target.pathname, "/api/config");
    const push = response();
    handler({ query: Object.fromEntries(target.searchParams) }, push);
    assert.deepEqual(push.body, { publicKey: "public-push" });
    assert.equal(push.statusCode, 200);
    assert.equal(push.headers["Cache-Control"], "no-store");
});

test("an unset push key fails only the push config, allowing the app to load", () => {
    const handler = config({ SUPABASE_URL: "https://test.supabase.co", SUPABASE_ANON_KEY: "public-anon" });
    const push = response();
    handler({ query: { resource: "vapid-public-key" } }, push);
    assert.equal(push.statusCode, 500);
    assert.match(push.body.error, /VAPID_PUBLIC_KEY/);
    const normal = response();
    handler({}, normal);
    assert.equal(normal.statusCode, 200);
    assert.equal(normal.body.supabaseAnonKey, "public-anon");
});
