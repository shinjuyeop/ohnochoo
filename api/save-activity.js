const { createClient } = require("@supabase/supabase-js");
const { waitUntil } = require("@vercel/functions");
const { readJsonBody } = require("./_push-utils");
const { requireAppPost } = require("./_request-guards");
const { resolveAlbum } = require("./_apple-music-album");

async function deliver(handler, body) {
    let status = 200;
    const response = {
        status(value) { status = value; return this; },
        json(value) { if (status >= 400) console.warn("Saved activity; notification failed:", status, value.error); return value; },
    };
    // Internal module call, never a client-supplied notification request.
    try { await handler.send({ method: "POST", body }, response); }
    catch (error) { console.warn("Saved activity; notification failed:", error.message); }
}

// A failed read after a committed write must never report that the save failed.
async function savedVote(supabase, filters) {
    try {
        let query = supabase.from("votes").select("id,songId,voter,member_id,decision,rating,reason,createdAt");
        for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
        const result = await query.retry(false).maybeSingle();
        if (result.error) return null;
        return result.data?.songId ? result.data : null;
    } catch { return null; }
}

module.exports = async (req, res) => {
    if (!requireAppPost(req, res)) return;
    try {
        const input = await readJsonBody(req);
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) throw new Error("서버 연결 설정을 확인해 주세요.");
        // Keep the existing public-profile permission model; do not use service-role for writes.
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
        if (typeof input.memberId !== "string") return res.status(400).json({ error: "프로필을 선택해 주세요." });
        const member = await supabase.from("members").select("id,name").eq("id", input.memberId).maybeSingle();
        if (member.error) throw member.error;
        if (!member.data) return res.status(400).json({ error: "프로필을 찾을 수 없어요." });

        if (input.kind === "reply") {
            const body = typeof input.body === "string" ? input.body.trim() : "";
            if (!input.voteId || !body || [...body].length > 300) return res.status(400).json({ error: "답글은 1~300자로 입력해 주세요." });
            const result = await supabase.from("vote_replies").insert({ vote_id: input.voteId, author: member.data.name, member_id: member.data.id, body }).select("id,vote_id,author,member_id,body,created_at").single();
            if (result.error) throw result.error;
            waitUntil(deliver(require("./send-reaction-notification"), { notificationKind: "reply", replyId: result.data.id }));
            return res.status(200).json({ replyId: result.data.id, reply: result.data });
        }

        const reason = typeof input.reason === "string" ? input.reason.trim() : "";
        if (!reason || !Number.isFinite(input.rating) || input.rating < 0 || input.rating > 5 || !Number.isInteger(input.rating * 2)) {
            return res.status(400).json({ error: "평가 이유와 0.5점 단위의 별점을 확인해 주세요." });
        }
        if (input.kind === "song") {
            const title = typeof input.title === "string" ? input.title.trim() : "";
            const artist = typeof input.artist === "string" ? input.artist.trim() : "";
            if (!title || !artist) return res.status(400).json({ error: "곡명과 아티스트를 입력해 주세요." });
            const themeId = input.weeklyThemeId ?? null;
            if (themeId !== null && (typeof themeId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(themeId))) {
                return res.status(400).json({ error: "이번 주 주제를 다시 선택해 주세요." });
            }
            const album = resolveAlbum({ albumUrl: input.albumUrl, albumName: input.albumName });
            const result = await supabase.rpc(themeId ? "add_song_with_weekly_theme" : album.albumUrl ? "add_song_with_metadata" : "add_song_with_initial_vote", {
                p_title: title, p_artist: artist, p_adder: member.data.name, p_adder_member_id: member.data.id,
                p_cover_image_url: input.coverImageUrl || null, p_rating: input.rating, p_reason: reason,
                ...(themeId ? { p_weekly_theme_id: themeId } : {}),
                ...(!themeId && album.albumUrl ? { p_album_url: album.albumUrl, p_album_name: album.albumName } : {}),
            });
            if (result.error) throw result.error;
            const song = Array.isArray(result.data) ? result.data[0] : result.data;
            if (!song?.id) throw new Error("추가된 곡을 확인하지 못했어요.");
            waitUntil(deliver(require("./send-song-added-notification"), { songId: song.id }));
            const vote = await savedVote(supabase, { songId: song.id, member_id: member.data.id });
            return res.status(200).json({ song, vote });
        }
        if (input.kind === "vote") {
            if (!input.songId || !["승격", "보류", "방출"].includes(input.decision)) return res.status(400).json({ error: "곡과 평가를 확인해 주세요." });
            const result = await supabase.rpc("save_member_vote", {
                p_song_id: input.songId, p_voter: member.data.name, p_member_id: member.data.id,
                p_decision: input.decision, p_rating: input.rating, p_reason: reason,
            });
            if (result.error) throw result.error;
            const saved = Array.isArray(result.data) ? result.data[0] : result.data;
            if (!saved?.vote_id) throw new Error("저장된 평가를 확인하지 못했어요.");
            if (saved.changed) waitUntil(deliver(require("./send-reaction-notification"), { voteId: saved.vote_id, notificationKind: saved.is_new ? "new" : "update" }));
            const vote = await savedVote(supabase, { id: saved.vote_id });
            return res.status(200).json({ changed: Boolean(saved.changed), isNew: Boolean(saved.is_new), vote });
        }
        return res.status(400).json({ error: "지원하지 않는 저장 요청이에요." });
    } catch (error) {
        console.error("save-activity failed:", error);
        const missingRpc = error.code === "PGRST202";
        return res.status(missingRpc ? 503 : 400).json({ error: missingRpc ? "저장 기능에 필요한 데이터베이스 업데이트가 아직 적용되지 않았어요." : error.message || "저장하지 못했어요." });
    }
};
