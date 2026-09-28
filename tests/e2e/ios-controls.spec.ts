import { expect, test } from "@playwright/test";
import { mockClub } from "./fixture";

test("home uses matching section counts and clear, unblurred top chrome", async ({ page }) => {
  await mockClub(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "평가할 곡 3" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "무티고을 1" })).toBeVisible();
  await expect(page.getByRole("button", { name: /바로 평가하기|평가 이어하기/ })).toHaveCount(0);
  await expect(page.locator(".mobile-topbar")).toHaveCSS("backdrop-filter", "none");
  await page.locator(".queue-section .album-tile").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".dialog-overlay")).toHaveCSS("backdrop-filter", "none");
});

test("rounded filters and clearable search keep keyboard focus and selected state", async ({ page }) => {
  await mockClub(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/onochoo");
  const filters = page.getByRole("group", { name: "곡 필터" });
  await filters.getByRole("button", { name: "미평가", exact: true }).click();
  await expect(filters.getByRole("button", { name: "미평가", exact: true })).toHaveAttribute("aria-pressed", "true");
  const search = page.getByRole("searchbox", { name: "곡, 아티스트 검색", exact: true });
  await search.fill("Summer");
  await expect(page.locator(".song-card")).toHaveCount(1);
  await page.getByRole("button", { name: "곡, 아티스트 검색 지우기" }).click();
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("");
  await expect(page.locator(".song-card")).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/ios/320-filters.png", fullPage: true });
});

for (const [width, height] of [[320, 500], [390, 844], [430, 932]]) {
  test(`archive rows contain their metadata and the footer stays visible at ${width}px`, async ({ page }) => {
    const state = await mockClub(page);
    for (let i = 0; i < 24; i++) state.tables.songs.push({ ...state.tables.songs[0], id: `release-${i}`, title: `아주 긴 노래 제목도 행 안에 표시해요 ${i}`, artist: "여러 아티스트와 함께 부르는 노래" });
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/settings");
    await page.getByLabel("이메일", { exact: true }).fill("admin@example.test");
    await page.getByLabel("비밀번호", { exact: true }).fill("local-test-password");
    await page.getByRole("button", { name: "관리자 로그인", exact: true }).click();
    await page.getByRole("button", { name: /방출 보관하기/ }).click();
    const rows = page.locator(".admin-song-option");
    await expect(rows).toHaveCount(25);
    const contained = await rows.evaluateAll((elements) => elements.every((element) => {
      const bounds = element.getBoundingClientRect();
      const title = element.querySelector(".admin-song-copy > b")!.getBoundingClientRect();
      const artist = element.querySelector(".admin-song-copy > small")!.getBoundingClientRect();
      if (title.bottom > artist.top) return false;
      return [...element.querySelectorAll(".admin-song-copy, .admin-status, .admin-vote-counts")].every((child) => {
        const rect = child.getBoundingClientRect();
        return rect.top >= bounds.top && rect.bottom <= bounds.bottom - 6 && rect.right <= bounds.right;
      });
    }));
    expect(contained).toBe(true);
    expect(await page.locator(".admin-song-list").evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
    await expect(page.getByRole("button", { name: "0곡 보관", exact: true })).toBeInViewport();
    await page.screenshot({ path: `test-results/ios/${width}-archive.png` });
    await rows.last().getByRole("checkbox").check();
    await expect(page.getByRole("button", { name: "1곡 보관", exact: true })).toBeInViewport();
    await expect(page.getByRole("button", { name: "닫기", exact: true })).toBeInViewport();
    const search = page.getByRole("searchbox", { name: "제목, 아티스트 검색", exact: true });
    await search.fill("없는 곡");
    await expect(rows).toHaveCount(0);
    await page.getByRole("button", { name: "제목, 아티스트 검색 지우기" }).click();
    await expect(rows).toHaveCount(25);
    await expect(page.getByRole("button", { name: "1곡 보관", exact: true })).toBeEnabled();
    expect(await page.getByRole("dialog").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
