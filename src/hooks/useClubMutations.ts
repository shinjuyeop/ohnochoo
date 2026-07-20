import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postJson } from "../lib/api";
import { getSupabase } from "../lib/supabase";
import { getSongKey, normalizeCoverUrl } from "../lib/utils";
import { isVoteByMember } from "../lib/songRules";
import type { ClubData, Decision, Member, PlaylistSong, Song, Vote } from "../types";

type Profile = Pick<Member, "id" | "name">;

function notifySilently(url: string, body: unknown) {
  void postJson(url, body).catch((error) => console.warn("notification failed", error));
}

export function useClubMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["club-data"] });

  const addSong = useMutation({
    mutationFn: async (input: { title: string; artist: string; reason: string; rating: number; coverImageUrl?: string | null; profile: Profile }) => {
      const supabase = await getSupabase();
      const { data: song, error: songError } = await supabase
        .from("songs")
        .insert({
          title: input.title,
          artist: input.artist,
          adder: input.profile.name,
          adder_member_id: input.profile.id,
          coverImageUrl: normalizeCoverUrl(input.coverImageUrl),
        })
        .select("id,title,artist,adder,adder_member_id,createdAt,coverImageUrl")
        .single();
      if (songError) throw songError;
      const { error: voteError } = await supabase.from("votes").insert({
        songId: song.id,
        voter: input.profile.name,
        member_id: input.profile.id,
        decision: "승격",
        rating: input.rating,
        reason: input.reason,
      });
      if (voteError) throw new Error(`노래는 추가됐지만 추천 이유 저장에 실패했어요: ${voteError.message}`);
      notifySilently("/api/send-song-added-notification", { songId: song.id, adderName: input.profile.name });
      return song as Song;
    },
    onSuccess: refresh,
  });

  const saveVote = useMutation({
    mutationFn: async (input: { song: Song; decision: Decision; rating: number; reason: string; profile: Profile; votes: Vote[] }) => {
      const supabase = await getSupabase();
      const payload = {
        songId: input.song.id,
        voter: input.profile.name,
        member_id: input.profile.id,
        decision: input.decision,
        rating: input.rating,
        reason: input.reason.trim(),
      };
      let matching = input.votes.filter((vote) => vote.songId === input.song.id && isVoteByMember(vote, input.profile));
      if (!matching.length) {
        const existingResult = await supabase
          .from("votes")
          .select("id,songId,voter,member_id,decision,rating,reason,createdAt")
          .eq("songId", input.song.id);
        if (existingResult.error) throw existingResult.error;
        matching = ((existingResult.data ?? []) as Vote[]).filter((vote) => isVoteByMember(vote, input.profile));
      }
      const existing = matching[0];
      if (existing && existing.decision === payload.decision && Number(existing.rating) === payload.rating && existing.reason.trim() === payload.reason) {
        return { changed: false, isNew: false };
      }

      let voteId = "";
      const isNew = matching.length === 0;
      if (isNew) {
        const result = await supabase.from("votes").insert(payload).select("id").single();
        if (result.error) throw result.error;
        voteId = result.data.id;
      } else {
        const [primary, ...duplicates] = matching;
        const result = await supabase.from("votes").update(payload).eq("id", primary.id).select("id").single();
        if (!result.error) {
          voteId = result.data.id;
          if (duplicates.length) {
            const cleanup = await supabase.from("votes").delete().in("id", duplicates.map((vote) => vote.id));
            if (cleanup.error) throw cleanup.error;
          }
        } else {
          const remove = await supabase.from("votes").delete().in("id", matching.map((vote) => vote.id));
          if (remove.error) throw result.error;
          const insert = await supabase.from("votes").insert(payload).select("id").single();
          if (insert.error) throw insert.error;
          voteId = insert.data.id;
        }
      }
      notifySilently("/api/send-reaction-notification", {
        voteId,
        songId: input.song.id,
        voterName: input.profile.name,
        voterMemberId: input.profile.id,
        decision: input.decision,
        notificationKind: isNew ? "new" : "update",
        notificationEventId: isNew ? "" : String(Date.now()),
      });
      return { changed: true, isNew };
    },
    onSuccess: refresh,
  });

  const addMember = useMutation({
    mutationFn: async (name: string) => {
      const supabase = await getSupabase();
      const result = await supabase.from("members").insert({ name: name.trim() });
      if (result.error) throw result.error;
    },
    onSuccess: refresh,
  });

  const deleteSong = useMutation({
    mutationFn: async (songId: string) => {
      const supabase = await getSupabase();
      const result = await supabase.from("songs").delete().eq("id", songId);
      if (result.error) throw result.error;
    },
    onSuccess: refresh,
  });

  const moveToMutigoeul = useMutation({
    mutationFn: async (songId: string) => {
      const supabase = await getSupabase();
      const result = await supabase.from("mutigoeul_songs").insert({ songId });
      if (result.error) throw result.error;
    },
    onSuccess: refresh,
  });

  const persistCovers = useMutation({
    mutationFn: async (songs: PlaylistSong[]) => {
      const payload = songs
        .map((song) => ({ ...song, coverImageUrl: normalizeCoverUrl(song.coverImageUrl) }))
        .filter((song) => song.title && song.artist && song.coverImageUrl);
      if (!payload.length) return 0;
      const result = await postJson<{ updated?: number }>("/api/update-song-covers", { songs: payload });
      return Number(result.updated || 0);
    },
    onSuccess: refresh,
  });

  return { addSong, saveVote, addMember, deleteSong, moveToMutigoeul, persistCovers, getSongKey };
}
