import { createContext, useContext } from "react";

interface AppUiContextValue { openAddSong: () => void }
export const AppUiContext = createContext<AppUiContextValue | null>(null);

export function useAppUi() {
  const context = useContext(AppUiContext);
  if (!context) throw new Error("AppUiContext가 필요합니다.");
  return context;
}
