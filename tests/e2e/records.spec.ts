import { expect, test } from "@playwright/test";
import { mockClub, pastThemeId } from "./fixture";

test("reviews stay on the saved song, preserve a fixed queue across reloads, and finish manually", async ({ page }) => {
  const state = await mockClub(page);
  await page.goto("/");
  await page.locator(".queue-section .album-tile").first().click();
  await expect(page.getByRole("region", { name: "연속 평가" })).toHaveCount(0);
  await page.getByRole("button", { name: "승격", exact: true }).click();
  await page.getByLabel("평가 이유", { exact: true }).fill("다음 곡 전에 친구들의 이야기도 읽고 싶어요");
  state.failSave = true;
  await page.getByRole("button", { name: "평가 저장하기", exact: true }).click();
  await expect(page.getByText(/평가 저장 실패:/)).toBeVisible();
  await expect(page.getByRole("region", { name: "연속 평가" })).toHaveCount(0);
  state.failSave = false;
  await page.getByRole("button", { name: "평가 저장하기", exact: true }).click();
  await expect(page.getByRole("region", { name: "연속 평가" })).toContainText("1/3곡 완료");
  await expect(page).toHaveURL(/song=old-song/);
  await expect(page.getByRole("dialog")).toContainText("마지막 후렴");
  state.tables.songs.push({ ...state.tables.songs[2], id: "late-add", title: "나중에 들어온 곡" });
  await page.reload();
  await expect(page.getByRole("region", { name: "연속 평가" })).toContainText("1/3곡 완료");
  await page.getByRole("button", { name: "평가 수정하기", exact: true }).click();
  await page.getByLabel("평가 이유", { exact: true }).fill("수정은 완료 수에 더하지 않아요");
  await page.getByRole("button", { name: "평가 수정하기", exact: true }).click();
  await expect(page.getByRole("region", { name: "연속 평가" })).toContainText("1/3곡 완료");
  await page.getByRole("button", { name: "다음 미평가 곡" }).click();
  await expect(page).toHaveURL(/song=due-song/);
  for (const id of ["due-song", "new-song"]) {
    await expect(page).toHaveURL(new RegExp(`song=${id}`));
    await page.getByRole("button", { name: "보류", exact: true }).click();
    await page.getByLabel("평가 이유", { exact: true }).fill("천천히 더 들어볼게요");
    await page.getByRole("button", { name: "평가 저장하기", exact: true }).click();
    if (id === "due-song") await page.getByRole("button", { name: "다음 미평가 곡" }).click();
  }
  await expect(page.getByRole("region", { name: "연속 평가" })).toContainText("3/3곡 완료");
  await expect(page.getByRole("button", { name: "다음 미평가 곡" })).toHaveCount(0);
  await page.getByRole("button", { name: "목록으로 돌아가기" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "평가할 곡 1" })).toBeVisible();
});

test("archiving preserves evaluations and replies, removes candidates, and opens a read-only record", async ({ page }) => {
  const state = await mockClub(page);
  state.tables.songs[0].album_url = "https://music.apple.com/kr/album/saved/123456789";
  state.tables.songs[0].album_name = "저장된 앨범";
  await page.goto("/settings");
  await page.getByLabel("이메일", { exact: true }).fill("admin@example.test");
  await page.getByLabel("비밀번호", { exact: true }).fill("local-test-password");
  await page.getByRole("button", { name: "관리자 로그인", exact: true }).click();
  await page.getByRole("button", { name: /방출 보관하기/ }).click();
  await page.getByLabel("현재 목록 전체 선택").check();
  page.on("dialog", (dialog) => dialog.accept());
  state.failArchive = true;
  await page.getByRole("button", { name: "1곡 보관" }).click();
  await expect(page.getByText("테스트 보관 실패", { exact: true })).toBeVisible();
  await expect(page.getByLabel("현재 목록 전체 선택")).toBeChecked();
  state.failArchive = false;
  await page.getByRole("button", { name: "1곡 보관" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.tables.votes.some((vote) => vote.id === "vote-1")).toBe(true);
  expect(state.tables.vote_replies.some((reply) => reply.id === "reply-1")).toBe(true);
  await page.goto("/onochoo");
  await expect(page.locator(".song-card")).toHaveCount(2);
  await page.goto("/");
  await page.getByRole("link", { name: /^방출/ }).click();
  await expect(page.getByRole("heading", { name: "방출", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /오래된 노래.*기록 보기/ }).click();
  await expect(page.getByRole("dialog")).toContainText("추천 덕분에 잘 들었어요!");
  await expect(page.getByRole("button", { name: /평가 저장|평가 수정|답글 쓰기/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /수록 앨범 열기/ })).toHaveAttribute("href", state.tables.songs[0].album_url);
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.getByRole("searchbox", { name: "보관한 곡 검색" }).fill("없는 곡");
  await expect(page.getByRole("heading", { name: "조건에 맞는 방출 곡이 없어요" })).toBeVisible();
});

test("deferred themes stay hidden and old themed drafts can be saved as ordinary recommendations", async ({ page }) => {
  const state = await mockClub(page);
  await page.goto("/");
  await expect(page.locator(".weekly-theme-card")).toHaveCount(0);
  await page.getByRole("button", { name: "노래 추가", exact: true }).click();
  await page.getByRole("button", { name: "직접 입력", exact: false }).click();
  await page.getByLabel("곡명", { exact: true }).fill("남겨둔 초안");
  await page.getByLabel("아티스트", { exact: true }).fill("친구들");
  await page.getByLabel("추천 이유").fill("기존 내용을 보존해요");
  await page.evaluate((theme) => {
    for (const key of Object.keys(localStorage)) {
      if (!key.includes("add-song")) continue;
      const draft = JSON.parse(localStorage.getItem(key)!);
      draft.value.weeklyThemeId = theme;
      localStorage.setItem(key, JSON.stringify(draft));
    }
  }, pastThemeId);
  await page.reload();
  await page.getByRole("button", { name: "노래 추가", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "추천 주제" })).toHaveCount(0);
  await expect(page.getByLabel("곡명", { exact: true })).toHaveValue("남겨둔 초안");
  await page.getByRole("button", { name: "추가하기", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.writes.at(-1)?.weeklyThemeId).toBeNull();
  await page.goto("/onochoo?theme=" + pastThemeId);
  await expect(page.locator(".theme-filter, .theme-collection")).toHaveCount(0);
  expect(state.reads.some((url) => url.includes("/weekly_themes"))).toBe(false);
});

test("record and review empty states remain usable on a 320px screen", async ({ page }) => {
  await mockClub(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/records");
  await expect(page.getByRole("heading", { name: "아직 보관된 곡이 없어요" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "홈", exact: true }).first().click();
  await page.locator(".queue-section .album-tile").first().click();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.reload();
  await page.locator(".queue-section .album-tile").first().click();
  await expect(page.getByRole("textbox", { name: "평가 이유", exact: true })).toBeVisible();
});

test("closed songs are skipped without inflating session progress", async ({ page }) => {
  const state = await mockClub(page);
  await page.goto("/");
  await page.locator(".queue-section .album-tile").first().click();
  await page.getByRole("button", { name: "승격", exact: true }).click();
  await page.getByLabel("평가 이유", { exact: true }).fill("첫 곡을 저장하고 다음 곡으로 넘어가요");
  await page.getByRole("button", { name: "평가 저장하기", exact: true }).click();
  await expect(page.getByRole("region", { name: "연속 평가" })).toContainText("1/3곡 완료");
  state.tables.songs[1].archived_at = new Date().toISOString();
  state.failPlaylist = true;
  await page.goto("/?song=due-song");
  await expect(page.getByRole("region", { name: "연속 평가" })).toContainText("1/3곡 완료");
  await expect(page.getByRole("region", { name: "연속 평가" })).toContainText("1곡은 건너뛰었어요");
  await expect(page.getByRole("button", { name: "평가 저장하기" })).toHaveCount(0);
  await expect(page.getByText("저장된 앨범 링크가 없어요.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "다음 미평가 곡" }).click();
  await expect(page).toHaveURL(/song=new-song/);
});

test("a playlist recommendation retains album metadata across a draft reload", async ({ page }) => {
  const state = await mockClub(page);
  state.playlistSongs.push({ title: "새 앨범의 노래", artist: "샘플 아티스트", albumName: "새 앨범", albumUrl: "https://music.apple.com/kr/album/new/123" });
  await page.goto("/");
  await page.getByRole("button", { name: "노래 추가", exact: true }).click();
  await page.getByRole("button", { name: /Apple Music 동기화/ }).click();
  await page.getByRole("combobox", { name: "추가할 곡" }).selectOption("0");
  await page.getByLabel("추천 이유").fill("다시 열어도 앨범 링크가 남아야 해요");
  await page.reload();
  await page.getByRole("button", { name: "노래 추가", exact: true }).click();
  await page.getByRole("button", { name: "추가하기", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.writes.at(-1)?.albumUrl).toBe("https://music.apple.com/kr/album/new/123");
  expect(state.writes.at(-1)?.albumName).toBe("새 앨범");
});
