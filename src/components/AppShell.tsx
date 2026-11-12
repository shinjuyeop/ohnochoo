import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppNavigation } from "./AppNavigation";
import { AddSongDialog } from "./AddSongDialog";
import { SongDetailDialog } from "./SongDetailDialog";
import { preloadSongCovers } from "./ui/SongCover";
import { useClubData } from "../hooks/useClubData";
import { useSongDialog } from "../hooks/useSongDialog";
import { useProfile } from "../features/profile/ProfileContext";
import { AppUiContext } from "../app/AppUiContext";
import { ReviewSessionProvider } from "../app/ReviewSessionContext";
import { RouteScrollReset } from "./RouteScrollReset";

export function AppShell() {
  const [addOpen, setAddOpen] = useState(false);
  const [addThemeId, setAddThemeId] = useState<string | undefined>();
  const location = useLocation();
  const { profile } = useProfile();
  const { data } = useClubData();
  const { songId, voteId, replyId, backLabel, closeSong } = useSongDialog();
  useEffect(() => {
    if (!data?.songs.length) return;
    preloadSongCovers([...data.songs].reverse(), "52px");
  }, [data?.songs]);
  if (!profile) return null;
  return (
    <AppUiContext.Provider value={{ openAddSong: (themeId) => { setAddThemeId(themeId); setAddOpen(true); } }}>
      <ReviewSessionProvider key={profile.id}>
      <div className="app-shell">
        <RouteScrollReset />
        <AppNavigation onAdd={() => { setAddThemeId(undefined); setAddOpen(true); }} />
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
