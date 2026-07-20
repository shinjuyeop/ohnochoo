import { describe, expect, it } from "vitest";
import {
  averageRating,
  getSongStatus,
  hasElapsedOneWeek,
  isMutigoeulReady,
  isPromotionTarget,
  isSongByMember,
  isVoteByMember,
} from "./songRules";
import type { Song, Vote } from "../types";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-07-20T12:00:00.000Z");

function song(overrides: Partial<Song> = {}): Song {
  return {
    id: "song-1",
    title: "노래",
    artist: "가수",
    adder: "민수",
    adder_member_id: "member-1",
    createdAt: new Date(NOW - WEEK).toISOString(),
    coverImageUrl: null,
    ...overrides,
  };
}

function vote(overrides: Partial<Vote> = {}): Vote {
  return {
    id: "vote-1",
    songId: "song-1",
    voter: "민수",
    member_id: "member-1",
    decision: "승격",
    rating: 4,
    reason: "좋아요",
    createdAt: new Date(NOW).toISOString(),
    ...overrides,
  };
}

describe("승격 판정", () => {
  it("승격 수가 방출 수보다 정확히 3개 많으면 승격 후보이다", () => {
    expect(isPromotionTarget(5, 2)).toBe(true);
  });

  it("차이가 3개보다 작으면 승격 후보가 아니다", () => {
    expect(isPromotionTarget(4, 2)).toBe(false);
  });
});

describe("등록 후 7일 판정", () => {
  it("정확히 7일이 지난 시점부터 참이다", () => {
    expect(hasElapsedOneWeek(new Date(NOW - WEEK).toISOString(), NOW)).toBe(true);
    expect(hasElapsedOneWeek(new Date(NOW - WEEK + 1).toISOString(), NOW)).toBe(false);
  });

  it("잘못된 날짜와 미래 날짜는 거짓이다", () => {
    expect(hasElapsedOneWeek("invalid", NOW)).toBe(false);
    expect(hasElapsedOneWeek(new Date(NOW + 1).toISOString(), NOW)).toBe(false);
  });
});

describe("무티고을 이동 가능 여부", () => {
  it("7일 경과와 승격 조건을 모두 만족해야 한다", () => {
    expect(isMutigoeulReady(song(), 5, 2, NOW)).toBe(true);
    expect(isMutigoeulReady(song({ createdAt: new Date(NOW - WEEK + 1).toISOString() }), 5, 2, NOW)).toBe(false);
    expect(isMutigoeulReady(song(), 4, 2, NOW)).toBe(false);
  });

  it("조건에 맞는 상태 라벨을 반환한다", () => {
    expect(getSongStatus(song(), 5, 2, NOW).label).toBe("무티고을 이동 가능");
    expect(getSongStatus(song({ createdAt: new Date(NOW).toISOString() }), 5, 2, NOW).label).toBe("승격 후보");
    expect(getSongStatus(song(), 4, 2, NOW).label).toBe("방출 예정");
  });
});

describe("평균 별점", () => {
  it("0점을 제외하고 평균을 계산한다", () => {
    expect(averageRating([vote({ rating: 0 }), vote({ id: "vote-2", rating: 3 }), vote({ id: "vote-3", rating: 5 })])).toBe(4);
  });

  it("유효한 별점이 없으면 null을 반환한다", () => {
    expect(averageRating([vote({ rating: 0 })])).toBeNull();
  });
});

describe("프로필 ID와 이름 fallback", () => {
  const member = { id: "member-1", name: "민수" };

  it("양쪽에 ID가 있으면 이름보다 ID를 우선한다", () => {
    expect(isVoteByMember(vote({ voter: "예전 이름" }), member)).toBe(true);
    expect(isVoteByMember(vote({ member_id: "member-2", voter: "민수" }), member)).toBe(false);
    expect(isSongByMember(song({ adder: "예전 이름" }), member)).toBe(true);
    expect(isSongByMember(song({ adder_member_id: "member-2", adder: "민수" }), member)).toBe(false);
  });

  it("기존 데이터에 ID가 없으면 이름으로 비교한다", () => {
    expect(isVoteByMember(vote({ member_id: null, voter: "민수" }), member)).toBe(true);
    expect(isSongByMember(song({ adder_member_id: null, adder: "민수" }), member)).toBe(true);
  });
});
