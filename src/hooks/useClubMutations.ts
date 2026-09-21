import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postJson } from "../lib/api";
import { getSupabase } from "../lib/supabase";
import { normalizeCoverUrl } from "../lib/utils";
import { prepareProfileImage } from "../lib/profileImage";
import { normalizeReplyBody } from "../lib/replyRules";
import type { Decision, Member, PlaylistSong, Song } from "../types";

type Profile = Pick<Member, "id" | "name">;
export function useClubMutations() {
  const queryClient = useQueryClient();
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["club-data"] }),
    queryClient.invalidateQueries({ queryKey: ["song-discussion"] }),
  ]);

  const addSong = useMutation({
    mutationFn: async (input: { title: string; artist: string; reason: string; rating: number; coverImageUrl?: string | null; profile: Profile }) => {
      const result = await postJson<{ song: Song }>("/api/save-activity", {
        kind: "song", title: input.title, artist: input.artist, reason: input.reason.trim(),
        rating: input.rating, coverImageUrl: normalizeCoverUrl(input.coverImageUrl), memberId: input.profile.id,
      });
      return result.song;
    },
    onSuccess: refresh,
  });

  const saveVote = useMutation({
    mutationFn: (input: { song: Song; decision: Decision; rating: number; reason: string; profile: Profile }) =>
      postJson<{ changed: boolean; isNew: boolean }>("/api/save-activity", {
        kind: "vote", songId: input.song.id, decision: input.decision, rating: input.rating,
        reason: input.reason.trim(), memberId: input.profile.id,
      }),
    onSuccess: refresh,
  });

  const addVoteReply = useMutation({
    mutationFn: async (input: { voteId: string; body: string; profile: Profile }) => {
      const result = await postJson<{ replyId: string }>("/api/save-activity", {
        kind: "reply", voteId: input.voteId, body: normalizeReplyBody(input.body), memberId: input.profile.id,
      });
      return result.replyId;
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

  const updateProfileImage = useMutation({
    mutationFn: async (input: { memberId: string; file: File }) => {
      const supabase = await getSupabase();
      const image = await prepareProfileImage(input.file);
      const path = `${input.memberId}/avatar.webp`;
      const uploaded = await supabase.storage.from("profile-images").upload(path, image, {
        cacheControl: "3600",
        contentType: "image/webp",
        upsert: true,
      });
      if (uploaded.error) throw uploaded.error;
      const avatarUrl = supabase.storage.from("profile-images").getPublicUrl(path).data.publicUrl;
      const updatedAt = new Date().toISOString();
      const updated = await supabase
        .from("members")
        .update({ avatar_url: avatarUrl, avatar_updated_at: updatedAt })
        .eq("id", input.memberId)
        .select("id")
        .single();
      if (updated.error) throw updated.error;
      return { avatarUrl, updatedAt };
    },
    onSuccess: refresh,
  });

  const removeProfileImage = useMutation({
    mutationFn: async (memberId: string) => {
      const supabase = await getSupabase();
      const removed = await supabase.storage.from("profile-images").remove([`${memberId}/avatar.webp`]);
      if (removed.error) throw removed.error;
      const updated = await supabase
        .from("members")
        .update({ avatar_url: null, avatar_updated_at: new Date().toISOString() })
        .eq("id", memberId)
        .select("id")
        .single();
      if (updated.error) throw updated.error;
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

  const updateSong = useMutation({
    mutationFn: async (input: { songId: string; title: string; artist: string; adder: Profile; createdAt: string }) => {
      const supabase = await getSupabase();
      const result = await supabase
        .from("songs")
        .update({
          title: input.title.trim(),
          artist: input.artist.trim(),
          adder: input.adder.name,
          adder_member_id: input.adder.id,
          createdAt: input.createdAt,
        })
        .eq("id", input.songId)
        .select("id")
        .single();
      if (result.error) throw result.error;
      if (!result.data?.id) throw new Error("곡 정보를 수정하지 못했어요. 관리자 권한을 확인해 주세요.");
      return result.data.id;
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

  return { addSong, saveVote, addVoteReply, addMember, updateProfileImage, removeProfileImage, deleteSongs, updateSong, moveToMutigoeul, persistCovers };
}
