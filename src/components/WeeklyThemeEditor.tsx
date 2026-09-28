import { useState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { useSaveWeeklyTheme, useWeeklyThemes } from "../hooks/useWeeklyThemes";
import { koreanWeekStart, themeDateRange } from "../lib/weeklyTheme";
import { errorMessage } from "../lib/utils";
import type { WeeklyTheme } from "../types";
import { Dialog } from "./ui/Dialog";
import { useToast } from "./ui/Toast";

function ThemeForm({ theme, weekStart, onSaved }: { theme: WeeklyTheme | null; weekStart: string; onSaved: () => void }) {
  const [title, setTitle] = useState(theme?.title ?? "");
  const [description, setDescription] = useState(theme?.description ?? "");
  const [error, setError] = useState("");
  const save = useSaveWeeklyTheme();
  const toast = useToast();
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (weekStart !== koreanWeekStart()) { setError("새로운 한 주가 시작됐어요. 창을 다시 열어 주세요."); return; }
    setError("");
    try {
      await save.mutateAsync({ title, description, weekStart });
      toast("이번 주 주제를 저장했어요.", "success");
      onSaved();
    } catch (cause) { setError(errorMessage(cause)); }
  };
  return (
    <form className="form-stack" onSubmit={submit}>
      <p className="theme-editor-period">{themeDateRange(weekStart)} · 월요일부터 일요일까지</p>
      <label className="field-label"><span>이번 주 주제</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 밤 산책에 데려갈 노래" maxLength={80} required /></label>
      <label className="field-label"><span>짧은 설명 (선택)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="친구들이 곡을 떠올릴 수 있도록 한마디 남겨주세요." maxLength={280} rows={3} /></label>
      <p className="draft-hint">한국 시간 기준으로 매주 바뀌어요. 주제를 수정해도 이미 연결된 곡은 유지돼요.</p>
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      <button className="primary-button" disabled={save.isPending || !title.trim()}>{save.isPending ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />} 주제 저장하기</button>
    </form>
  );
}

export function WeeklyThemeEditor({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const themes = useWeeklyThemes();
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="이번 주 주제 설정" description="친구들과 함께 고를 음악의 주제를 정해요.">
      <div className="dialog-body">
        {themes.isPending ? <p role="status">주제를 불러오고 있어요...</p> : themes.isError ? <div className="form-stack"><p role="alert">주제를 불러오지 못했어요. 처음 설정한다면 주제 기능의 DB 업데이트를 적용해 주세요.</p><button className="secondary-button" onClick={() => void themes.refetch()}>다시 시도</button></div> : <ThemeForm key={`${open}:${themes.weekStart}:${themes.currentTheme?.id ?? "new"}`} theme={themes.currentTheme} weekStart={themes.weekStart} onSaved={() => onOpenChange(false)} />}
      </div>
    </Dialog>
  );
}
