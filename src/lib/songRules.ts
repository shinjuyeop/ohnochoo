import type { ClubData, PlaylistSong, Song, VoteSummary, VoteStats } from "../types";
import { ALBUMS_MARKER } from "./constants";
import { getSongKey, normalizeCoverUrl } from "./utils";

export function isAlbumSong(song: Pick<Song, "album_name">) {
  return song.album_name === ALBUMS_MARKER;
}

export function isVoteByMember(vote: VoteSummary, member: { id: string; name: string }) {
  return member.id && vote.member_id ? vote.member_id === member.id : vote.voter === member.name;
}

export function isSongByMember(song: Song, member: { id: string; name: string }) {
  return member.id && song.adder_member_id
    ? song.adder_member_id === member.id
    : song.adder === member.name;
}

export function buildVoteStats(votes: VoteSummary[]) {
  const map = new Map<string, VoteStats>();
  for (const vote of votes) {
    const stats = map.get(vote.songId) ?? {
      votes: [],
      promotedCount: 0,
      releasedCount: 0,
      heldCount: 0,
    };
    stats.votes.push(vote);
    if (vote.decision === "승격") stats.promotedCount += 1;
    if (vote.decision === "방출") stats.releasedCount += 1;
    if (vote.decision === "보류") stats.heldCount += 1;
    map.set(vote.songId, stats);
  }
  return map;
}

export const emptyVoteStats = (): VoteStats => ({
  votes: [],
  promotedCount: 0,
  releasedCount: 0,
  heldCount: 0,
});

export function getOnochooSongs(data: ClubData) {
  const moved = new Set(data.mutigoeulEntries.map((entry) => entry.songId));
  return data.songs.filter((song) => !song.archived_at && !moved.has(song.id) && !isAlbumSong(song));
}

export function getAlbumSongs(data: ClubData) {
  const moved = new Set(data.mutigoeulEntries.map((entry) => entry.songId));
  return data.songs.filter((song) => !song.archived_at && !moved.has(song.id) && isAlbumSong(song));
}

export function extractPlaylistAlbums(tracks: PlaylistSong[], existingAlbums: Song[] = []): PlaylistSong[] {
  const existingKeys = new Set(existingAlbums.map((item) => getSongKey(item.title, item.artist)));
  const existingUrls = new Set(existingAlbums.map((item) => item.album_url).filter((url): url is string => Boolean(url)));
  const grouped = new Map<string, PlaylistSong>();

  for (const track of tracks) {
    const albumTitle = (track.albumName || track.title || "").trim();
    const artist = (track.artist || "").trim();
    if (!albumTitle || !artist) continue;
    const songKey = getSongKey(albumTitle, artist);
    const albumUrl = track.albumUrl?.trim() || null;
    if (existingKeys.has(songKey) || (albumUrl && existingUrls.has(albumUrl))) continue;

    const groupKey = albumUrl ? `url:${albumUrl.toLowerCase()}` : `key:${songKey}`;
    const existing = grouped.get(groupKey);
    const coverImageUrl = normalizeCoverUrl(track.coverImageUrl);
    if (!existing) {
      grouped.set(groupKey, {
        title: albumTitle,
        artist,
        coverImageUrl,
        albumUrl,
        albumName: ALBUMS_MARKER,
      });
    } else {
      if (!existing.coverImageUrl && coverImageUrl) existing.coverImageUrl = coverImageUrl;
      if (!existing.albumUrl && albumUrl) existing.albumUrl = albumUrl;
    }
  }

  return Array.from(grouped.values());
}

export function getMutigoeulSongs(data: ClubData) {
  const songs = new Map(data.songs.map((song) => [song.id, song]));
  return data.mutigoeulEntries.map((entry) => songs.get(entry.songId)).filter(Boolean) as Song[];
}

export function isPromotionTarget(promoted: number, released: number) {
  return promoted >= released + 3;
}

export function hasElapsedOneWeek(createdAt: string, now = Date.now()) {
  const created = new Date(createdAt).getTime();
  return !Number.isNaN(created) && now - created >= 14 * 24 * 60 * 60 * 1000;
}

export function isMutigoeulReady(song: Song, promoted: number, released: number, now = Date.now()) {
  return hasElapsedOneWeek(song.createdAt, now) && isPromotionTarget(promoted, released);
}

export function getSongStatus(song: Song, promoted: number, released: number, now = Date.now()) {
  if (isMutigoeulReady(song, promoted, released, now)) {
    return { label: "무티고을 이동 가능", tone: "ready" as const };
  }
  if (isPromotionTarget(promoted, released)) {
    return { label: "승격 후보", tone: "promote" as const };
  }
  if (hasElapsedOneWeek(song.createdAt, now)) {
    return { label: "방출 예정", tone: "release" as const };
  }
  return { label: "평가 중", tone: "pending" as const };
}

export function averageRating(votes: VoteSummary[]) {
  const ratings = votes.map((vote) => Number(vote.rating)).filter((rating) => rating > 0);
  if (!ratings.length) return null;
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
}

export function getDecisionCountdown(createdAt: string, now = Date.now()) {
  const remaining = new Date(createdAt).getTime() + 14 * 24 * 60 * 60 * 1000 - now;
  if (!Number.isFinite(remaining)) return null;
  if (remaining <= 0) return "판정일 지남";
  if (remaining < 24 * 60 * 60 * 1000) return "판정까지 24시간 이내";
  return `판정까지 ${Math.ceil(remaining / (24 * 60 * 60 * 1000))}일`;
}

export function sortByDecisionDate(songs: Song[]) {
  return [...songs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id));
}
