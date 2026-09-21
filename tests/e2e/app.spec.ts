import { expect, test } from "@playwright/test";
import { mockClub, memberId } from "./fixture";
import { MUTIGOEUL_APPLE_MUSIC_URL, ONOCHU_APPLE_MUSIC_URL } from "../../src/lib/constants";

test("home queue, vote drafts, reload, failed and successful saves", async ({ page }) => {
  const state = await mockClub(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "평가할 곡이 3개 있어요" })).toBeVisible();
  expect(state.reads.some((url) => url.includes("vote_replies"))).toBe(false);
  await page.getByRole("button", { name: "바로 평가하기" }).click();
  await expect(page).toHaveURL(/song=old-song/);
  await page.getByRole("button", { name: "보류", exact: true }).click();
  await page.getByRole("textbox", { name: "평가 이유", exact: true }).fill("작성하다 나갔다가 돌아와도 남아 있어야 해요.");
  await page.getByRole("slider", { name: "별점" }).press("ArrowRight");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.getByRole("button", { name: "바로 평가하기" }).click();
  await expect(page.getByRole("textbox", { name: "평가 이유", exact: true })).toHaveValue("작성하다 나갔다가 돌아와도 남아 있어야 해요.");
  await page.reload();
  await expect(page.getByRole("slider", { name: "별점" })).toHaveAttribute("aria-valuenow", "0.5");
  state.failSave = true;
  await page.getByRole("button", { name: "평가 저장하기" }).click();
  await expect(page.getByText("평가 저장 실패: 테스트 저장 실패")).toBeVisible();
  state.failSave = false;
  await page.getByRole("button", { name: "평가 저장하기" }).click();
  await expect(page.getByRole("button", { name: "평가 수정하기" })).toBeVisible();
  await expect.poll(() => page.evaluate((id) => localStorage.getItem(`ohnochoo:draft:${id}:vote:old-song`), memberId)).toBeNull();
  expect(state.writes.at(-1)?.rating).toBe(0.5);
});

test("song draft survives dismissal and reload and clears only after saving", async ({ page }) => {
  await mockClub(page);
  await page.goto("/");
  await page.getByRole("button", { name: "노래 추가", exact: true }).click();
  await page.getByRole("button", { name: "직접 입력", exact: false }).click();
  await page.getByRole("textbox", { name: "곡명", exact: true }).fill("새로운 노래");
  await page.getByRole("textbox", { name: "아티스트", exact: true }).fill("새로운 아티스트");
  await page.getByRole("textbox", { name: "왜 이 곡을 추천하나요?" }).fill("좋은 추천 이유");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "노래 추가", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "곡명", exact: true })).toHaveValue("새로운 노래");
  await page.getByRole("button", { name: "추가하기", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "노래 추가", exact: true }).click();
  await expect(page.getByText("작성하던 추천을 불러왔어요.")).toHaveCount(0);
});

test("notification opens the exact reply and archive links cannot expose voting", async ({ page }) => {
  await mockClub(page);
  await page.goto("/onochoo?song=old-song&vote=vote-1&reply=reply-1");
  await expect(page.locator(".notification-target")).toHaveText(/추천 덕분에 잘 들었어요/);
  await expect(page.locator(".notification-target")).toBeFocused();
  await expect(page.getByRole("link", { name: "수록 앨범 열기" })).toHaveAttribute("href", "https://music.apple.com/kr/album/old-song/123456789");
  await page.goto("/onochoo?song=archive-song");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("link", { name: "수록 앨범 열기" })).toHaveAttribute("href", "https://music.apple.com/kr/album/our-season/345678901");
  await expect(page.getByRole("button", { name: /평가.*하기/ })).toHaveCount(0);
  await page.goto("/onochoo?song=deleted-song");
  await expect(page.getByRole("heading", { name: "곡을 찾을 수 없어요" })).toBeVisible();
});

test("album lookup is shared across songs and only missing albums use the playlist", async ({ page }) => {
  const state = await mockClub(page);
  await page.goto("/onochoo?song=old-song");
  await expect(page.getByRole("link", { name: "수록 앨범 열기" })).toHaveAttribute("href", state.playlistSongs[0].albumUrl);
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.locator(".song-card").filter({ hasText: "Live Session" }).getByRole("button").first().click();
  await expect(page.getByRole("link", { name: "수록 앨범 열기" })).toHaveAttribute("href", state.playlistSongs[1].albumUrl);
  expect(state.playlistReads).toEqual([ONOCHU_APPLE_MUSIC_URL]);
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.locator(".song-card").filter({ hasText: "Summer Night" }).getByRole("button").first().click();
  await expect(page.getByRole("link", { name: "오노추 플레이리스트 열기" })).toHaveAttribute("href", ONOCHU_APPLE_MUSIC_URL);
  await expect(page.getByText("수록 앨범을 찾지 못했어요")).toBeVisible();
  await expect(page.getByRole("link", { name: "수록 앨범 열기" })).toHaveCount(0);
});

test("album lookup failures allow retry without losing a vote draft", async ({ page }) => {
  const state = await mockClub(page);
  state.failPlaylist = true;
  await page.goto("/onochoo?song=old-song");
  await expect(page.getByRole("link", { name: "오노추 플레이리스트 열기" })).toHaveAttribute("href", ONOCHU_APPLE_MUSIC_URL);
  await page.getByRole("textbox", { name: "평가 이유", exact: true }).fill("앨범 조회를 기다려도 유지할 내용");
  state.failPlaylist = false;
  await page.getByRole("button", { name: "앨범 다시 찾기" }).click();
  await expect(page.getByRole("link", { name: "수록 앨범 열기" })).toHaveAttribute("href", state.playlistSongs[0].albumUrl);
  await expect(page.getByRole("textbox", { name: "평가 이유", exact: true })).toHaveValue("앨범 조회를 기다려도 유지할 내용");
  state.playlistSongs = [];
  await page.goto("/onochoo?song=archive-song");
  await expect(page.getByRole("link", { name: "무티고을 플레이리스트 열기" })).toHaveAttribute("href", MUTIGOEUL_APPLE_MUSIC_URL);
});

test("returning from music does not reload or erase a draft on a new deployment", async ({ page }) => {
  const state = await mockClub(page);
  await page.goto("/?song=old-song");
  await page.getByRole("textbox", { name: "평가 이유", exact: true }).fill("업데이트 중에도 유지할 내용");
  state.version = "test-v2";
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.getByRole("complementary", { name: "앱 업데이트" })).toBeAttached();
  await expect(page.getByRole("textbox", { name: "평가 이유", exact: true })).toHaveValue("업데이트 중에도 유지할 내용");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.getByRole("button", { name: "업데이트", exact: true }).click();
  await page.getByRole("button", { name: "바로 평가하기" }).click();
  await expect(page.getByRole("textbox", { name: "평가 이유", exact: true })).toHaveValue("업데이트 중에도 유지할 내용");
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`layout at ${width}px: home, candidates, detail, archive, settings`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockClub(page);
    const noOverflow = async () => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    };
    await page.goto("/");
    await expect(page.getByRole("button", { name: "바로 평가하기" })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('16px "Pretendard Variable"'))).toBe(true);
    await noOverflow();
    await page.screenshot({ path: `test-results/layout/${width}-home.png`, fullPage: true, animations: "disabled" });
    await page.goto("/onochoo?filter=pending");
    await expect(page.locator(".song-card")).toHaveCount(3);
    await noOverflow();
    await page.screenshot({ path: `test-results/layout/${width}-candidates.png`, fullPage: true, animations: "disabled" });
    await page.locator(".evaluate-button").nth(1).click();
    await expect(page.getByRole("textbox", { name: "평가 이유", exact: true })).toBeVisible();
    await noOverflow();
    expect(await page.locator(".dialog-body").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: `test-results/layout/${width}-detail.png`, animations: "disabled" });
    await page.getByRole("textbox", { name: "평가 이유", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/layout/${width}-vote.png`, animations: "disabled" });
    await page.goto("/mutigoeul");
    await expect(page.locator(".album-tile")).toHaveCount(1);
    await noOverflow();
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "내 정보", exact: true })).toBeVisible();
    await noOverflow();
    await page.screenshot({ path: `test-results/layout/${width}-settings.png`, fullPage: true, animations: "disabled" });
    expect(errors).toEqual([]);
  });
}

test("refetch preserves an edited evaluation and drafts stay scoped to the selected profile", async ({ page }) => {
  const state = await mockClub(page);
  state.tables.votes.push({ id: "my-vote", songId: "old-song", voter: "지우", member_id: memberId, decision: "보류", rating: 3, reason: "저장된 내 평가", createdAt: new Date().toISOString() });
  await page.goto("/onochoo?song=old-song");
  const reason = page.getByRole("textbox", { name: "평가 이유", exact: true });
  await expect(reason).toHaveValue("저장된 내 평가");
  await reason.fill("수정 중인 내용");
  state.tables.votes[0].reason = "친구가 수정한 평가";
  const before = state.reads.length;
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect.poll(() => state.reads.length).toBeGreaterThan(before);
  await expect(reason).toHaveValue("수정 중인 내용");
  await page.evaluate(() => {
    localStorage.setItem("selectedMemberId", "member-2");
    localStorage.setItem("selectedMemberName", "서연");
  });
  await page.reload();
  await expect(reason).toHaveValue("친구가 수정한 평가");
});

test("reply drafts survive a closed dialog and a page reload", async ({ page }) => {
  await mockClub(page);
  await page.goto("/onochoo?song=old-song");
  await page.getByRole("button", { name: "답글 쓰기" }).click();
  await page.getByRole("textbox", { name: "답글 내용" }).fill("이 답글도 잃어버리지 않아요");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.reload();
  await page.goto("/onochoo?song=old-song");
  await expect(page.getByRole("textbox", { name: "답글 내용" })).toHaveValue("이 답글도 잃어버리지 않아요");
});

test("browser back closes the song without losing the pending filter", async ({ page }) => {
  await mockClub(page);
  await page.goto("/onochoo?filter=pending");
  await page.locator(".evaluate-button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/filter=pending$/);
});

test("the add form remains scrollable in a narrow, short viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 500 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockClub(page);
  await page.goto("/");
  await page.getByRole("button", { name: "노래 추가", exact: true }).click();
  await page.getByRole("button", { name: "직접 입력", exact: false }).click();
  await page.getByRole("textbox", { name: "왜 이 곡을 추천하나요?" }).fill("짧은 화면에서 작성하기");
  const submit = page.getByRole("button", { name: "추가하기", exact: true });
  await submit.scrollIntoViewIfNeeded();
  await expect(submit).toBeInViewport();
  await expect(page.getByRole("button", { name: "닫기", exact: true })).toBeInViewport();
  expect(await page.locator(".dialog-body").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: "test-results/layout/320-short-add.png", animations: "disabled" });
});
