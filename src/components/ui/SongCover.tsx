import { Music2 } from "lucide-react";
import { useState } from "react";
import { cn, normalizeCoverUrl } from "../../lib/utils";
import type { Song } from "../../types";

export function SongCover({ song, className, eager = false }: { song: Pick<Song, "title" | "coverImageUrl">; className?: string; eager?: boolean }) {
  const url = normalizeCoverUrl(song.coverImageUrl);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <div className={cn("song-cover", className)}>
      {url && url !== failedUrl ? <img src={url} alt={`${song.title} 앨범 커버`} loading={eager ? "eager" : "lazy"} onError={() => setFailedUrl(url)} /> : <Music2 aria-hidden="true" />}
    </div>
  );
}
