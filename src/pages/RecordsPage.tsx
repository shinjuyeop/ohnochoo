import { Archive, ArrowLeft, ChevronRight, Star } from "lucide-react";
import { SearchField } from "../components/ui/SearchField";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useClubData } from "../hooks/useClubData";
import { useSongDialog } from "../hooks/useSongDialog";
import { SongCover } from "../components/ui/SongCover";
import { averageRating, emptyVoteStats } from "../lib/songRules";
import { formatKoreanDate } from "../lib/utils";

export function RecordsPage() {
  const { data, voteStats } = useClubData();
  const { openSong } = useSongDialog();
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("");
  if (!data) return null;
  const archived = data.songs.filter((song) => song.archived_at).sort((a, b) => b.archived_at!.localeCompare(a.archived_at!) || a.id.localeCompare(b.id));
  const monthKey = (value: string) => new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", timeZone: "Asia/Seoul" }).format(new Date(value));
  const months = [...new Set(archived.map((song) => monthKey(song.archived_at!)))];
  const filtered = archived.filter((song) => (!month || monthKey(song.archived_at!) === month) && `${song.title} ${song.artist} ${song.adder}`.toLocaleLowerCase("ko-KR").includes(query.trim().toLocaleLowerCase("ko-KR")));
  return (
    <div className="page records-page">
      <Link className="records-back" to="/"><ArrowLeft size={16} /> 홈</Link>
      <header className="page-header"><div><h1>방출</h1><span className="page-count">{archived.length}곡</span></div></header>
      <div className="records-tools">
        <SearchField value={query} onChange={(event) => setQuery(event.target.value)} onClear={() => setQuery("")} placeholder="곡, 아티스트, 추천자 검색" aria-label="보관한 곡 검색" />
        <label className="records-month"><span className="visually-hidden">방출한 달</span><select value={month} onChange={(event) => setMonth(event.target.value)}><option value="">모든 달</option>{months.map((value) => <option key={value} value={value}>{value.replace("-", "년 ")}월</option>)}</select></label>
      </div>
      <div className="record-list">
        {filtered.map((song) => {
          const stats = voteStats.get(song.id) ?? emptyVoteStats();
          const rating = averageRating(stats.votes);
          return <button className="record-song" key={song.id} onClick={() => openSong(song.id)} aria-label={`${song.title} - ${song.artist} 방출 기록 보기`}>
            <SongCover song={song} /><span className="record-song-copy"><span className="song-title" title={song.title}>{song.title}</span><span className="song-artist">{song.artist}</span><span className="record-song-meta">{formatKoreanDate(song.archived_at!)} 방출</span></span><span className="record-votes"><span>승격 {stats.promotedCount}</span><span>보류 {stats.heldCount}</span><span>방출 {stats.releasedCount}</span></span><span className="record-song-action">{rating !== null ? <span className="song-card-rating"><Star size={12} />{rating.toFixed(1)}</span> : null}<ChevronRight size={18} /></span>
          </button>;
        })}
        {!filtered.length ? <div className="empty-card large"><Archive /><h3>{archived.length ? "조건에 맞는 방출 곡이 없어요" : "아직 보관된 곡이 없어요"}</h3></div> : null}
      </div>
    </div>
  );
}
