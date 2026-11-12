import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppNavigation } from "./AppNavigation";
import { Avatar } from "./ui/Avatar";
import { AddSongDialog } from "./AddSongDialog";
import { SongDetailDialog } from "./SongDetailDialog";
import { useSongDialog } from "../hooks/useSongDialog";
import { useProfile } from "../features/profile/ProfileContext";
import { AppUiContext } from "../app/AppUiContext";
import { Plus } from "lucide-react";
import { ReviewSessionProvider } from "../app/ReviewSessionContext";
import { RouteScrollReset } from "./RouteScrollReset";

export function AppShell() {
  const [addOpen, setAddOpen] = useState(false);
  const [addThemeId, setAddThemeId] = useState<string | undefined>();
  const location = useLocation();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { songId, voteId, replyId, backLabel, closeSong } = useSongDialog();
  if (!profile) return null;
  const isSubpage = location.pathname !== "/" || Boolean(songId);
  return (
    <AppUiContext.Provider value={{ openAddSong: (themeId) => { setAddThemeId(themeId); setAddOpen(true); } }}>
      <ReviewSessionProvider key={profile.id}>
      <div className="app-shell">
        <RouteScrollReset />
        <AppNavigation onAdd={() => { setAddThemeId(undefined); setAddOpen(true); }} />
        <div className={`mobile-topbar ${isSubpage ? "mobile-topbar-subpage" : ""}`}>
          <span className="wordmark" aria-hidden={isSubpage ? "true" : undefined}>ohnochoo<span className="brand-period">.</span></span>
          <div className="mobile-topbar-actions"><button className="mobile-add-button glass-control" onClick={() => { setAddThemeId(undefined); setAddOpen(true); }} aria-label="노래 추가"><Plus size={18} /><span>추가</span></button><button className="mobile-profile-button glass-control" onClick={() => navigate("/settings")} aria-label={`${profile.name} 내 정보`}><Avatar name={profile.name} imageUrl={profile.avatar_url} imageVersion={profile.avatar_updated_at} size="sm" /></button></div>
        </div>
        <main className="main-content">
          <div className="page-transition" key={location.pathname} hidden={Boolean(songId)}><Outlet /></div>
          {songId ? <SongDetailDialog songId={songId} open={true} focusVoteId={voteId} focusReplyId={replyId} backLabel={backLabel} onOpenChange={(open) => { if (!open) closeSong(); }} /> : null}
        </main>
        <AddSongDialog key={profile.id} open={addOpen} onOpenChange={setAddOpen} initialThemeId={addThemeId} />
      </div>
      </ReviewSessionProvider>
    </AppUiContext.Provider>
  );
}
