import { afterEach, describe, expect, it, vi } from "vitest";
import { readReviewSession, reviewProgress } from "./reviewSession";

afterEach(() => vi.unstubAllGlobals());

describe("a fixed review queue", () => {
  it("does not add newly recommended songs to an existing session", () => {
    const session = { ids: ["old", "due", "new"], completed: ["old"], startedAt: Date.now() };
    expect(reviewProgress(session, ["due", "new", "later"])).toEqual({ remaining: ["due", "new"], completed: 1, total: 3, skipped: 0 });
  });
  it("skips closed or externally evaluated songs without crediting them as this session's work", () => {
    const session = { ids: ["old", "archived", "elsewhere"], completed: ["old"], startedAt: Date.now() };
    expect(reviewProgress(session, [])).toEqual({ remaining: [], completed: 1, total: 3, skipped: 2 });
  });
  it("restores unique completions only for the original queue", () => {
    vi.stubGlobal("sessionStorage", { getItem: () => JSON.stringify({ ids: ["a", "b", "b"], completed: ["a", "a", "unrelated"], startedAt: Date.now() }) });
    expect(readReviewSession("profile")?.completed).toEqual(["a"]);
    expect(readReviewSession("profile")?.ids).toEqual(["a", "b"]);
  });
  it("ignores expired, malformed or unavailable browser storage", () => {
    for (const value of ["{", JSON.stringify({ ids: ["a"], completed: [], startedAt: Date.now() - 2 * 86400000 }), JSON.stringify({ ids: [2], completed: [], startedAt: Date.now() })]) {
      vi.stubGlobal("sessionStorage", { getItem: () => value });
      expect(readReviewSession("profile")).toBeNull();
    }
    vi.stubGlobal("sessionStorage", { getItem() { throw Error("blocked"); } });
    expect(readReviewSession("profile")).toBeNull();
  });
});
