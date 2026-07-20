import { ChevronRight, MessageCircle, Star } from "lucide-react";
import { SongCover } from "./ui/SongCover";
import { StatusBadge } from "./ui/StatusBadge";
import { formatCompactDate } from "../lib/utils";
import { averageRating } from "../lib/songRules";
import type { Song, VoteStats } from "../types";

export function SongCard({ song, stats, hasVoted, onOpen, compact = false, hideStatus = false }: { song: Song; stats: VoteStats; hasVoted: boolean; onOpen: () => void; compact?: boolean; hideStatus?: boolean }) {
  const avg = averageRating(stats.votes);
  return (
    <article className={`song-card ${compact ? "song-card-compact" : ""}`} onClick={onOpen}>
      <SongCover song={song} eager={compact} />
      <div className={`song-card-main ${hideStatus ? "song-card-main-plain" : ""}`}>
        {!hideStatus ? <div className="song-card-top"><StatusBadge song={song} stats={stats} /><span>{formatCompactDate(song.createdAt)}</span></div> : null}
        <div className="song-title-row"><h3>{song.title}</h3>{hideStatus ? <span className="song-title-date">{formatCompactDate(song.createdAt)}</span> : null}</div>
        <p>{song.artist}</p>
        <div className="song-card-meta"><span>by {song.adder}</span><span><MessageCircle size={14} /> {stats.votes.length}</span>{avg !== null ? <span><Star size={14} /> {avg.toFixed(1)}</span> : null}</div>
      </div>
      {!hasVoted ? <button className="evaluate-button" onClick={(event) => { event.stopPropagation(); onOpen(); }}>평가하기</button> : <button className="card-arrow" aria-label={`${song.title} 상세 보기`}><ChevronRight /></button>}
    </article>
  );
}
