import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import { buildVoteStats, getMutigoeulSongs, getOnochooSongs } from "../lib/songRules";
import { fetchAllPages } from "../lib/pagination";
import type { ClubData, Member, MutigoeulEntry, Song, Vote, VoteReply, VoteStats, VoteSummary } from "../types";

async function fetchClubData({ signal }: { signal: AbortSignal }): Promise<ClubData> {
  // React Query owns retries; stacking PostgREST retries multiplies outage delays.
  const supabase = await getSupabase();
  const [songs, votes, members, mutigoeul] = await Promise.all([
    fetchAllPages<Song>((from, to) => supabase.from("songs").select("*", from === 0 ? { count: "exact" } : {}).order("createdAt").order("id").range(from, to).abortSignal(signal).retry(false)),
    fetchAllPages<VoteSummary>((from, to) => supabase.from("votes").select("id,songId,voter,member_id,decision,rating,createdAt", from === 0 ? { count: "exact" } : {}).order("createdAt").order("id").range(from, to).abortSignal(signal).retry(false)),
    fetchAllPages<Member>((from, to) => supabase.from("members").select("*", from === 0 ? { count: "exact" } : {}).order("name").order("id").range(from, to).abortSignal(signal).retry(false)),
    fetchAllPages<MutigoeulEntry>((from, to) => supabase.from("mutigoeul_songs").select("id,songId,createdAt", from === 0 ? { count: "exact" } : {}).order("createdAt").order("id").range(from, to).abortSignal(signal).retry(false)),
  ]);
  return {
    songs,
    votes: votes.map((vote) => ({ ...vote, rating: Number(vote.rating) })),
    members,
    mutigoeulEntries: mutigoeul,
  };
}

export function useSongDiscussion(songId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["song-discussion", songId],
    enabled: Boolean(songId) && enabled,
    queryFn: async ({ signal }) => {
      const supabase = await getSupabase();
      const [votes, replies] = await Promise.all([
        fetchAllPages<Vote>((from, to) => supabase.from("votes").select("id,songId,voter,member_id,decision,rating,reason,createdAt", from === 0 ? { count: "exact" } : {}).eq("songId", songId!).order("createdAt", { ascending: false }).order("id").range(from, to).abortSignal(signal).retry(false)),
        fetchAllPages<VoteReply>((from, to) => supabase.from("vote_replies").select("id,vote_id,author,member_id,body,created_at,votes!inner(songId)", from === 0 ? { count: "exact" } : {}).eq("votes.songId", songId!).order("created_at").order("id").range(from, to).abortSignal(signal).retry(false)),
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
    const changedTables = new Set<string>();
    void getSupabase().then((supabase) => {
      if (cancelled) return;
      const channel = supabase.channel("ohnochoo-db-changes");
      const reload = (table: string) => {
        changedTables.add(table);
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          if ([...changedTables].some((name) => name !== "vote_replies")) void client.invalidateQueries({ queryKey: ["club-data"] });
          if (changedTables.has("votes") || changedTables.has("vote_replies")) void client.invalidateQueries({ queryKey: ["song-discussion"] });
          if (changedTables.has("songs")) void client.invalidateQueries({ queryKey: ["weekly-themes"] });
          changedTables.clear();
        }, 400);
      };
      for (const table of ["songs", "votes", "vote_replies", "mutigoeul_songs", "members"]) {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, () => reload(table));
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
