import { ArrowRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppUi } from "../app/AppUiContext";
import { useClubData } from "../hooks/useClubData";
import { useWeeklyThemes } from "../hooks/useWeeklyThemes";
import { themeDateRange } from "../lib/weeklyTheme";
import { SongCover } from "./ui/SongCover";

export function WeeklyThemeCard() {
  const themes = useWeeklyThemes();
  const { data } = useClubData();
  const { openAddSong } = useAppUi();
  const theme = themes.currentTheme;
  if (themes.isPending || themes.isError || !theme) return null;
  const ids = new Set(themes.data?.songs.filter((song) => song.weekly_theme_id === theme.id).map((song) => song.id));
  const songs = data?.songs.filter((song) => ids.has(song.id)) ?? [];
  const participants = new Set(songs.map((song) => song.adder_member_id || song.adder)).size;
  return (
    <section className={`weekly-theme-card ${songs.length ? "has-artwork" : ""}`} aria-labelledby="weekly-theme-title">
      <div className="weekly-theme-top"><span><i aria-hidden="true" />이번 주 주제</span><time>{themeDateRange(theme.week_start)}</time></div>
      <div className="weekly-theme-copy"><h2 id="weekly-theme-title">{theme.title}</h2>{theme.description ? <p>{theme.description}</p> : null}</div>
      <div className="weekly-theme-social">
        {songs.length ? <div className="theme-cover-stack" aria-hidden="true">{songs.slice(-3).map((song) => <SongCover key={song.id} song={song} />)}</div> : null}
        <span>{songs.length ? `${participants}명이 고른 ${songs.length}곡` : "이번 주의 첫 곡을 골라주세요"}</span>
      </div>
      <div className="weekly-theme-actions"><button className="primary-button" onClick={() => openAddSong(theme.id)}><Plus size={16} /> 주제로 추천하기</button><Link to={`/onochoo?theme=${theme.id}`}>모아 듣기 <ArrowRight size={15} /></Link></div>
      {songs.length ? <div className="theme-artwork" aria-hidden="true">{songs.slice(-3).reverse().map((song, index) => <SongCover key={song.id} song={song} className={`theme-art-${index}`} />)}</div> : null}
    </section>
  );
}
