import { useQuery } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle, Music2 } from "lucide-react";
import { fetchPlaylist } from "../lib/api";
import { getSongKey } from "../lib/utils";
import type { Song } from "../types";

export function SongAlbumLink({ song, playlistUrl, playlistName }: { song: Song; playlistUrl: string; playlistName: string }) {
  const playlist = useQuery({
    queryKey: ["apple-music-playlist", playlistUrl],
    queryFn: () => fetchPlaylist(playlistUrl),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const album = playlist.data?.find((item) => getSongKey(item.title, item.artist) === getSongKey(song.title, song.artist));

  if (playlist.isPending) return (
    <div className="listen-link" role="status"><LoaderCircle className="spin" size={18} /><span><b>수록 앨범을 찾고 있어요</b><small>Apple Music에서 확인 중이에요</small></span></div>
  );

  return (
    <div className="album-link-section">
      <a className="listen-link" href={album?.albumUrl || playlistUrl} target="_blank" rel="noreferrer">
        <Music2 size={18} />
        <span><b>{album?.albumUrl ? "수록 앨범 열기" : `${playlistName} 플레이리스트 열기`}</b><small>{album?.albumUrl ? album.albumName || "Apple Music에서 앨범을 열어요" : playlist.isError ? "앨범 정보를 불러오지 못했어요" : "수록 앨범을 찾지 못했어요"}</small></span>
        <ExternalLink size={16} />
      </a>
      {!album?.albumUrl ? <button className="album-retry" disabled={playlist.isFetching} onClick={() => void playlist.refetch()}>{playlist.isFetching ? "앨범 확인 중..." : "앨범 다시 찾기"}</button> : null}
    </div>
  );
}
