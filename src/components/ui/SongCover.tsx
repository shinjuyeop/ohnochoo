import { Music2 } from "lucide-react";
import { cn, normalizeCoverUrl } from "../../lib/utils";
import type { Song } from "../../types";

export function SongCover({ song, className, eager = false }: { song: Pick<Song, "title" | "coverImageUrl">; className?: string; eager?: boolean }) {
  const url = normalizeCoverUrl(song.coverImageUrl);
  return (
    <div className={cn("song-cover", className)}>
      {url ? <img src={url} alt={`${song.title} 앨범 커버`} loading={eager ? "eager" : "lazy"} /> : <Music2 aria-hidden="true" />}
    </div>
  );
}
