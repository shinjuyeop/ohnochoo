import { useEffect, useRef, useState } from "react";
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
  const topbarRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const isHomeView = location.pathname === "/" && !songId;

  useEffect(() => {
    const topbar = topbarRef.current;
    const main = mainContentRef.current;
    if (!isHomeView || !topbar || !main) {
      if (main) {
        main.style.transition = "";
        main.style.transform = "";
      }
      return;
    }

    let startX = 0;
    let startY = 0;
    let pulling = false;

    const syncTopOverscroll = () => {
      const y = window.scrollY;
      if (y < 0) {
        topbar.style.transform = `translate3d(0, ${y}px, 0)`;
      } else if (topbar.style.transform) {
        topbar.style.transform = "";
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      if (window.scrollY > 0 || event.touches.length !== 1) {
        pulling = false;
        return;
      }
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      pulling = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pulling || event.touches.length !== 1) return;
      if (window.scrollY < 0) {
        main.style.transition = "";
        main.style.transform = "";
        syncTopOverscroll();
        return;
      }
      if (window.scrollY > 0) {
        pulling = false;
        main.style.transition = "";
        main.style.transform = "";
        return;
      }
      const deltaY = event.touches[0].clientY - startY;
      const deltaX = Math.abs(event.touches[0].clientX - startX);
      if (deltaY > 0 && deltaY > deltaX) {
        const pull = Math.min(84, Math.pow(deltaY, 0.85) * 0.65);
        main.style.transition = "none";
        main.style.transform = `translate3d(0, ${pull}px, 0)`;
      } else if (main.style.transform) {
        main.style.transition = "";
        main.style.transform = "";
      }
    };

    const onTouchEnd = () => {
      pulling = false;
      if (main.style.transform) {
        main.style.transition = "transform 280ms var(--motion-ease)";
        main.style.transform = "";
      }
    };

    syncTopOverscroll();
    window.addEventListener("scroll", syncTopOverscroll, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("scroll", syncTopOverscroll);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      topbar.style.transform = "";
      main.style.transition = "";
      main.style.transform = "";
    };
  }, [isHomeView]);

  if (!profile) return null;
  return (
    <AppUiContext.Provider value={{ openAddSong: (themeId) => { setAddThemeId(themeId); setAddOpen(true); } }}>
      <ReviewSessionProvider key={profile.id}>
      <div className="app-shell">
        <RouteScrollReset />
        <AppNavigation onAdd={() => { setAddThemeId(undefined); setAddOpen(true); }} />
        {isHomeView ? (
          <div className="mobile-topbar" ref={topbarRef}>
            <span className="wordmark">ohnochoo<span className="brand-period">.</span></span>
            <div className="mobile-topbar-actions"><button className="mobile-add-button glass-control" onClick={() => { setAddThemeId(undefined); setAddOpen(true); }} aria-label="노래 추가"><Plus size={18} /><span>추가</span></button><button className="mobile-profile-button glass-control" onClick={() => navigate("/settings")} aria-label={`${profile.name} 내 정보`}><Avatar name={profile.name} imageUrl={profile.avatar_url} imageVersion={profile.avatar_updated_at} size="sm" /></button></div>
          </div>
        ) : null}
        <main className="main-content" ref={mainContentRef}>
          <div className="page-transition" key={location.pathname} hidden={Boolean(songId)}><Outlet /></div>
          {songId ? <SongDetailDialog songId={songId} open={true} focusVoteId={voteId} focusReplyId={replyId} backLabel={backLabel} onOpenChange={(open) => { if (!open) closeSong(); }} /> : null}
        </main>
        <AddSongDialog key={profile.id} open={addOpen} onOpenChange={setAddOpen} initialThemeId={addThemeId} />
      </div>
      </ReviewSessionProvider>
    </AppUiContext.Provider>
  );
}
