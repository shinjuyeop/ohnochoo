import { expect, it } from "vitest";
import { coverSrcSet, normalizeCoverUrl } from "./utils";

it("resizes Apple artwork, including template URLs and URLs with query strings", () => {
  expect(normalizeCoverUrl("https://is1-ssl.mzstatic.com/image/thumb/cover/{w}x{h}{c}.{f}", 128)).toBe("https://is1-ssl.mzstatic.com/image/thumb/cover/128x128bb.jpg");
  expect(normalizeCoverUrl("https://is1-ssl.mzstatic.com/image/thumb/cover/600x600bb-60.jpg?version=1", 192)).toBe("https://is1-ssl.mzstatic.com/image/thumb/cover/192x192bb.jpg?version=1");
  const sources = coverSrcSet("https://is1-ssl.mzstatic.com/image/thumb/cover/600x600bb.jpg")!;
  expect(sources).toContain("/128x128bb.jpg 128w");
  expect(sources).toContain("/960x960bb.jpg 960w");
});

it("preserves non-Apple covers, signed URLs, data images and unsupported paths", () => {
  for (const url of ["https://example.com/600x600.jpg?token=signature", "https://mzstatic.com.evil.test/600x600.jpg", "data:image/png;base64,test", "https://is1-ssl.mzstatic.com/custom/cover.jpg"]) {
    expect(normalizeCoverUrl(url, 128)).toBe(url);
    expect(coverSrcSet(url)).toBeUndefined();
  }
  expect(coverSrcSet(null)).toBeUndefined();
});
