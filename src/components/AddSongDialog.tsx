import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CloudDownload, LoaderCircle, PencilLine, Plus } from "lucide-react";
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
import { clearDraft, draftKey, readDraft, writeDraft } from "../lib/drafts";

const schema = z.object({
  title: z.string().trim().min(1, "곡명을 입력해 주세요."),
  artist: z.string().trim().min(1, "아티스트를 입력해 주세요."),
  reason: z.string().trim().min(1, "추천 이유를 들려주세요."),
  rating: z.number().min(0).max(5),
  coverImageUrl: z.string().nullable().optional(),
  albumUrl: z.string().nullable().optional(),
  albumName: z.string().nullable().optional(),
  weeklyThemeId: z.string().nullable().optional(),
});
type SongForm = z.infer<typeof schema>;
const draftSchema = schema.extend({ title: z.string(), artist: z.string(), reason: z.string() });
const emptyForm: SongForm = { title: "", artist: "", reason: "", rating: 5, coverImageUrl: null, albumUrl: null, albumName: null, weeklyThemeId: null };

export function AddSongDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void; initialThemeId?: string }) {
  const { data } = useClubData();
  const { profile } = useProfile();
  const storageKey = draftKey(profile?.id || "", "add-song");
  const [restored, setRestored] = useState(() => readDraft(storageKey, draftSchema));
  const { addSong, persistCovers } = useClubMutations();
  const toast = useToast();
  const [mode, setMode] = useState<"start" | "sync" | "manual">(restored ? "manual" : "start");
  const syncRequest = useRef(0);
  const [syncing, setSyncing] = useState(false);
  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [selectedIndex, setSelectedIndex] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<SongForm>({
    resolver: zodResolver(schema),
    defaultValues: restored ? { ...restored, weeklyThemeId: null } : emptyForm,
  });
  const rating = watch("rating");
  const title = watch("title");
  const artist = watch("artist");
  const coverImageUrl = watch("coverImageUrl");
  const selectedSong = selectedIndex === "" ? null : songs[Number(selectedIndex)];
  const previewSong = useMemo(() => ({ title: title || "새로운 음악", coverImageUrl: coverImageUrl || null }), [coverImageUrl, title]);

  useEffect(() => {
    if (!open) { syncRequest.current += 1; setSyncing(false); }
    return () => { syncRequest.current += 1; };
  }, [open]);
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (!name) return;
      if (value.title || value.artist || value.reason || value.weeklyThemeId) writeDraft(storageKey, value);
      else clearDraft(storageKey);
    });
    return () => subscription.unsubscribe();
  }, [watch, storageKey]);

  const syncAppleMusic = async () => {
    const request = ++syncRequest.current;
    setSyncing(true); setSyncMessage("Apple Music에서 플레이리스트를 확인하고 있어요...");
    try {
      const [onochu, mutigoeul] = await Promise.all([fetchPlaylist(ONOCHU_APPLE_MUSIC_URL), fetchPlaylist(MUTIGOEUL_APPLE_MUSIC_URL)]);
      if (request !== syncRequest.current) return;
      const updated = await persistCovers.mutateAsync([...onochu, ...mutigoeul]).catch(() => 0);
      if (request !== syncRequest.current) return;
      const existing = new Set((data?.songs ?? []).map((song) => getSongKey(song.title, song.artist)));
      const candidates = onochu
        .filter((song) => !existing.has(getSongKey(song.title, song.artist)))
        .map((song) => ({ ...song, coverImageUrl: normalizeCoverUrl(song.coverImageUrl) }));
      setSongs(candidates); setSelectedIndex(""); setMode("sync");
      setSyncMessage(candidates.length ? `아직 추가하지 않은 ${candidates.length}곡을 찾았어요.${updated ? ` ${updated}곡의 커버·앨범 정보도 보완했어요.` : ""}` : "새로 추가할 곡이 없어요.");
    } catch (error) {
      if (request !== syncRequest.current) return;
      setMode("manual");
      setSyncMessage(`동기화하지 못했어요: ${errorMessage(error)}`);
    } finally { if (request === syncRequest.current) setSyncing(false); }
  };

  const chooseSong = (index: string) => {
    setSelectedIndex(index);
    if (index === "") return;
    const song = songs[Number(index)];
    setValue("title", song.title, { shouldValidate: true });
    setValue("artist", song.artist, { shouldValidate: true });
    setValue("coverImageUrl", song.coverImageUrl || null);
    setValue("albumUrl", song.albumUrl || null);
    setValue("albumName", song.albumName || null);
  };

  const clearLinkedMetadata = () => { setValue("coverImageUrl", null); setValue("albumUrl", null); setValue("albumName", null); };

  const switchManual = () => {
    syncRequest.current += 1; setSyncing(false); setSyncMessage("");
    setMode("manual"); setSelectedIndex(""); clearLinkedMetadata();
  };

  const submit = async (values: SongForm) => {
    if (!profile) return;
    const duplicate = data?.songs.find((song) => getSongKey(song.title, song.artist) === getSongKey(values.title, values.artist));
    if (duplicate) { toast(duplicate.archived_at ? "이미 보관된 곡이에요. 홈의 방출에서 찾아보세요." : "이미 추가된 곡이에요. 오노추나 무티고을에서 찾아보세요.", "error"); return; }
    try {
      await addSong.mutateAsync({ ...values, weeklyThemeId: null, profile });
      reset(emptyForm); clearDraft(storageKey); setRestored(null);
      setMode("start"); setSongs([]); setSelectedIndex(""); setSyncMessage("");
      toast("새 노래와 첫 승격 평가를 저장했어요.", "success");
      onOpenChange(false);
    } catch (error) { toast(errorMessage(error), "error"); }
  };

  const showForm = mode === "manual" || Boolean(selectedSong);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="노래 추가" className="add-dialog">
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
            {restored ? <p className="draft-hint">작성하던 추천을 불러왔어요.</p> : null}
            <div className="selected-song-preview"><SongCover song={previewSong} /><div><b>{title || "곡명"}</b><small>{artist || "아티스트"}</small></div></div>
            <div className="two-fields">
              <label className="field-label"><span>곡명</span><input {...register("title", { onChange: clearLinkedMetadata })} readOnly={Boolean(selectedSong)} placeholder="예: NEW DROP" />{errors.title ? <em>{errors.title.message}</em> : null}</label>
              <label className="field-label"><span>아티스트</span><input {...register("artist", { onChange: clearLinkedMetadata })} readOnly={Boolean(selectedSong)} placeholder="예: Don Toliver" />{errors.artist ? <em>{errors.artist.message}</em> : null}</label>
            </div>
            <label className="field-label"><span>별점</span><StarRating value={rating} onChange={(value) => setValue("rating", value, { shouldDirty: true })} /></label>
            <label className="field-label"><span>추천 이유</span><textarea {...register("reason")} rows={3} placeholder="추천 이유를 입력하세요" />{errors.reason ? <em>{errors.reason.message}</em> : null}</label>
            <button className="primary-button submit-button" disabled={addSong.isPending}>{addSong.isPending ? <><LoaderCircle className="spin" /> 저장 중...</> : <><Plus size={18} /> 추가하기</>}</button>
          </form>
        ) : null}
      </div>
    </Dialog>
  );
}
