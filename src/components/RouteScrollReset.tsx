import { useLayoutEffect, useRef } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

export function RouteScrollReset() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const songId = params.get("song");
  const listScrollByPath = useRef<Map<string, number>>(new Map());
  const prevPathname = useRef(pathname);
  const prevSongId = useRef<string | null>(songId);

  useLayoutEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => { history.scrollRestoration = previous; };
  }, []);

  useLayoutEffect(() => {
    const pathnameChanged = prevPathname.current !== pathname;
    const songChanged = prevSongId.current !== songId;
    prevPathname.current = pathname;
    prevSongId.current = songId;

    if (pathnameChanged) {
      if (!songId) listScrollByPath.current.set(pathname, 0);
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } else if (songChanged) {
      if (songId) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      } else {
        const savedTop = listScrollByPath.current.get(pathname) ?? 0;
        window.scrollTo({ top: savedTop, left: 0, behavior: "instant" });
      }
    }

    if (songId) return;
    const recordScroll = () => {
      listScrollByPath.current.set(pathname, window.scrollY);
    };
    recordScroll();
    window.addEventListener("scroll", recordScroll, { passive: true });
    window.addEventListener("pointerdown", recordScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", recordScroll);
      window.removeEventListener("pointerdown", recordScroll, { capture: true });
    };
  }, [pathname, songId]);

  return null;
}
