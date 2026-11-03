import { describe, expect, it } from "vitest";
import {
  averageRating,
  getSongStatus,
  hasElapsedOneWeek,
  isMutigoeulReady,
  isPromotionTarget,
  isSongByMember,
  isVoteByMember,
  getDecisionCountdown,
  sortByDecisionDate,
  extractPlaylistAlbums,
  getAlbumSongs,
  getOnochooSongs,
  isAlbumSong,
} from "./songRules";
import { ALBUMS_MARKER } from "./constants";
import type { Song, Vote } from "../types";

const WEEK = 14 * 24 * 60 * 60 * 1000;
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

describe("평가 순서와 판정일까지 남은 시간", () => {
  it("판정 시점을 지나기 전까지는 남은 시간으로 안내한다", () => {
    expect(getDecisionCountdown(new Date(NOW - WEEK + 1).toISOString(), NOW)).toBe("판정까지 24시간 이내");
    expect(getDecisionCountdown(new Date(NOW - WEEK).toISOString(), NOW)).toBe("판정일 지남");
    expect(getDecisionCountdown(new Date(NOW - WEEK + 2 * 86_400_000).toISOString(), NOW)).toBe("판정까지 2일");
    expect(getDecisionCountdown("invalid", NOW)).toBeNull();
  });
  it("원본 배열을 바꾸지 않고 오래된 미평가 곡을 먼저 보여준다", () => {
    const songs = [song({ id: "new", createdAt: new Date(NOW).toISOString() }), song({ id: "old" })];
    expect(sortByDecisionDate(songs).map((item) => item.id)).toEqual(["old", "new"]);
    expect(songs[0].id).toBe("new");
  });
});

describe("등록 후 14일 판정", () => {
  it("정확히 14일이 지난 시점부터 참이다", () => {
    expect(hasElapsedOneWeek(new Date(NOW - WEEK).toISOString(), NOW)).toBe(true);
    expect(hasElapsedOneWeek(new Date(NOW - WEEK + 1).toISOString(), NOW)).toBe(false);
  });

  it("잘못된 날짜와 미래 날짜는 거짓이다", () => {
    expect(hasElapsedOneWeek("invalid", NOW)).toBe(false);
    expect(hasElapsedOneWeek(new Date(NOW + 1).toISOString(), NOW)).toBe(false);
  });
});

describe("무티고을 이동 가능 여부", () => {
  it("14일 경과와 승격 조건을 모두 만족해야 한다", () => {
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

describe("앨범스 분리와 앨범 단위 추출", () => {
  it("오노추 목록과 앨범스 목록을 분리한다", () => {
    const onochuItem = song({ id: "song-1", title: "곡 제목" });
    const albumItem = song({ id: "album-1", title: "앨범 제목", album_name: ALBUMS_MARKER });
    const clubData = { songs: [onochuItem, albumItem], votes: [], members: [], mutigoeulEntries: [] };

    expect(isAlbumSong(onochuItem)).toBe(false);
    expect(isAlbumSong(albumItem)).toBe(true);
    expect(getOnochooSongs(clubData).map((item) => item.id)).toEqual(["song-1"]);
    expect(getAlbumSongs(clubData).map((item) => item.id)).toEqual(["album-1"]);
  });

  it("플레이리스트 트랙을 수록 앨범 단위로 묶고 이미 등록된 앨범은 제외한다", () => {
    const existing = [song({ id: "album-existing", title: "이미 있는 앨범", artist: "가수 A", album_name: ALBUMS_MARKER, album_url: "https://music.apple.com/kr/album/existing/100" })];
    const tracks = [
      { title: "트랙 1", artist: "가수 B", albumName: "새 앨범", albumUrl: "https://music.apple.com/kr/album/track-1/200", coverImageUrl: "https://example.com/cover.jpg" },
      { title: "트랙 2", artist: "가수 B & 친구", albumName: "새 앨범", albumUrl: "https://music.apple.com/kr/album/track-2/200", coverImageUrl: "https://example.com/cover.jpg" },
      { title: "트랙 3", artist: "가수 B (feat. C)", albumName: "새 앨범", albumUrl: null, coverImageUrl: "https://example.com/cover.jpg" },
      { title: "기존 트랙", artist: "가수 A", albumName: "이미 있는 앨범", albumUrl: "https://music.apple.com/kr/album/existing/100" },
    ];

    expect(extractPlaylistAlbums(tracks, existing)).toEqual([
      {
        title: "새 앨범",
        artist: "가수 B",
        coverImageUrl: "https://example.com/cover.jpg",
        albumUrl: "https://music.apple.com/kr/album/track-1/200",
        albumName: ALBUMS_MARKER,
      },
    ]);
  });
});
