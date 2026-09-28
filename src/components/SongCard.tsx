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
          <span className="song-title-row"><span className="song-title">{song.title}</span></span>
          <span className="song-artist">{song.artist}</span>
          <span className="song-card-meta"><span className="song-card-adder">{song.adder} 추천</span><span className="song-vote-count">평가 {stats.votes.length}명</span>{avg !== null ? <span className="song-card-rating"><Star size={12} />{avg.toFixed(1)}</span> : null}</span>
          {!hideStatus && !hasVoted ? <span className="decision-countdown">{getDecisionCountdown(song.createdAt)}</span> : null}
        </span>
      </button>
      <div className="song-row-action">
        {!hideStatus ? <StatusBadge song={song} stats={stats} /> : null}
        {!hasVoted ? <button className="evaluate-button" onClick={onOpen}>평가하기<ChevronRight size={14} /></button> : <button className="card-arrow" aria-label={`${song.title} 상세 보기`} onClick={onOpen}><ChevronRight size={18} /></button>}
      </div>
    </article>
  );
}
