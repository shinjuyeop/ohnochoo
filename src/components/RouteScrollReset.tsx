import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export function RouteScrollReset() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => { history.scrollRestoration = previous; };
  }, []);
  useLayoutEffect(() => {
    // Song dialogs and filters only change the query string; keep their list position.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}
