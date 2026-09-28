import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import { fetchAllPages } from "../lib/pagination";
import { koreanWeekStart } from "../lib/weeklyTheme";
import type { WeeklyTheme, ThemeSong } from "../types";

export function useWeeklyThemes() {
  const [weekStart, setWeekStart] = useState(() => koreanWeekStart());
  useEffect(() => {
    const update = () => setWeekStart(koreanWeekStart());
    const timer = window.setInterval(update, 30_000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, []);
  const query = useQuery({
    queryKey: ["weekly-themes"],
    queryFn: async () => {
      const supabase = await getSupabase();
      // Keep the optional feature independent of the main song/evaluation query.
      const themes = await fetchAllPages<WeeklyTheme>((from, to) => supabase.from("weekly_themes").select("id,week_start,title,description").order("week_start", { ascending: false }).order("id").range(from, to));
      const songs = await fetchAllPages<ThemeSong>((from, to) => supabase.from("songs").select("id,weekly_theme_id").not("weekly_theme_id", "is", null).order("id").range(from, to));
      return { themes, songs };
    },
    retry: false,
  });
  return { ...query, weekStart, currentTheme: query.data?.themes.find((theme) => theme.week_start === weekStart) ?? null };
}

export function useSaveWeeklyTheme() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { weekStart: string; title: string; description: string }) => {
      const supabase = await getSupabase();
      const result = await supabase.from("weekly_themes").upsert({ week_start: input.weekStart, title: input.title.trim(), description: input.description.trim() }, { onConflict: "week_start" }).select("id").single();
      if (result.error) throw result.error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["weekly-themes"] }),
  });
}
