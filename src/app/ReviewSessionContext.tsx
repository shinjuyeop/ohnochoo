import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useClubData } from "../hooks/useClubData";
import { useProfile } from "../features/profile/ProfileContext";
import { useSongDialog } from "../hooks/useSongDialog";
import { isVoteByMember, sortByDecisionDate } from "../lib/songRules";
import { readReviewSession, reviewProgress, type ReviewSession } from "../lib/reviewSession";

interface ReviewContextValue {
  session: ReviewSession | null;
  progress: ReturnType<typeof reviewProgress>;
  start: () => void;
  saved: (songId: string, isNew: boolean) => void;
  finish: () => void;
}
const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewSessionProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile();
  const { data, onochuSongs } = useClubData();
  const { openSong } = useSongDialog();
  const key = `ohnochoo:review-session:v1:${profile!.id}`;
  const [session, setSession] = useState(() => readReviewSession(key));
  const votedIds = new Set(data?.votes.filter((vote) => isVoteByMember(vote, profile!)).map((vote) => vote.songId));
  const pendingIds = sortByDecisionDate(onochuSongs.filter((song) => !votedIds.has(song.id))).map((song) => song.id);
  const progress = reviewProgress(session, pendingIds);
  useEffect(() => {
    try { if (session) sessionStorage.setItem(key, JSON.stringify(session)); else sessionStorage.removeItem(key); }
    catch { /* Reviewing still works when browser storage is unavailable. */ }
  }, [key, session]);
  const start = () => {
    if (progress.remaining.length) { openSong(progress.remaining[0]); return; }
    if (!pendingIds.length) return;
    setSession({ ids: pendingIds, completed: [], startedAt: Date.now() });
    openSong(pendingIds[0]);
  };
  const saved = (songId: string, isNew: boolean) => {
    if (!isNew) return;
    setSession((current) => {
      if (current?.ids.includes(songId)) return { ...current, completed: [...new Set([...current.completed, songId])] };
      // A single-song review can start a queue after its first successful save.
      if (current && reviewProgress(current, pendingIds).remaining.length) return current;
      return { ids: [songId, ...pendingIds.filter((id) => id !== songId)], completed: [songId], startedAt: Date.now() };
    });
  };
  return <ReviewContext.Provider value={{ session, progress, start, saved, finish: () => setSession(null) }}>{children}</ReviewContext.Provider>;
}

export function useReviewSession() {
  const context = useContext(ReviewContext);
  if (!context) throw new Error("ReviewSessionProvider가 필요합니다.");
  return context;
}
