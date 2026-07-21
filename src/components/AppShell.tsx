import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppNavigation } from "./AppNavigation";
import { Avatar } from "./ui/Avatar";
import { AddSongDialog } from "./AddSongDialog";
import { useProfile } from "../features/profile/ProfileContext";
import { AppUiContext } from "../app/AppUiContext";

export function AppShell() {
  const [addOpen, setAddOpen] = useState(false);
  const { profile } = useProfile();
  const navigate = useNavigate();
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
        <AddSongDialog open={addOpen} onOpenChange={setAddOpen} />
      </div>
    </AppUiContext.Provider>
  );
}
