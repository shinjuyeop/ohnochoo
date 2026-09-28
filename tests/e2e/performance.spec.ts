import { expect, test } from "@playwright/test";
import { mockClub } from "./fixture";

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

test("startup stops at known table totals without requesting empty trailing pages", async ({ page }) => {
  const state = await mockClub(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "평가할 곡 3" })).toBeVisible();
  const reads = state.reads.map((url) => new URL(url)).filter((url) => url.pathname.includes("/rest/v1/"));
  expect(reads.map((url) => `${url.pathname.split("/").at(-1)}:${url.searchParams.get("offset")}` ).sort()).toEqual([
    "members:0", "mutigoeul_songs:0", "songs:0", "songs:2", "votes:0", "votes:2",
  ]);
});

test("confirmed votes and replies appear without waiting for another library read", async ({ page }) => {
  const state = await mockClub(page);
  await page.goto("/onochoo?song=old-song");
  await page.getByRole("button", { name: "승격", exact: true }).click();
  await page.getByRole("textbox", { name: "평가 이유", exact: true }).fill("재조회가 느려도 저장한 평가가 보여요");
  let unblock!: () => void;
  const blocked = new Promise<void>((resolve) => { unblock = resolve; });
  await page.route("**/__mock__/**", async (route) => {
    if (state.writes.length) await blocked;
    await route.fallback();
  });
  try {
    await page.getByRole("button", { name: "평가 저장하기", exact: true }).click();
    await expect(page.getByRole("button", { name: "평가 수정하기", exact: true })).toBeEnabled();
    await expect(page.locator(".friend-votes")).toContainText("재조회가 느려도 저장한 평가가 보여요");
    await expect(page.locator(".summary-promote b")).toHaveText("2");
    await page.getByRole("button", { name: "답글 쓰기", exact: true }).first().click();
    await page.getByRole("textbox", { name: "답글 내용", exact: true }).fill("답글도 바로 보여요");
    await page.getByRole("button", { name: "등록", exact: true }).click();
    await expect(page.locator(".vote-reply").filter({ hasText: "답글도 바로 보여요" })).toBeVisible();
  } finally { unblock(); }
});

test("Apple thumbnails use smaller files while carousel artwork retains retina resolution", async ({ page }) => {
  const state = await mockClub(page);
  state.tables.songs[0].coverImageUrl = "https://is1-ssl.mzstatic.com/image/thumb/fixture/600x600bb.jpg";
  await page.route("https://is1-ssl.mzstatic.com/**", (route) => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="teal"/></svg>' }));
  await page.goto("/onochoo");
  const cover = page.getByRole("img", { name: "오래된 노래 앨범 커버", exact: true });
  await expect.poll(() => cover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const selectedSize = () => cover.evaluate((img: HTMLImageElement) => Number(new URL(img.currentSrc).pathname.match(/\/(\d+)x\d+bb\.jpg$/)![1]));
  const thumbnailSize = await selectedSize();
  expect(thumbnailSize).toBeGreaterThanOrEqual(104);
  expect(thumbnailSize).toBeLessThanOrEqual(192);
  await page.goto("/");
  await expect.poll(selectedSize).toBeGreaterThan(thumbnailSize);
  expect(await selectedSize()).toBeLessThanOrEqual(640);
});

test("a failed background refresh keeps the loaded app and unsaved evaluation available", async ({ page }) => {
  await mockClub(page);
  await page.goto("/onochoo?song=old-song");
  const reason = page.getByRole("textbox", { name: "평가 이유", exact: true });
  await reason.fill("연결이 잠깐 끊겨도 화면과 초안이 남아요");
  // A confirmed write marks the library stale; reopening another route normally refetches it.
  await page.getByRole("button", { name: "승격", exact: true }).click();
  await page.getByRole("button", { name: "평가 저장하기", exact: true }).click();
  await expect(page.getByRole("button", { name: "평가 수정하기", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "평가 수정하기", exact: true }).click();
  await reason.fill("새로 수정 중인 초안");
  let failedReads = 0;
  await page.route("**/__mock__/rest/v1/**", (route) => {
    failedReads++;
    return route.fulfill({ status: 503, json: { message: "temporarily offline" } });
  });
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect.poll(() => failedReads).toBeGreaterThanOrEqual(8);
  await expect(page.locator(".discussion-state[role=alert]")).toBeVisible();
  await expect(page.getByRole("heading", { name: "연결하지 못했어요" })).toHaveCount(0);
  await expect(reason).toHaveValue("새로 수정 중인 초안");
});
