export type Decision = "승격" | "방출" | "보류";

export interface Song {
  id: string;
  title: string;
  artist: string;
  adder: string;
  adder_member_id: string | null;
  createdAt: string;
  coverImageUrl: string | null;
}

export interface Vote {
  id: string;
  songId: string;
  voter: string;
  member_id: string | null;
  decision: Decision;
  rating: number;
  reason: string;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  createdAt: string;
}

export interface MutigoeulEntry {
  id: string;
  songId: string;
  createdAt: string;
}

export interface ClubData {
  songs: Song[];
  votes: Vote[];
  members: Member[];
  mutigoeulEntries: MutigoeulEntry[];
}

export interface PlaylistSong {
  title: string;
  artist: string;
  coverImageUrl?: string | null;
}

export interface VoteStats {
  votes: Vote[];
  promotedCount: number;
  releasedCount: number;
  heldCount: number;
}
