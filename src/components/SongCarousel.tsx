import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Song } from "../types";
import { SongCover } from "./ui/SongCover";

export function SongCarousel({ songs, label, onOpen }: { songs: Song[]; label: string; onOpen: (id: string) => void }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const trackId = useId();
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const updateEdges = () => setEdges({
      start: track.scrollLeft <= 1,
      end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 1,
    });
    updateEdges();
    track.addEventListener("scroll", updateEdges, { passive: true });
    const observer = new ResizeObserver(updateEdges);
    observer.observe(track);
    return () => {
      track.removeEventListener("scroll", updateEdges);
      observer.disconnect();
    };
  }, [songs]);

  const scroll = (direction: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * .85 });
  };

  return (
    <div className="song-carousel" role="region" aria-label={label}>
      <ul className="song-carousel-track" id={trackId} ref={trackRef}>
        {songs.map((song, index) => (
          <li key={song.id}>
            <button className="album-tile" aria-label={`${song.title} - ${song.artist} 상세 보기`} onClick={() => onOpen(song.id)}>
              <SongCover song={song} eager={index < 2} />
              <b title={song.title}>{song.title}</b>
              <span title={song.artist}>{song.artist}</span>
            </button>
          </li>
        ))}
      </ul>
      {!(edges.start && edges.end) ? <div className="song-carousel-controls">
        <button className="icon-button" aria-label={`${label} 이전 곡`} aria-controls={trackId} disabled={edges.start} onClick={() => scroll(-1)}><ChevronLeft size={20} /></button>
        <button className="icon-button" aria-label={`${label} 다음 곡`} aria-controls={trackId} disabled={edges.end} onClick={() => scroll(1)}><ChevronRight size={20} /></button>
      </div> : null}
    </div>
  );
}
