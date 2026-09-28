import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";

type ThemePreference = "system" | "light" | "dark";
const storageKey = "ohnochoo:theme";
const systemQuery = "(prefers-color-scheme: dark)";
const normalize = (value: string | null): ThemePreference => value === "light" || value === "dark" ? value : "system";

function readPreference() {
  try { return normalize(localStorage.getItem(storageKey)); }
  catch { return "system" as const; }
}

const ThemeContext = createContext<{
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(systemQuery).matches);
  const theme = preference === "system" ? (systemDark ? "dark" : "light") : preference;

  useEffect(() => {
    const media = window.matchMedia(systemQuery);
    const syncSystem = () => setSystemDark(media.matches);
    const syncStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === storageKey || event.key === null)) setPreferenceState(readPreference());
    };
    syncSystem();
    media.addEventListener("change", syncSystem);
    document.addEventListener("visibilitychange", syncSystem);
    window.addEventListener("storage", syncStorage);
    return () => {
      media.removeEventListener("change", syncSystem);
      document.removeEventListener("visibilitychange", syncSystem);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#141414" : "#fafafa");
  }, [theme]);

  const setPreference = (value: ThemePreference) => {
    setPreferenceState(value);
    try { localStorage.setItem(storageKey, value); }
    catch { /* The choice still works for this visit when storage is unavailable. */ }
  };

  return <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("ThemeProvider is required");
  return theme;
}
