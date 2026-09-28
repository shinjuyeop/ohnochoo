import { expect, test } from "@playwright/test";
import { mockClub } from "./fixture";

test("music rows work with the keyboard and retain readable details and half-star ratings", async ({ page }) => {
  await mockClub(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/onochoo?filter=pending");
  const first = page.locator(".song-card-open").first();
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".vote-summary")).toContainText("승격");
  await expect(page.locator(".recommendation")).toContainText("마지막 후렴");
  const rating = page.getByRole("slider", { name: "별점" });
  await rating.focus();
  await rating.press("ArrowRight");
  await expect(rating).toHaveAttribute("aria-valuenow", "0.5");
  const fraction = await rating.locator(".star-glyph").first().evaluate((glyph) => glyph.querySelector(".star-fill")!.getBoundingClientRect().width / glyph.getBoundingClientRect().width);
  expect(fraction).toBeCloseTo(.5, 1);
  const bounds = await rating.boundingBox();
  await rating.click({ position: { x: bounds!.width * .85, y: bounds!.height / 2 } });
  await expect(rating).toHaveAttribute("aria-valuenow", "4.5");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/filter=pending$/);
});

test("empty queue and library keep navigation and recommending available", async ({ page }) => {
  const state = await mockClub(page);
  state.tables.songs = [];
  state.tables.votes = [];
  state.tables.mutigoeul_songs = [];
  state.tables.weekly_themes = [];
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "평가 완료" })).toBeVisible();
  await page.getByRole("button", { name: "노래 추가", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "노래 추가" })).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.locator(".bottom-nav").getByRole("link", { name: "무티고을", exact: true }).click();
  await expect(page.getByRole("heading", { name: "아직 무티고을이 비어 있어요" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("motion respects reduced motion and broken covers use a fallback", async ({ page }) => {
  const state = await mockClub(page);
  state.tables.songs[0].coverImageUrl = "https://covers.example.test/missing.jpg";
  await page.route("https://covers.example.test/**", (route) => route.fulfill({ status: 404, body: "" }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".song-carousel .album-tile").first().locator(".song-cover img")).toHaveCount(0);
  await expect(page.locator(".song-carousel .album-tile").first().locator(".song-cover svg")).toBeVisible();
  expect(await page.locator(".page-transition").evaluate((node) => parseFloat(getComputedStyle(node).animationDuration))).toBeLessThan(.001);
  await page.locator(".queue-section .album-tile").first().click();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator(".queue-section .album-tile").first().click();
  await expect(page.getByRole("dialog")).toHaveCSS("animation-name", "dialog-enter");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator(".queue-section .album-tile").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
