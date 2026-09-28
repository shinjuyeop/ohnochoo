import { Archive, ArrowLeft, ChevronRight, Search, Star } from "lucide-react";
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
      <header className="page-header"><div><h1>기록<span className="heading-dot">.</span></h1><p>함께 들었던 음악과 그때 나눈 이야기.</p></div></header>
      <section className="records-intro"><span className="records-entry-icon"><Archive size={23} /></span><div><h2>방출 보관함 <span>{archived.length}곡</span></h2><p>플레이리스트를 떠난 곡도, 우리의 평가는 남아요.</p></div></section>
      <div className="records-tools">
        <label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="곡, 아티스트, 추천자 검색" aria-label="보관한 곡 검색" /></label>
        <label className="records-month"><span className="visually-hidden">방출한 달</span><select value={month} onChange={(event) => setMonth(event.target.value)}><option value="">모든 달</option>{months.map((value) => <option key={value} value={value}>{value.replace("-", "년 ")}월</option>)}</select></label>
      </div>
      <div className="record-list">
        {filtered.map((song) => {
          const stats = voteStats.get(song.id) ?? emptyVoteStats();
          const rating = averageRating(stats.votes);
          return <button className="record-song" key={song.id} onClick={() => openSong(song.id)} aria-label={`${song.title} - ${song.artist} 기록 보기`}>
            <SongCover song={song} /><span className="record-song-copy"><span className="song-title">{song.title}</span><span className="song-artist">{song.artist}</span><span className="record-song-meta">{song.adder} 추천 · {formatKoreanDate(song.archived_at!)} 방출</span><span className="record-votes"><span>승격 {stats.promotedCount}</span><span>보류 {stats.heldCount}</span><span>방출 {stats.releasedCount}</span>{rating !== null ? <span><Star size={12} /> {rating.toFixed(1)}</span> : null}</span></span><ChevronRight size={18} />
          </button>;
        })}
        {!filtered.length ? <div className="empty-card large"><Archive /><h3>{archived.length ? "조건에 맞는 기록이 없어요" : "아직 보관된 곡이 없어요"}</h3><p>{archived.length ? "검색어나 기간을 바꿔보세요." : "방출된 곡을 보관하면 커버와 평가를 여기에서 다시 볼 수 있어요."}</p></div> : null}
      </div>
      <p className="records-footnote">보관을 시작한 이후의 기록이에요. 이전에 삭제된 곡은 포함되지 않아요.</p>
    </div>
  );
}
