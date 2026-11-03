import type { ClubData, PlaylistSong, Song, VoteSummary, VoteStats } from "../types";
import { ALBUMS_MARKER } from "./constants";
import { normalizeCoverUrl } from "./utils";

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

function extractAppleMusicAlbumId(url?: string | null) {
  if (!url) return null;
  const match = url.match(/\/album\/(?:[^/?#]+\/)?(\d+)(?:[/?#]|$)/i);
  return match ? match[1] : null;
}

export function extractPlaylistAlbums(tracks: PlaylistSong[], existingAlbums: Song[] = []): PlaylistSong[] {
  const existingTitles = new Set(existingAlbums.map((item) => item.title.trim().toLowerCase()));
  const existingUrls = new Set(existingAlbums.map((item) => item.album_url?.trim().toLowerCase()).filter((url): url is string => Boolean(url)));
  const existingAlbumIds = new Set(existingAlbums.map((item) => extractAppleMusicAlbumId(item.album_url)).filter((id): id is string => Boolean(id)));

  const albums: PlaylistSong[] = [];
  const byTitle = new Map<string, PlaylistSong>();
  const byAlbumId = new Map<string, PlaylistSong>();

  for (const track of tracks) {
    const albumTitle = (track.albumName || track.title || "").trim();
    const artist = (track.artist || "").trim();
    if (!albumTitle || !artist) continue;

    const normalizedTitle = albumTitle.toLowerCase();
    const albumUrl = track.albumUrl?.trim() || null;
    const normalizedUrl = albumUrl?.toLowerCase() || null;
    const albumId = extractAppleMusicAlbumId(albumUrl);

    if (
      existingTitles.has(normalizedTitle)
      || (normalizedUrl && existingUrls.has(normalizedUrl))
      || (albumId && existingAlbumIds.has(albumId))
    ) {
      continue;
    }

    const existing = byTitle.get(normalizedTitle) ?? (albumId ? byAlbumId.get(albumId) : undefined);
    const coverImageUrl = normalizeCoverUrl(track.coverImageUrl);
    if (!existing) {
      const created: PlaylistSong = {
        title: albumTitle,
        artist,
        coverImageUrl,
        albumUrl,
        albumName: ALBUMS_MARKER,
      };
      albums.push(created);
      byTitle.set(normalizedTitle, created);
      if (albumId) byAlbumId.set(albumId, created);
    } else {
      if (!existing.coverImageUrl && coverImageUrl) existing.coverImageUrl = coverImageUrl;
      if (!existing.albumUrl && albumUrl) existing.albumUrl = albumUrl;
      byTitle.set(normalizedTitle, existing);
      if (albumId) byAlbumId.set(albumId, existing);
    }
  }

  return albums;
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
