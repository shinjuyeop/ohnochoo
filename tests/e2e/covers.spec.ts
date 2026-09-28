import { expect, test, type Locator } from "@playwright/test";
import { mockClub } from "./fixture";

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });

async function expectSquareArtwork(cover: Locator) {
  const bounds = await cover.evaluate((element) => {
    const frame = element.getBoundingClientRect();
    const image = element.querySelector("img")!.getBoundingClientRect();
    return { width: frame.width, height: frame.height, imageWidth: image.width, imageHeight: image.height };
  });
  expect(bounds.width).toBeGreaterThan(100);
  expect(bounds.height).toBeCloseTo(bounds.width, 1);
  expect(bounds.imageWidth).toBeCloseTo(bounds.width, 1);
  expect(bounds.imageHeight).toBeCloseTo(bounds.height, 1);
}

test("first home visit reveals whole covers after download and decode without a tab change", async ({ page }) => {
  const state = await mockClub(page);
  state.tables.songs[0].coverImageUrl = "https://covers.example.test/slow-cover.png?first";
  state.tables.songs[1].coverImageUrl = "https://covers.example.test/slow-cover.png?second";
  await page.addInitScript(() => {
    const nativeDecode = HTMLImageElement.prototype.decode;
    const decodeGate = new Promise<void>((resolve) => {
      document.addEventListener("test:release-cover-decode", () => resolve(), { once: true });
    });
    HTMLImageElement.prototype.decode = async function () {
      await nativeDecode.call(this);
      if (this.src.includes("/slow-cover.png")) await decodeGate;
    };
  });
  let releaseDownload!: () => void;
  const downloadGate = new Promise<void>((resolve) => { releaseDownload = resolve; });
  await page.route("https://covers.example.test/**", async (route) => {
    await downloadGate;
    await route.fulfill({ contentType: "image/png", path: "public/assets/icons/icon-512-20260709.png" });
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "평가할 곡 3" })).toBeVisible();
    const covers = page.locator(".queue-section .song-cover");
    for (let index = 0; index < 2; index++) {
      await expectSquareArtwork(covers.nth(index));
      await expect(covers.nth(index).locator("img")).toHaveCSS("opacity", "0");
    }
    releaseDownload();
    for (let index = 0; index < 2; index++) {
      const image = covers.nth(index).locator("img");
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      // A download finishing must not expose a frame while its decoder is still pending.
      await expect(image).toHaveCSS("opacity", "0");
    }
    await page.evaluate(() => document.dispatchEvent(new Event("test:release-cover-decode")));
    for (let index = 0; index < 2; index++) {
      await expect(covers.nth(index).locator("img")).toHaveCSS("opacity", "1");
      await expectSquareArtwork(covers.nth(index));
    }
    // Cached/revisited artwork and a narrower viewport must keep filling the square.
    await page.locator(".bottom-nav").getByRole("link", { name: "오노추", exact: true }).click();
    await page.locator(".bottom-nav").getByRole("link", { name: "홈", exact: true }).click();
    await page.setViewportSize({ width: 320, height: 568 });
    for (let index = 0; index < 2; index++) {
      await expect(covers.nth(index).locator("img")).toHaveCSS("opacity", "1");
      await expectSquareArtwork(covers.nth(index));
    }
  } finally { releaseDownload(); }
});
