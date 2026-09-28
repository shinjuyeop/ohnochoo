export type Decision = "승격" | "방출" | "보류";

export interface Song {
  id: string;
  title: string;
  artist: string;
  adder: string;
  adder_member_id: string | null;
  createdAt: string;
  coverImageUrl: string | null;
  archived_at?: string | null;
  album_url?: string | null;
  album_name?: string | null;
}

export interface VoteSummary {
  id: string;
  songId: string;
  voter: string;
  member_id: string | null;
  decision: Decision;
  rating: number;
  createdAt: string;
}

export interface Vote extends VoteSummary {
  reason: string;
}

export interface VoteReply {
  id: string;
  vote_id: string;
  author: string;
  member_id: string | null;
  body: string;
  created_at: string;
}

export interface Member {
  id: string;
  name: string;
  createdAt: string;
  avatar_url?: string | null;
  avatar_updated_at?: string | null;
}

export interface MutigoeulEntry {
  id: string;
  songId: string;
  createdAt: string;
}

export interface ClubData {
  songs: Song[];
  votes: VoteSummary[];
  members: Member[];
  mutigoeulEntries: MutigoeulEntry[];
}

export interface PlaylistSong {
  title: string;
  artist: string;
  coverImageUrl?: string | null;
  albumUrl?: string | null;
  albumName?: string | null;
}

export interface VoteStats {
  votes: VoteSummary[];
  promotedCount: number;
  releasedCount: number;
  heldCount: number;
}

export interface WeeklyTheme {
  id: string;
  week_start: string;
  title: string;
  description: string;
}

export interface ThemeSong {
  id: string;
  weekly_theme_id: string;
}
