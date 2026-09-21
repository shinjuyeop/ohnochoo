import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import { buildVoteStats, getMutigoeulSongs, getOnochooSongs } from "../lib/songRules";
import { fetchAllPages } from "../lib/pagination";
import type { ClubData, Member, MutigoeulEntry, Song, Vote, VoteReply, VoteStats, VoteSummary } from "../types";

async function fetchClubData(): Promise<ClubData> {
  const supabase = await getSupabase();
  const [songs, votes, members, mutigoeul] = await Promise.all([
    fetchAllPages<Song>((from, to) => supabase.from("songs").select("id,title,artist,adder,adder_member_id,createdAt,coverImageUrl").order("createdAt").order("id").range(from, to)),
    fetchAllPages<VoteSummary>((from, to) => supabase.from("votes").select("id,songId,voter,member_id,decision,rating,createdAt").order("createdAt").order("id").range(from, to)),
    fetchAllPages<Member>((from, to) => supabase.from("members").select("*").order("name").order("id").range(from, to)),
    fetchAllPages<MutigoeulEntry>((from, to) => supabase.from("mutigoeul_songs").select("id,songId,createdAt").order("createdAt").order("id").range(from, to)),
  ]);
  return {
    songs,
    votes: votes.map((vote) => ({ ...vote, rating: Number(vote.rating) })),
    members,
    mutigoeulEntries: mutigoeul,
  };
}

export function useSongDiscussion(songId: string | null) {
  return useQuery({
    queryKey: ["song-discussion", songId],
    enabled: Boolean(songId),
    queryFn: async () => {
      const supabase = await getSupabase();
      const [votes, replies] = await Promise.all([
        fetchAllPages<Vote>((from, to) => supabase.from("votes").select("id,songId,voter,member_id,decision,rating,reason,createdAt").eq("songId", songId!).order("createdAt", { ascending: false }).order("id").range(from, to)),
        fetchAllPages<VoteReply>((from, to) => supabase.from("vote_replies").select("id,vote_id,author,member_id,body,created_at,votes!inner(songId)").eq("votes.songId", songId!).order("created_at").order("id").range(from, to)),
      ]);
      return { votes: votes.map((vote) => ({ ...vote, rating: Number(vote.rating) })), replies };
    },
  });
}

export function useClubData() {
  const query = useQuery({ queryKey: ["club-data"], queryFn: fetchClubData });
  const derived = useMemo(() => {
    const data = query.data;
    if (!data) return { onochuSongs: [] as Song[], mutigoeulSongs: [] as Song[], voteStats: new Map<string, VoteStats>() };
    return {
      onochuSongs: getOnochooSongs(data),
      mutigoeulSongs: getMutigoeulSongs(data),
      voteStats: buildVoteStats(data.votes),
    };
  }, [query.data]);
  return { ...query, ...derived };
}

export function RealtimeSync() {
  const client = useQueryClient();
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    let timer = 0;
    void getSupabase().then((supabase) => {
      if (cancelled) return;
      const channel = supabase.channel("ohnochoo-db-changes");
      const reload = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          void client.invalidateQueries({ queryKey: ["club-data"] });
          void client.invalidateQueries({ queryKey: ["song-discussion"] });
        }, 400);
      };
      for (const table of ["songs", "votes", "vote_replies", "mutigoeul_songs", "members"]) {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, reload);
      }
      channel.subscribe();
      cleanup = () => {
        window.clearTimeout(timer);
        void supabase.removeChannel(channel);
      };
    }).catch(() => { /* The query shows connection errors and retries. */ });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [client]);
  return null;
}
