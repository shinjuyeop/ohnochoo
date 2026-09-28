import { Music2 } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import { cn, coverSrcSet, normalizeCoverUrl } from "../../lib/utils";
import type { Song } from "../../types";

export function SongCover({ song, className, eager = false, sizes = "52px" }: { song: Pick<Song, "title" | "coverImageUrl">; className?: string; eager?: boolean; sizes?: string }) {
  const url = normalizeCoverUrl(song.coverImageUrl);
  return (
    <div className={cn("song-cover", className)}>
      {url ? <CoverImage key={url} url={url} srcSet={coverSrcSet(song.coverImageUrl)} sizes={sizes} title={song.title} eager={eager} /> : <Music2 aria-hidden="true" />}
    </div>
  );
}

function CoverImage({ url, srcSet, sizes, title, eager }: { url: string; srcSet?: string; sizes: string; title: string; eager: boolean }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  async function reveal(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    const source = image.currentSrc;
    // Reveal a complete frame instead of letting an async decode paint partial artwork.
    try { await image.decode(); } catch { /* A responsive source can change during decoding. */ }
    if (image.isConnected && image.currentSrc === source && image.complete && image.naturalWidth > 0) {
      setReady(true);
    }
  }

  if (failed) return <Music2 aria-hidden="true" />;
  return <img src={url} srcSet={srcSet} sizes={sizes} width={600} height={600} alt={`${title} 앨범 커버`} loading={eager ? "eager" : "lazy"} decoding="async" fetchPriority={eager ? "high" : "auto"} data-ready={ready} onLoad={reveal} onError={() => setFailed(true)} />;
}
