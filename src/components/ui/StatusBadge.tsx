import type { Song, VoteStats } from "../../types";
import { getSongStatus } from "../../lib/songRules";

export function StatusBadge({ song, stats }: { song: Song; stats: VoteStats }) {
  const status = getSongStatus(song, stats.promotedCount, stats.releasedCount);
  return <span className={`status-badge status-${status.tone}`}>{status.label}</span>;
}
