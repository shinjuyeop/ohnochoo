import { ArrowDownUp, Disc3, Grid2X2, List, Music2 } from "lucide-react";
import { useState } from "react";
import { SearchField } from "../components/ui/SearchField";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { SongCover } from "../components/ui/SongCover";
import { SongCard } from "../components/SongCard";
import { useSongDialog } from "../hooks/useSongDialog";
import { useClubData } from "../hooks/useClubData";
import { useProfile } from "../features/profile/ProfileContext";
import { emptyVoteStats, isVoteByMember } from "../lib/songRules";

type ViewMode = "grid" | "list";
type SortOrder = "desc" | "asc";

export function AlbumsPage() {
  const { data, albumSongs, voteStats } = useClubData();
  const { profile } = useProfile();
  const { openSong } = useSongDialog();
  const [viewMode, setViewMode] = useState<ViewMode>(() => localStorage.getItem("albumsViewMode") === "list" ? "list" : "grid");
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => localStorage.getItem("albumsSortOrder") === "asc" ? "asc" : "desc");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const visibleAlbums = albumSongs.filter((album) =>
    !normalizedQuery || `${album.title} ${album.artist} ${album.adder}`.toLocaleLowerCase("ko-KR").includes(normalizedQuery),
  );
  const sortedAlbums = [...visibleAlbums].sort((a, b) => {
    const difference = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortOrder === "asc" ? difference : -difference;
  });
  const changeView = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("albumsViewMode", mode);
  };
  const changeSort = (order: SortOrder) => {
    setSortOrder(order);
    localStorage.setItem("albumsSortOrder", order);
  };
  return (
    <div className="page mutigoeul-page albums-page">
      <header className="page-header"><div><h1>앨범스</h1><span className="page-count">{albumSongs.length}장</span></div></header>
      <section className="content-section archive-section">
        <div className="archive-toolbar">
          <div className="archive-control-group">
            <SegmentedControl className="view-toggle" label="보기 형식" value={viewMode} onChange={changeView} options={[{ value: "grid", label: <Grid2X2 aria-hidden="true" />, accessibleLabel: "블록 보기" }, { value: "list", label: <List aria-hidden="true" />, accessibleLabel: "세로 목록 보기" }]} />
            <label className="archive-sort"><ArrowDownUp size={15} /><span className="visually-hidden">정렬</span><select value={sortOrder} onChange={(event) => changeSort(event.target.value as SortOrder)} aria-label="추가일 정렬"><option value="desc">추가일 내림차순</option><option value="asc">추가일 오름차순</option></select></label>
          </div>
          <SearchField className="archive-search" value={query} onChange={(event) => setQuery(event.target.value)} onClear={() => setQuery("")} placeholder="앨범, 아티스트 검색" />
        </div>
        {sortedAlbums.length ? viewMode === "grid"
          ? <div className="album-grid">{sortedAlbums.map((album, index) => <button className="album-tile" key={album.id} onClick={() => openSong(album.id)}><SongCover song={album} sizes="(min-width: 1500px) 224px, (min-width: 1200px) calc((100vw - 364px) / 4), (min-width: 900px) calc((100vw - 314px) / 3), (min-width: 640px) calc((100vw - 96px) / 3), calc((100vw - 54px) / 2)" eager={index < 2} /><b>{album.title}</b><span>{album.artist}</span></button>)}</div>
          : <div className="song-list full-list archive-list">{sortedAlbums.map((album) => {
            const hasVoted = Boolean(profile && data?.votes.some((vote) => vote.songId === album.id && isVoteByMember(vote, profile)));
            return <SongCard key={album.id} song={album} stats={voteStats.get(album.id) ?? emptyVoteStats()} hasVoted={hasVoted} onOpen={() => openSong(album.id)} hideStatus />;
          })}</div>
          : albumSongs.length
            ? <div className="empty-card large"><Music2 /><h3>검색 결과가 없어요</h3><p>다른 앨범명이나 아티스트를 검색해 보세요.</p></div>
            : <div className="empty-card large"><Disc3 /><h3>아직 앨범스가 비어 있어요</h3><p>추가 버튼을 눌러 함께 들을 앨범을 추천해 보세요.</p></div>}
      </section>
    </div>
  );
}

