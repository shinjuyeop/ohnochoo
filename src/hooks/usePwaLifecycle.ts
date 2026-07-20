import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function usePwaLifecycle() {
  const queryClient = useQueryClient();
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).catch(() => undefined);
    }
    let reloading = false;
    const checkVersion = async () => {
      try {
        const response = await fetch("/version.json", { cache: "no-store" });
        if (!response.ok) return;
        const { version } = (await response.json()) as { version?: string };
        const current = String(version || "").trim();
        if (!current) return;
        const saved = localStorage.getItem("appVersion");
        if (!saved) localStorage.setItem("appVersion", current);
        else if (saved !== current && !reloading) {
          reloading = true;
          localStorage.setItem("appVersion", current);
          window.location.reload();
        }
      } catch { /* 버전 확인 실패는 앱 사용을 막지 않습니다. */ }
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void checkVersion();
      void queryClient.invalidateQueries({ queryKey: ["club-data"] });
    };
    document.addEventListener("visibilitychange", onVisible);
    void checkVersion();
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [queryClient]);
}
