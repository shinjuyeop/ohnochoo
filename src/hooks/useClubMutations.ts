import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postJson } from "../lib/api";
import { getSupabase } from "../lib/supabase";
import { normalizeCoverUrl } from "../lib/utils";
import { findMemberVotes, planVoteSave } from "../lib/voteRules";
import type { Decision, Member, PlaylistSong, Song, Vote } from "../types";

type Profile = Pick<Member, "id" | "name">;
type SupabaseErrorLike = { code?: string; message?: string };

function isMissingRpc(error: SupabaseErrorLike | null) {
  return error?.code === "PGRST202" || Boolean(error?.message?.includes("schema cache"));
}

function notifySilently(url: string, body: unknown) {
  void postJson(url, body).catch((error) => console.warn("notification failed", error));
}

export function useClubMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["club-data"] });

  const addSong = useMutation({
    mutationFn: async (input: { title: string; artist: string; reason: string; rating: number; coverImageUrl?: string | null; profile: Profile }) => {
      const supabase = await getSupabase();
      const coverImageUrl = normalizeCoverUrl(input.coverImageUrl);
      const atomic = await supabase.rpc("add_song_with_initial_vote", {
        p_title: input.title,
        p_artist: input.artist,
        p_adder: input.profile.name,
        p_adder_member_id: input.profile.id || null,
        p_cover_image_url: coverImageUrl,
        p_rating: input.rating,
        p_reason: input.reason.trim(),
      });
      if (!atomic.error) {
        const created = (Array.isArray(atomic.data) ? atomic.data[0] : atomic.data) as Song | null;
        if (!created?.id) throw new Error("추가된 노래 정보를 확인하지 못했어요.");
        notifySilently("/api/send-song-added-notification", { songId: created.id, adderName: input.profile.name });
        return created;
      }
      if (!isMissingRpc(atomic.error)) throw atomic.error;

      const { data: song, error: songError } = await supabase
        .from("songs")
        .insert({
          title: input.title,
          artist: input.artist,
          adder: input.profile.name,
          adder_member_id: input.profile.id,
          coverImageUrl,
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
      if (voteError) {
        const cleanup = await supabase.from("songs").delete().eq("id", song.id);
        const cleanupMessage = cleanup.error ? " 추가된 노래를 자동으로 정리하지 못했어요." : " 추가된 노래는 자동으로 정리했어요.";
        throw new Error(`추천 이유 저장에 실패했어요.${cleanupMessage} ${voteError.message}`);
      }
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
      const atomic = await supabase.rpc("save_member_vote", {
        p_song_id: input.song.id,
        p_voter: input.profile.name,
        p_member_id: input.profile.id || null,
        p_decision: input.decision,
        p_rating: input.rating,
        p_reason: payload.reason,
      });
      if (!atomic.error) {
        const saved = (Array.isArray(atomic.data) ? atomic.data[0] : atomic.data) as { vote_id?: string; is_new?: boolean; changed?: boolean } | null;
        if (!saved?.vote_id) throw new Error("저장된 평가 정보를 확인하지 못했어요.");
        if (!saved.changed) return { changed: false, isNew: Boolean(saved.is_new) };
        notifySilently("/api/send-reaction-notification", {
          voteId: saved.vote_id,
          songId: input.song.id,
          voterName: input.profile.name,
          voterMemberId: input.profile.id,
          decision: input.decision,
          notificationKind: saved.is_new ? "new" : "update",
          notificationEventId: saved.is_new ? "" : String(Date.now()),
        });
        return { changed: true, isNew: Boolean(saved.is_new) };
      }
      if (!isMissingRpc(atomic.error)) throw atomic.error;

      let matching = findMemberVotes(input.votes, input.song.id, input.profile);
      if (!matching.length) {
        const existingResult = await supabase
          .from("votes")
          .select("id,songId,voter,member_id,decision,rating,reason,createdAt")
          .eq("songId", input.song.id);
        if (existingResult.error) throw existingResult.error;
        matching = findMemberVotes((existingResult.data ?? []) as Vote[], input.song.id, input.profile);
      }
      const plan = planVoteSave(matching, payload);
      if (plan.action === "unchanged") {
        return { changed: false, isNew: false };
      }

      let voteId = "";
      const isNew = plan.action === "insert";
      if (plan.action === "insert") {
        const result = await supabase.from("votes").insert(payload).select("id").single();
        if (result.error) throw result.error;
        voteId = result.data.id;
      } else {
        const result = await supabase.from("votes").update(payload).eq("id", plan.primary.id).select("id").single();
        if (!result.error) {
          voteId = result.data.id;
          if (plan.duplicateIds.length) {
            const cleanup = await supabase.from("votes").delete().in("id", plan.duplicateIds);
            if (cleanup.error) throw cleanup.error;
          }
        } else {
          const remove = await supabase.from("votes").delete().in("id", plan.matching.map((vote) => vote.id));
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

  const deleteSongs = useMutation({
    mutationFn: async (songIds: string[]) => {
      if (!songIds.length) return 0;
      const supabase = await getSupabase();
      const result = await supabase.from("songs").delete().in("id", songIds).select("id");
      if (result.error) throw result.error;
      if ((result.data?.length ?? 0) !== songIds.length) {
        throw new Error("일부 곡을 삭제하지 못했어요. 관리자 권한을 확인해 주세요.");
      }
      return result.data.length;
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

  return { addSong, saveVote, addMember, deleteSongs, moveToMutigoeul, persistCovers };
}
