import { ChevronRight, Star } from "lucide-react";
import { SongCover } from "./ui/SongCover";
import { StatusBadge } from "./ui/StatusBadge";
import { averageRating, getDecisionCountdown } from "../lib/songRules";
import type { Song, VoteStats } from "../types";

export function SongCard({ song, stats, hasVoted, onOpen, compact = false, hideStatus = false }: { song: Song; stats: VoteStats; hasVoted: boolean; onOpen: () => void; compact?: boolean; hideStatus?: boolean }) {
  const avg = averageRating(stats.votes);
  return (
    <article className={`song-card ${compact ? "song-card-compact" : ""}`}>
      <button className="song-card-open" aria-label={`${song.title} - ${song.artist} 상세 보기`} onClick={onOpen}>
        <SongCover song={song} eager={compact} />
        <span className="song-card-main">
          <span className="song-title" title={song.title}>{song.title}</span>
          <span className="song-artist" title={song.artist}>{song.artist}</span>
          {!hideStatus ? <span className="decision-countdown">{getDecisionCountdown(song.createdAt)}</span> : <span className="song-card-meta">{song.adder} · 평가 {stats.votes.length}명</span>}
        </span>
      </button>
      <div className="song-card-stats"><span>{song.adder}</span><span>평가 {stats.votes.length}명</span>{avg !== null ? <span className="song-card-rating"><Star size={12} />{avg.toFixed(1)}</span> : null}</div>
      <div className="song-row-action">
        {!hideStatus ? <StatusBadge song={song} stats={stats} /> : null}
        {!hasVoted ? <button className="evaluate-button" aria-label={`${song.title} 평가하기`} onClick={onOpen}>평가<ChevronRight size={14} /></button> : <button className="card-arrow" aria-label={`${song.title} 상세 보기`} onClick={onOpen}><ChevronRight size={18} /></button>}
      </div>
    </article>
  );
}
