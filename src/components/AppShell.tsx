import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppNavigation } from "./AppNavigation";
import { Avatar } from "./ui/Avatar";
import { AddSongDialog } from "./AddSongDialog";
import { SongDetailDialog } from "./SongDetailDialog";
import { useSongDialog } from "../hooks/useSongDialog";
import { useProfile } from "../features/profile/ProfileContext";
import { AppUiContext } from "../app/AppUiContext";

export function AppShell() {
  const [addOpen, setAddOpen] = useState(false);
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { songId, voteId, replyId, closeSong } = useSongDialog();
  if (!profile) return null;
  return (
    <AppUiContext.Provider value={{ openAddSong: () => setAddOpen(true) }}>
      <div className="app-shell">
        <AppNavigation onAdd={() => setAddOpen(true)} />
        <div className="mobile-topbar">
          <span className="wordmark">ohnochoo</span>
          <button onClick={() => navigate("/settings")} aria-label={`${profile.name} 내 정보`}><Avatar name={profile.name} imageUrl={profile.avatar_url} imageVersion={profile.avatar_updated_at} size="sm" /></button>
        </div>
        <main className="main-content"><Outlet /></main>
        <AddSongDialog key={profile.id} open={addOpen} onOpenChange={setAddOpen} />
        <SongDetailDialog songId={songId} focusVoteId={voteId} focusReplyId={replyId} onOpenChange={(open) => { if (!open) closeSong(); }} />
      </div>
    </AppUiContext.Provider>
  );
}
