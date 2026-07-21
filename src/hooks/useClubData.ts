import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import { buildVoteStats, getMutigoeulSongs, getOnochooSongs } from "../lib/songRules";
import type { ClubData, Member, MutigoeulEntry, Song, Vote, VoteStats } from "../types";

async function fetchClubData(): Promise<ClubData> {
  const supabase = await getSupabase();
  const [songs, votes, members, mutigoeul] = await Promise.all([
    supabase.from("songs").select("id,title,artist,adder,adder_member_id,createdAt,coverImageUrl").order("createdAt", { ascending: true }),
    supabase.from("votes").select("id,songId,voter,member_id,decision,rating,reason,createdAt").order("createdAt", { ascending: false }),
    supabase.from("members").select("*").order("name", { ascending: true }),
    supabase.from("mutigoeul_songs").select("id,songId,createdAt").order("createdAt", { ascending: true }),
  ]);
  const error = songs.error || votes.error || members.error || mutigoeul.error;
  if (error) throw error;
  return {
    songs: (songs.data ?? []) as Song[],
    votes: (votes.data ?? []).map((vote) => ({ ...vote, rating: Number(vote.rating) })) as Vote[],
    members: (members.data ?? []) as Member[],
    mutigoeulEntries: (mutigoeul.data ?? []) as MutigoeulEntry[],
  };
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
        timer = window.setTimeout(() => void client.invalidateQueries({ queryKey: ["club-data"] }), 400);
      };
      for (const table of ["songs", "votes", "mutigoeul_songs", "members"]) {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, reload);
      }
      channel.subscribe();
      cleanup = () => {
        window.clearTimeout(timer);
        void supabase.removeChannel(channel);
      };
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [client]);
  return null;
}
