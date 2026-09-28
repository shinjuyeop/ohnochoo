import { describe, expect, it } from "vitest";
import { koreanWeekStart, themeDateRange } from "./weeklyTheme";

describe("weekly theme dates", () => {
  it("changes weeks at Monday midnight in Korea", () => {
    expect(koreanWeekStart(new Date("2026-09-27T14:59:59Z"))).toBe("2026-09-21");
    expect(koreanWeekStart(new Date("2026-09-27T15:00:00Z"))).toBe("2026-09-28");
  });
  it("handles year boundaries and date strings with other time zones", () => {
    expect(koreanWeekStart(new Date("2026-01-01T10:00:00+09:00"))).toBe("2025-12-29");
    expect(koreanWeekStart(new Date("2026-09-27T08:00:00-07:00"))).toBe("2026-09-28");
    expect(themeDateRange("2025-12-29")).toBe("12.29 — 1.4");
  });
});
