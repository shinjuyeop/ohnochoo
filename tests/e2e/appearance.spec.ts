import { expect, test } from "@playwright/test";
import { mockClub } from "./fixture";

test("appearance follows the system live, saves overrides, and applies to dialogs and reloads", async ({ page }) => {
  await mockClub(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/settings");
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("radio", { name: "시스템 설정" })).toBeChecked();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(root).toHaveAttribute("data-theme", "light");
  await page.getByRole("radio", { name: "다크", exact: true }).check();
  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#141414");
  await page.reload();
  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("radio", { name: "다크", exact: true })).toBeChecked();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.emulateMedia({ colorScheme: "light" });
  await expect(root).toHaveAttribute("data-theme", "dark");
  await page.getByRole("radio", { name: "라이트", exact: true }).check();
  await expect(root).toHaveAttribute("data-theme", "light");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#fafafa");
  await page.getByRole("button", { name: "노래 추가", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.getByRole("radio", { name: "시스템 설정" }).check();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(root).toHaveAttribute("data-theme", "dark");
});

test("appearance persists across tabs and the app works when saving that preference is blocked", async ({ page, context }) => {
  await mockClub(page);
  await page.goto("/settings");
  const second = await context.newPage();
  await mockClub(second);
  await second.goto("/settings");
  await expect(second.getByRole("radio", { name: "시스템 설정" })).toBeChecked();
  await page.getByRole("radio", { name: "다크", exact: true }).check();
  await expect(second.getByRole("radio", { name: "다크", exact: true })).toBeChecked();
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "ohnochoo:theme") throw new DOMException("Storage unavailable", "QuotaExceededError");
      return set.call(this, key, value);
    };
  });
  await page.getByRole("radio", { name: "라이트", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("heading", { name: "내 정보", exact: true })).toBeVisible();
});

test("navigation and browser back start at the top while song dialogs preserve list position", async ({ page }) => {
  const state = await mockClub(page);
  for (let i = 0; i < 12; i++) {
    state.tables.songs.push({ ...state.tables.songs[3], id: `library-${i}`, title: `플레이리스트 ${i}` });
    state.tables.mutigoeul_songs.push({ id: `entry-${i}`, songId: `library-${i}`, createdAt: new Date().toISOString() });
    state.tables.songs.push({ ...state.tables.songs[0], id: `record-${i}`, title: `보관한 노래 ${i}`, archived_at: new Date().toISOString() });
  }
  await page.setViewportSize({ width: 390, height: 664 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("link", { name: /^방출/ }).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(100);
  await page.locator(".home-collection").getByRole("link", { name: "무티고을 13", exact: true }).click();
  await expect(page).toHaveURL(/\/mutigoeul$/);
  await expect(page.getByRole("heading", { name: "무티고을", level: 1, exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  const song = page.locator(".album-tile").nth(8);
  await song.scrollIntoViewIfNeeded();
  await song.hover();
  const before = await page.evaluate(() => scrollY);
  expect(before).toBeGreaterThan(100);
  await song.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(Math.abs(await page.evaluate(() => scrollY) - before)).toBeLessThan(2);
  await page.locator(".bottom-nav").getByRole("link", { name: "홈", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.getByRole("link", { name: /^방출/ }).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(100);
  await page.getByRole("link", { name: /^방출/ }).click();
  await expect(page).toHaveURL(/\/records$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator(".record-song")).toHaveCount(12);
  await page.locator(".record-song").last().scrollIntoViewIfNeeded();
  await page.locator(".bottom-nav").getByRole("link", { name: "내 정보" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/records$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});
