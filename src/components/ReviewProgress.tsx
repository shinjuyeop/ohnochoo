import { ArrowRight, Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { useReviewSession } from "../app/ReviewSessionContext";
import { useSongDialog } from "../hooks/useSongDialog";

export function ReviewProgress({ songId }: { songId: string }) {
  const { session, progress, finish } = useReviewSession();
  const { openSong, closeSong } = useSongDialog();
  const region = useRef<HTMLElement>(null);
  const wasSaved = useRef(session?.completed.includes(songId) ?? false);
  const justSaved = session?.completed.includes(songId) ?? false;
  useEffect(() => {
    if (justSaved && !wasSaved.current) region.current?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    wasSaved.current = justSaved;
  }, [justSaved, songId]);
  if (!session?.ids.includes(songId)) return null;
  const saved = session.completed.includes(songId);
  const nextId = progress.remaining.find((id) => id !== songId);
  const currentPending = progress.remaining.includes(songId);
  return (
    <section className="review-progress" aria-label="연속 평가" ref={region}>
      <div className="review-progress-heading" role="status"><span>{saved ? <><Check size={16} /> 저장 완료</> : "연속 평가"}</span><b>이번에 {progress.completed}/{progress.total}곡 완료</b></div>
      <div className="review-progress-track" role="progressbar" aria-label="이번 평가 진행률" aria-valuenow={progress.completed} aria-valuemin={0} aria-valuemax={progress.total}><span style={{ width: `${progress.completed / progress.total * 100}%` }} /></div>
      {progress.skipped > 0 ? <small>다른 곳에서 평가했거나 평가가 종료된 {progress.skipped}곡은 건너뛰었어요.</small> : null}
      {!currentPending ? nextId ? <button className="primary-button" onClick={() => openSong(nextId, true)}>다음 미평가 곡 <ArrowRight size={16} /></button> : <button className="secondary-button" onClick={() => { finish(); closeSong(); }}>목록으로 돌아가기</button> : null}
    </section>
  );
}
