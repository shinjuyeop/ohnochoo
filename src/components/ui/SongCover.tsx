import { Music2 } from "lucide-react";
import { useState } from "react";
import { cn, coverSrcSet, normalizeCoverUrl } from "../../lib/utils";
import type { Song } from "../../types";

export function SongCover({ song, className, eager = false, sizes = "52px" }: { song: Pick<Song, "title" | "coverImageUrl">; className?: string; eager?: boolean; sizes?: string }) {
  const url = normalizeCoverUrl(song.coverImageUrl);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <div className={cn("song-cover", className)}>
      {url && url !== failedUrl ? <img src={url} srcSet={coverSrcSet(song.coverImageUrl)} sizes={sizes} width={600} height={600} alt={`${song.title} 앨범 커버`} loading={eager ? "eager" : "lazy"} decoding="async" fetchPriority={eager ? "high" : "auto"} onError={() => setFailedUrl(url)} /> : <Music2 aria-hidden="true" />}
    </div>
  );
}
