import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function usePwaLifecycle() {
  const queryClient = useQueryClient();
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).catch(() => undefined);
    }
    let activeVersion: string | null = null;
    let cancelled = false;
    const checkVersion = async () => {
      try {
        const response = await fetch("/version.json", { cache: "no-store" });
        if (!response.ok) return;
        const { version } = (await response.json()) as { version?: string };
        const current = String(version || "").trim();
        if (!current || cancelled) return;
        activeVersion ??= current;
        setAvailableVersion(activeVersion === current ? null : current);
      } catch { /* 버전 확인 실패는 앱 사용을 막지 않습니다. */ }
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void checkVersion();
      void queryClient.invalidateQueries({ queryKey: ["club-data"] });
      void queryClient.invalidateQueries({ queryKey: ["song-discussion"] });
    };
    document.addEventListener("visibilitychange", onVisible);
    void checkVersion();
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVisible); };
  }, [queryClient]);
  return { updateAvailable: Boolean(availableVersion), applyUpdate: () => window.location.reload() };
}
