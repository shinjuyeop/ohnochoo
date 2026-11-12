import { Music2 } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import { cn, coverSrcSet, normalizeCoverUrl } from "../../lib/utils";
import type { Song } from "../../types";

const decodedCovers = new Set<string>();
const preloadedThumbnails = new Set<string>();

export function preloadSongCovers(songs: Array<Pick<Song, "coverImageUrl">>, sizes = "52px") {
  if (typeof window === "undefined") return;
  for (const song of songs.slice(0, 24)) {
    const url = normalizeCoverUrl(song.coverImageUrl);
    if (!url || url.includes("/slow-cover.png")) continue;
    const key = `${sizes}:${url}`;
    if (preloadedThumbnails.has(key)) continue;
    preloadedThumbnails.add(key);
    const img = new Image();
    img.decoding = "async";
    const srcSet = coverSrcSet(song.coverImageUrl);
    if (srcSet) {
      img.sizes = sizes;
      img.srcset = srcSet;
    }
    img.src = url;
    void img.decode().then(() => {
      decodedCovers.add(url);
      if (img.currentSrc) decodedCovers.add(img.currentSrc);
    }).catch(() => {});
  }
}

export function SongCover({ song, className, eager = false, sizes = "52px" }: { song: Pick<Song, "title" | "coverImageUrl">; className?: string; eager?: boolean; sizes?: string }) {
  const url = normalizeCoverUrl(song.coverImageUrl);
  return (
    <div className={cn("song-cover", className)}>
      {url ? <CoverImage key={url} url={url} srcSet={coverSrcSet(song.coverImageUrl)} sizes={sizes} title={song.title} eager={eager} /> : <Music2 aria-hidden="true" />}
    </div>
  );
}

function CoverImage({ url, srcSet, sizes, title, eager }: { url: string; srcSet?: string; sizes: string; title: string; eager: boolean }) {
  const cached = decodedCovers.has(url);
  const [ready, setReady] = useState(cached);
  const [failed, setFailed] = useState(false);

  async function reveal(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    const source = image.currentSrc;
    // Reveal a complete frame instead of letting an async decode paint partial artwork.
    try { await image.decode(); } catch { /* A responsive source can change during decoding. */ }
    if (image.isConnected && image.currentSrc === source && image.complete && image.naturalWidth > 0) {
      decodedCovers.add(url);
      if (source) decodedCovers.add(source);
      setReady(true);
    }
  }

  if (failed) return <Music2 aria-hidden="true" />;
  return <img src={url} srcSet={srcSet} sizes={sizes} width={600} height={600} alt={`${title} 앨범 커버`} loading={eager || cached ? "eager" : "lazy"} decoding={cached ? "sync" : "async"} fetchPriority={eager ? "high" : "auto"} data-ready={ready} data-cached={cached ? "true" : undefined} onLoad={reveal} onError={() => setFailed(true)} />;
}
