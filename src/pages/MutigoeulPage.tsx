import { ArrowDownUp, Grid2X2, Library, List } from "lucide-react";
import { useState } from "react";
import { SongCover } from "../components/ui/SongCover";
import { SongDetailDialog } from "../components/SongDetailDialog";
import { SongCard } from "../components/SongCard";
import { useClubData } from "../hooks/useClubData";
import { emptyVoteStats } from "../lib/songRules";

type ViewMode = "grid" | "list";
type SortOrder = "desc" | "asc";

export function MutigoeulPage() {
  const { mutigoeulSongs, voteStats } = useClubData();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => localStorage.getItem("mutigoeulViewMode") === "list" ? "list" : "grid");
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => localStorage.getItem("mutigoeulSortOrder") === "asc" ? "asc" : "desc");
  const sortedSongs = [...mutigoeulSongs].sort((a, b) => {
    const difference = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortOrder === "asc" ? difference : -difference;
  });
  const changeView = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("mutigoeulViewMode", mode);
  };
  const changeSort = (order: SortOrder) => {
    setSortOrder(order);
    localStorage.setItem("mutigoeulSortOrder", order);
  };
  return (
    <div className="page mutigoeul-page">
      <header className="page-header"><div><span className="eyebrow">THE ARCHIVE</span><h1>무티고을</h1></div></header>
      <section className="content-section archive-section">
        <div className="archive-toolbar">
          <div className="view-toggle" role="group" aria-label="보기 형식"><button className={viewMode === "grid" ? "active" : ""} onClick={() => changeView("grid")} aria-label="블록 보기" aria-pressed={viewMode === "grid"}><Grid2X2 /><span>블록</span></button><button className={viewMode === "list" ? "active" : ""} onClick={() => changeView("list")} aria-label="세로 목록 보기" aria-pressed={viewMode === "list"}><List /><span>목록</span></button></div>
          <label className="archive-sort"><ArrowDownUp size={15} /><span className="visually-hidden">정렬</span><select value={sortOrder} onChange={(event) => changeSort(event.target.value as SortOrder)} aria-label="추가일 정렬"><option value="desc">추가일 내림차순</option><option value="asc">추가일 오름차순</option></select></label>
        </div>
        {sortedSongs.length ? viewMode === "grid"
          ? <div className="album-grid">{sortedSongs.map((song) => <button className="album-tile" key={song.id} onClick={() => setDetailId(song.id)}><SongCover song={song} /><b>{song.title}</b><span>{song.artist}</span></button>)}</div>
          : <div className="song-list full-list archive-list">{sortedSongs.map((song) => <SongCard key={song.id} song={song} stats={voteStats.get(song.id) ?? emptyVoteStats()} hasVoted onOpen={() => setDetailId(song.id)} hideStatus />)}</div>
          : <div className="empty-card large"><Library /><h3>아직 무티고을이 비어 있어요</h3><p>친구들의 선택을 받은 곡이 곧 이곳에 모일 거예요.</p></div>}
      </section>
      <SongDetailDialog songId={detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }} allowVote={false} />
    </div>
  );
}
