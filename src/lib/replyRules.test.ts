import { describe, expect, it } from "vitest";
import { getReplyLength, limitReplyLength, MAX_REPLY_LENGTH, normalizeReplyBody } from "./replyRules";

describe("답글 길이 제한", () => {
  it("앞뒤 공백을 제외한 300자 답글을 허용한다", () => {
    const body = "가".repeat(MAX_REPLY_LENGTH);
    expect(normalizeReplyBody(`  ${body}  `)).toBe(body);
  });

  it("빈 답글과 300자를 넘는 답글을 거부한다", () => {
    expect(() => normalizeReplyBody("   ")).toThrow();
    expect(() => normalizeReplyBody("가".repeat(MAX_REPLY_LENGTH + 1))).toThrow();
  });

  it("이모지도 한 글자로 세어 300자에서 자른다", () => {
    const body = "🎵".repeat(MAX_REPLY_LENGTH + 1);
    expect(getReplyLength(limitReplyLength(body))).toBe(MAX_REPLY_LENGTH);
  });
});
