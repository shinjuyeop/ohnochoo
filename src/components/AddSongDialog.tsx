import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CloudDownload, LoaderCircle, Music2, PencilLine, Sparkles } from "lucide-react";
import { z } from "zod";
import { Dialog } from "./ui/Dialog";
import { StarRating } from "./ui/StarRating";
import { SongCover } from "./ui/SongCover";
import { useClubData } from "../hooks/useClubData";
import { useClubMutations } from "../hooks/useClubMutations";
import { useProfile } from "../features/profile/ProfileContext";
import { fetchPlaylist } from "../lib/api";
import { MUTIGOEUL_APPLE_MUSIC_URL, ONOCHU_APPLE_MUSIC_URL } from "../lib/constants";
import { errorMessage, getSongKey, normalizeCoverUrl } from "../lib/utils";
import { useToast } from "./ui/Toast";
import type { PlaylistSong } from "../types";

const schema = z.object({
  title: z.string().trim().min(1, "곡명을 입력해 주세요."),
  artist: z.string().trim().min(1, "아티스트를 입력해 주세요."),
  reason: z.string().trim().min(1, "추천 이유를 들려주세요."),
  rating: z.number().min(0).max(5),
});
type SongForm = z.infer<typeof schema>;

export function AddSongDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data } = useClubData();
  const { profile } = useProfile();
  const { addSong, persistCovers } = useClubMutations();
  const toast = useToast();
  const [mode, setMode] = useState<"start" | "sync" | "manual">("start");
  const [syncing, setSyncing] = useState(false);
  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [selectedIndex, setSelectedIndex] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<SongForm>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", artist: "", reason: "", rating: 5 },
  });
  const rating = watch("rating");
  const title = watch("title");
  const artist = watch("artist");
  const selectedSong = selectedIndex === "" ? null : songs[Number(selectedIndex)];
  const previewSong = useMemo(() => ({ title: title || "새로운 음악", coverImageUrl: selectedSong?.coverImageUrl || null }), [selectedSong, title]);

  useEffect(() => {
    if (!open) {
      window.setTimeout(() => { setMode("start"); setSongs([]); setSelectedIndex(""); setSyncMessage(""); reset(); }, 180);
    }
  }, [open, reset]);

  const syncAppleMusic = async () => {
    setSyncing(true); setSyncMessage("Apple Music에서 플레이리스트를 확인하고 있어요...");
    try {
      const [onochu, mutigoeul] = await Promise.all([fetchPlaylist(ONOCHU_APPLE_MUSIC_URL), fetchPlaylist(MUTIGOEUL_APPLE_MUSIC_URL)]);
      const updated = await persistCovers.mutateAsync([...onochu, ...mutigoeul]);
      const existing = new Set((data?.songs ?? []).map((song) => getSongKey(song.title, song.artist)));
      const candidates = onochu
        .filter((song) => !existing.has(getSongKey(song.title, song.artist)))
        .map((song) => ({ ...song, coverImageUrl: normalizeCoverUrl(song.coverImageUrl) }));
      setSongs(candidates); setMode("sync");
      setSyncMessage(candidates.length ? `아직 추가하지 않은 ${candidates.length}곡을 찾았어요.${updated ? ` 커버 ${updated}개도 새로 맞췄어요.` : ""}` : "새로 추가할 곡이 없어요.");
    } catch (error) {
      setMode("manual");
      setSyncMessage(`동기화하지 못했어요: ${errorMessage(error)}`);
    } finally { setSyncing(false); }
  };

  const chooseSong = (index: string) => {
    setSelectedIndex(index);
    if (index === "") return;
    const song = songs[Number(index)];
    setValue("title", song.title, { shouldValidate: true });
    setValue("artist", song.artist, { shouldValidate: true });
  };

  const switchManual = () => {
    setMode("manual"); setSelectedIndex(""); setValue("title", ""); setValue("artist", "");
  };

  const submit = async (values: SongForm) => {
    if (!profile) return;
    const coverMatches = selectedSong && getSongKey(selectedSong.title, selectedSong.artist) === getSongKey(values.title, values.artist);
    try {
      await addSong.mutateAsync({ ...values, coverImageUrl: coverMatches ? selectedSong.coverImageUrl : null, profile });
      toast("새 노래와 첫 승격 평가를 저장했어요.", "success");
      onOpenChange(false);
    } catch (error) { toast(errorMessage(error), "error"); }
  };

  const showForm = mode === "manual" || Boolean(selectedSong);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="노래 추가" description="플레이리스트에서 고르거나 직접 입력해 보세요." className="add-dialog">
      <div className="dialog-body add-flow">
        <div className="source-actions">
          <button className="source-card source-primary" onClick={syncAppleMusic} disabled={syncing}>
            {syncing ? <LoaderCircle className="spin" /> : <CloudDownload />}<span><b>Apple Music 동기화</b><small>플레이리스트의 새 곡 불러오기</small></span>
          </button>
          <button className="source-card" onClick={switchManual}><PencilLine /><span><b>직접 입력</b><small>곡명과 아티스트 입력하기</small></span></button>
        </div>
        {syncMessage ? <p className="sync-message">{syncMessage}</p> : null}
        {mode === "sync" && songs.length ? (
          <label className="field-label"><span>추가할 곡</span><select value={selectedIndex} onChange={(event) => chooseSong(event.target.value)}><option value="">곡을 선택해 주세요</option>{songs.map((song, index) => <option key={getSongKey(song.title, song.artist)} value={index}>{song.title} — {song.artist}</option>)}</select></label>
        ) : null}
        {showForm ? (
          <form className="form-stack song-add-form" onSubmit={handleSubmit(submit)}>
            <div className="selected-song-preview"><SongCover song={previewSong} /><div><span className="eyebrow">NEW PICK</span><b>{title || "곡 정보를 입력해 주세요"}</b><small>{artist || "아티스트"}</small></div></div>
            <div className="two-fields">
              <label className="field-label"><span>곡명</span><input {...register("title")} disabled={Boolean(selectedSong)} placeholder="예: NEW DROP" />{errors.title ? <em>{errors.title.message}</em> : null}</label>
              <label className="field-label"><span>아티스트</span><input {...register("artist")} disabled={Boolean(selectedSong)} placeholder="예: Don Toliver" />{errors.artist ? <em>{errors.artist.message}</em> : null}</label>
            </div>
            <label className="field-label"><span>별점</span><StarRating value={rating} onChange={(value) => setValue("rating", value, { shouldDirty: true })} /></label>
            <label className="field-label"><span>왜 이 곡을 추천하나요?</span><textarea {...register("reason")} rows={4} placeholder="친구들이 궁금해할 추천 포인트를 적어주세요." />{errors.reason ? <em>{errors.reason.message}</em> : null}</label>
            <button className="primary-button submit-button" disabled={addSong.isPending}>{addSong.isPending ? <><LoaderCircle className="spin" /> 저장 중...</> : <><Sparkles size={18} /> 추가하기</>}</button>
          </form>
        ) : mode === "start" ? <div className="add-empty"><Music2 /><p>Apple Music을 동기화하면<br />새 곡을 빠르게 고를 수 있어요.</p></div> : null}
      </div>
    </Dialog>
  );
}
