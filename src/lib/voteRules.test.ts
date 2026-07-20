import { describe, expect, it } from "vitest";
import { findMemberVotes, planVoteSave } from "./voteRules";
import type { Vote } from "../types";

function vote(overrides: Partial<Vote> = {}): Vote {
  return {
    id: "vote-1",
    songId: "song-1",
    voter: "민수",
    member_id: "member-1",
    decision: "승격",
    rating: 4,
    reason: "좋아요",
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

const draft = { decision: "승격" as const, rating: 4, reason: "좋아요" };

describe("평가 저장 판정", () => {
  it("저장된 내용과 같으면 다시 저장하지 않는다", () => {
    expect(planVoteSave([vote()], draft).action).toBe("unchanged");
  });

  it("기존 평가 내용이 달라지면 같은 평가를 수정한다", () => {
    const plan = planVoteSave([vote({ decision: "보류", rating: 3 })], draft);
    expect(plan.action).toBe("update");
    if (plan.action === "update") {
      expect(plan.primary.id).toBe("vote-1");
      expect(plan.duplicateIds).toEqual([]);
    }
  });

  it("중복 평가가 있으면 대표 평가를 수정하고 나머지를 제거한다", () => {
    const plan = planVoteSave([vote(), vote({ id: "vote-2" })], draft);
    expect(plan.action).toBe("update");
    if (plan.action === "update") expect(plan.duplicateIds).toEqual(["vote-2"]);
  });

  it("기존 평가가 없으면 새 평가를 저장한다", () => {
    expect(planVoteSave([], draft).action).toBe("insert");
  });
});

describe("프로필별 평가 찾기", () => {
  it("곡과 프로필이 모두 같은 평가만 찾는다", () => {
    const votes = [
      vote(),
      vote({ id: "vote-2", songId: "song-2" }),
      vote({ id: "vote-3", member_id: "member-2", voter: "지수" }),
    ];
    expect(findMemberVotes(votes, "song-1", { id: "member-1", name: "민수" }).map(({ id }) => id)).toEqual(["vote-1"]);
  });
});
