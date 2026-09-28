import type { Page } from "@playwright/test";
import { koreanWeekStart } from "../../src/lib/weeklyTheme";

const cover = (color: string, name: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="${color}"/><circle cx="150" cy="130" r="85" fill="#ffffff18"/><circle cx="150" cy="130" r="48" fill="#0004"/><circle cx="150" cy="130" r="9" fill="#fffe"/><text x="20" y="266" font-family="sans-serif" font-size="22" fill="white">${name}</text></svg>`)}`;
const day = (ago: number) => new Date(Date.now() - ago * 86_400_000).toISOString();
export const memberId = "11111111-1111-4111-8111-111111111111";
export const themeId = "22222222-2222-4222-8222-222222222222";
export const pastThemeId = "33333333-3333-4333-8333-333333333333";

export async function mockClub(page: Page) {
  const state = {
    version: "test-v1",
    writes: [] as Record<string, unknown>[],
    reads: [] as string[],
    failSave: false,
    failPlaylist: false,
    failThemes: false,
    failThemeSave: false,
    failArchive: false,
    isAdmin: false,
    playlistReads: [] as string[],
    playlistSongs: [
      { title: "오래된 노래", artist: "스탠딩 에그", albumName: "오래된 노래 - Single", albumUrl: "https://music.apple.com/kr/album/old-song/123456789" },
      { title: "긴 제목의 음악도 편하게 읽을 수 있을까요 (Live Session)", artist: "여러 아티스트와 함께 부르는 노래", albumName: "여러 아티스트와 함께한 여름날의 아주 긴 앨범 이름 (Live Session)", albumUrl: "https://music.apple.com/kr/album/live-session/234567890" },
      { title: "우리의 계절", artist: "검정치마", albumName: "우리의 계절", albumUrl: "https://music.apple.com/kr/album/our-season/345678901" },
    ],
    tables: {
      weekly_themes: [
        { id: themeId, week_start: koreanWeekStart(), title: "밤 산책에 데려갈 노래", description: "선선한 밤, 이어폰을 끼고 걷는다면. 오늘의 산책에 한 곡을 더해요." },
        { id: pastThemeId, week_start: koreanWeekStart(new Date(Date.now() - 7 * 86_400_000)), title: "오래 간직한 노래", description: "다시 꺼내 듣고 싶은 곡" },
      ],
      members: [{ id: memberId, name: "지우", createdAt: day(100) }, { id: "member-2", name: "서연", createdAt: day(100) }],
      songs: [
        { id: "old-song", title: "오래된 노래", artist: "스탠딩 에그", adder: "서연", adder_member_id: "member-2", createdAt: day(8), coverImageUrl: cover("#285b62", "OLD SONG") },
        { id: "due-song", title: "긴 제목의 음악도 편하게 읽을 수 있을까요 (Live Session)", artist: "여러 아티스트와 함께 부르는 노래", adder: "서연", adder_member_id: "member-2", createdAt: day(6.5), coverImageUrl: cover("#774638", "LATE SUMMER") },
        { id: "new-song", title: "Summer Night", artist: "The Midnight", adder: "서연", adder_member_id: "member-2", createdAt: day(1), coverImageUrl: cover("#494780", "SUMMER NIGHT"), weekly_theme_id: themeId },
        { id: "archive-song", title: "우리의 계절", artist: "검정치마", adder: "지우", adder_member_id: memberId, createdAt: day(30), coverImageUrl: cover("#827445", "OUR SEASON"), weekly_theme_id: pastThemeId },
      ],
      votes: [
        { id: "vote-1", songId: "old-song", voter: "서연", member_id: "member-2", decision: "승격", rating: 4.5, reason: "저녁 산책에 잘 어울리는 곡이에요. 마지막 후렴을 꼭 들어보세요.", createdAt: day(8) },
        { id: "vote-2", songId: "due-song", voter: "서연", member_id: "member-2", decision: "승격", rating: 0, reason: "계속 생각나는 멜로디", createdAt: day(6) },
        { id: "vote-3", songId: "archive-song", voter: "지우", member_id: memberId, decision: "승격", rating: 5, reason: "오래 듣고 싶은 곡", createdAt: day(30) },
      ],
      vote_replies: [{ id: "reply-1", vote_id: "vote-1", author: "지우", member_id: memberId, body: "추천 덕분에 잘 들었어요!", created_at: day(1) }],
      mutigoeul_songs: [{ id: "entry-1", songId: "archive-song", createdAt: day(20) }],
    } as Record<string, Array<Record<string, any>>>,
  };
  await page.addInitScript((id) => {
    if (!localStorage.getItem("selectedMemberId")) {
      localStorage.setItem("selectedMemberId", id);
      localStorage.setItem("selectedMemberName", "지우");
    }
  }, memberId);
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/config") return route.fulfill({ json: { supabaseUrl: "http://127.0.0.1:5173/__mock__", supabaseAnonKey: "test-key" } });
    if (path === "/api/fetch-playlist") {
      state.playlistReads.push(new URL(route.request().url()).searchParams.get("url") || "");
      return state.failPlaylist
        ? route.fulfill({ status: 502, json: { error: "테스트 Apple Music 오류" } })
        : route.fulfill({ json: { songs: state.playlistSongs } });
    }
    if (path === "/api/save-activity") {
      const input = route.request().postDataJSON();
      state.writes.push(input);
      if (state.failSave) return route.fulfill({ status: 500, json: { error: "테스트 저장 실패" } });
      if (input.kind === "vote") {
        if (state.tables.songs.some((song) => song.id === input.songId && song.archived_at)) return route.fulfill({ status: 400, json: { error: "평가가 종료된 곡이에요." } });
        const existing = state.tables.votes.find((v) => v.songId === input.songId && v.member_id === input.memberId);
        if (existing) Object.assign(existing, { reason: input.reason, rating: input.rating, decision: input.decision });
        else state.tables.votes.push({ id: `saved-vote-${input.songId}`, songId: input.songId, member_id: input.memberId, voter: "지우", reason: input.reason, rating: input.rating, decision: input.decision, createdAt: day(0) });
        return route.fulfill({ json: { changed: true, isNew: !existing, vote: state.tables.votes.find((v) => v.songId === input.songId && v.member_id === input.memberId) } });
      }
      if (input.kind === "song") {
        const song = { id: "saved-song", title: input.title, artist: input.artist, adder: "지우", adder_member_id: memberId, coverImageUrl: input.coverImageUrl, album_url: input.albumUrl, album_name: input.albumName, weekly_theme_id: input.weeklyThemeId, createdAt: day(0) };
        state.tables.songs.push(song);
        const vote = { id: "saved-initial-vote", songId: song.id, member_id: memberId, voter: "지우", reason: input.reason, rating: input.rating, decision: "승격", createdAt: day(0) };
        state.tables.votes.push(vote);
        return route.fulfill({ json: { song, vote } });
      }
      const reply = { id: "saved-reply", vote_id: input.voteId, member_id: input.memberId, author: "지우", body: input.body, created_at: day(0) };
      state.tables.vote_replies.push(reply);
      return route.fulfill({ json: { replyId: reply.id, reply } });
    }
    if (path === "/api/update-song-covers") return route.fulfill({ json: { updated: 0 } });
    // No unmocked write or notification request is allowed to reach the real API.
    return route.fulfill({ status: 403, json: { error: "테스트에서 차단한 API" } });
  });
  await page.route("**/version.json", (route) => route.fulfill({ json: { version: state.version } }));
  await page.route("**/__mock__/**", (route) => {
    const url = new URL(route.request().url());
    state.reads.push(url.href);
    const table = url.pathname.split("/").at(-1)!;
    if (url.pathname.includes("/auth/v1/")) {
      if (table === "token") {
        state.isAdmin = true;
        const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: memberId, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test`;
        return route.fulfill({ json: { access_token: token, refresh_token: "test-refresh", token_type: "bearer", expires_in: 3600, user: { id: memberId, email: "admin@example.test", aud: "authenticated", role: "authenticated" } } });
      }
      return route.fulfill({ json: { id: memberId, email: "admin@example.test" } });
    }
    if (table === "weekly_themes" && state.failThemes) return route.fulfill({ status: 404, json: { code: "PGRST205", message: "weekly_themes not found" } });
    if (route.request().method() === "POST" && table === "weekly_themes") {
      if (!state.isAdmin || state.failThemeSave) return route.fulfill({ status: 403, json: { message: "테스트 주제 저장 실패" } });
      const input = route.request().postDataJSON();
      const existing = state.tables.weekly_themes.find((item) => item.week_start === input.week_start);
      const saved = { ...input, id: existing?.id ?? themeId };
      if (existing) Object.assign(existing, saved); else state.tables.weekly_themes.push(saved);
      return route.fulfill({ json: { id: saved.id } });
    }
    if (table === "admin_users") return route.fulfill({ json: state.isAdmin ? { user_id: memberId } : null });
    if (table === "archive_songs" && route.request().method() === "POST") {
      if (!state.isAdmin || state.failArchive) return route.fulfill({ status: 403, json: { message: "테스트 보관 실패" } });
      const ids: string[] = route.request().postDataJSON().p_song_ids;
      for (const song of state.tables.songs) if (ids.includes(song.id)) song.archived_at ||= day(0);
      return route.fulfill({ json: ids.length });
    }
    let rows = state.tables[table] ?? [];
    for (const [key, value] of url.searchParams) {
      if (value === "not.is.null") { rows = rows.filter((row) => row[key] != null); continue; }
      if (!value.startsWith("eq.")) continue;
      const wanted = value.slice(3);
      rows = key === "votes.songId"
        ? rows.filter((r) => state.tables.votes.some((v) => v.id === r.vote_id && v.songId === wanted))
        : rows.filter((r) => r[key] === wanted);
    }
    for (const item of (url.searchParams.get("order") || "").split(",").reverse()) {
      const [key, direction] = item.split(".");
      rows = [...rows].sort((a, b) => String(a[key]).localeCompare(String(b[key])) * (direction === "desc" ? -1 : 1));
    }
    const total = rows.length;
    const from = Number(url.searchParams.get("offset") || 0);
    // Deliberately cap responses below the requested size to exercise pagination.
    const limit = Math.min(2, Number(url.searchParams.get("limit") || 2));
    rows = rows.slice(from, from + limit);
    if (!(url.searchParams.get("select") || "").includes("reason") && table === "votes") rows = rows.map(({ reason: _, ...row }) => row);
    return route.fulfill({ json: rows, headers: route.request().headers().prefer?.includes("count=exact") ? { "content-range": `${from}-${Math.max(from, from + rows.length - 1)}/${total}` } : {} });
  });
  return state;
}
