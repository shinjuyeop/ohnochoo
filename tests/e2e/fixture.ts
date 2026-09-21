import type { Page } from "@playwright/test";

const cover = (color: string, name: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="${color}"/><circle cx="150" cy="130" r="85" fill="#ffffff18"/><circle cx="150" cy="130" r="48" fill="#0004"/><circle cx="150" cy="130" r="9" fill="#fffe"/><text x="20" y="266" font-family="sans-serif" font-size="22" fill="white">${name}</text></svg>`)}`;
const day = (ago: number) => new Date(Date.now() - ago * 86_400_000).toISOString();
export const memberId = "11111111-1111-4111-8111-111111111111";

export async function mockClub(page: Page) {
  const state = {
    version: "test-v1",
    writes: [] as Record<string, unknown>[],
    reads: [] as string[],
    failSave: false,
    failPlaylist: false,
    playlistReads: [] as string[],
    playlistSongs: [
      { title: "오래된 노래", artist: "스탠딩 에그", albumName: "오래된 노래 - Single", albumUrl: "https://music.apple.com/kr/album/old-song/123456789" },
      { title: "긴 제목의 음악도 편하게 읽을 수 있을까요 (Live Session)", artist: "여러 아티스트와 함께 부르는 노래", albumName: "여러 아티스트와 함께한 여름날의 아주 긴 앨범 이름 (Live Session)", albumUrl: "https://music.apple.com/kr/album/live-session/234567890" },
      { title: "우리의 계절", artist: "검정치마", albumName: "우리의 계절", albumUrl: "https://music.apple.com/kr/album/our-season/345678901" },
    ],
    tables: {
      members: [{ id: memberId, name: "지우", createdAt: day(100) }, { id: "member-2", name: "서연", createdAt: day(100) }],
      songs: [
        { id: "old-song", title: "오래된 노래", artist: "스탠딩 에그", adder: "서연", adder_member_id: "member-2", createdAt: day(8), coverImageUrl: cover("#285b62", "OLD SONG") },
        { id: "due-song", title: "긴 제목의 음악도 편하게 읽을 수 있을까요 (Live Session)", artist: "여러 아티스트와 함께 부르는 노래", adder: "서연", adder_member_id: "member-2", createdAt: day(6.5), coverImageUrl: cover("#774638", "LATE SUMMER") },
        { id: "new-song", title: "Summer Night", artist: "The Midnight", adder: "서연", adder_member_id: "member-2", createdAt: day(1), coverImageUrl: cover("#494780", "SUMMER NIGHT") },
        { id: "archive-song", title: "우리의 계절", artist: "검정치마", adder: "지우", adder_member_id: memberId, createdAt: day(30), coverImageUrl: cover("#827445", "OUR SEASON") },
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
        const existing = state.tables.votes.find((v) => v.songId === input.songId && v.member_id === input.memberId);
        if (existing) Object.assign(existing, { reason: input.reason, rating: input.rating, decision: input.decision });
        else state.tables.votes.push({ id: "saved-vote", songId: input.songId, member_id: input.memberId, voter: "지우", reason: input.reason, rating: input.rating, decision: input.decision, createdAt: day(0) });
        return route.fulfill({ json: { changed: true, isNew: !existing } });
      }
      if (input.kind === "song") {
        const song = { id: "saved-song", title: input.title, artist: input.artist, adder: "지우", adder_member_id: memberId, coverImageUrl: input.coverImageUrl, createdAt: day(0) };
        state.tables.songs.push(song);
        return route.fulfill({ json: { song } });
      }
      return route.fulfill({ json: { replyId: "saved-reply" } });
    }
    // No unmocked write or notification request is allowed to reach the real API.
    return route.fulfill({ status: 403, json: { error: "테스트에서 차단한 API" } });
  });
  await page.route("**/version.json", (route) => route.fulfill({ json: { version: state.version } }));
  await page.route("**/__mock__/**", (route) => {
    const url = new URL(route.request().url());
    state.reads.push(url.href);
    const table = url.pathname.split("/").at(-1)!;
    let rows = state.tables[table] ?? [];
    for (const [key, value] of url.searchParams) {
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
    const from = Number(url.searchParams.get("offset") || 0);
    // Deliberately cap responses below the requested size to exercise pagination.
    const limit = Math.min(2, Number(url.searchParams.get("limit") || 2));
    rows = rows.slice(from, from + limit);
    if (!(url.searchParams.get("select") || "").includes("reason") && table === "votes") rows = rows.map(({ reason: _, ...row }) => row);
    return route.fulfill({ json: rows });
  });
  return state;
}
