import { useMemo, useState } from "react";
import { CircleHelp, Music2, Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { SongCard } from "../components/SongCard";
import { SongDetailDialog } from "../components/SongDetailDialog";
import { Dialog } from "../components/ui/Dialog";
import { useClubData } from "../hooks/useClubData";
import { useProfile } from "../features/profile/ProfileContext";
import { emptyVoteStats, isSongByMember, isVoteByMember } from "../lib/songRules";

type Filter = "all" | "pending" | "voted" | "mine";
const filters: Array<{ value: Filter; label: string }> = [{ value: "all", label: "전체" }, { value: "pending", label: "미평가" }, { value: "voted", label: "평가 완료" }, { value: "mine", label: "내가 추가" }];

export function OnochooPage() {
  const { data, onochuSongs, voteStats } = useClubData();
  const { profile } = useProfile();
  const [params, setParams] = useSearchParams();
  const rawFilter = params.get("filter");
  const filter: Filter = rawFilter === "pending" || rawFilter === "voted" || rawFilter === "mine" ? rawFilter : "all";
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const filtered = useMemo(() => {
    if (!data || !profile) return [];
    return [...onochuSongs].reverse().filter((song) => {
      const voted = data.votes.some((vote) => vote.songId === song.id && isVoteByMember(vote, profile));
      const filterMatch = filter === "all" || (filter === "pending" && !voted) || (filter === "voted" && voted) || (filter === "mine" && isSongByMember(song, profile));
      const searchMatch = !query.trim() || `${song.title} ${song.artist} ${song.adder}`.toLowerCase().includes(query.trim().toLowerCase());
      return filterMatch && searchMatch;
    });
  }, [data, profile, onochuSongs, filter, query]);
  if (!data || !profile) return null;
  return (
    <div className="page">
      <header className="page-header"><div><span className="eyebrow">THE CANDIDATES</span><h1>오노추</h1></div><button className="icon-text-button" onClick={() => setRulesOpen(true)}><CircleHelp size={18} /> 판정 기준</button></header>
      <div className="playlist-tools">
        <div className="segmented-control">{filters.map((item) => <button key={item.value} className={filter === item.value ? "active" : ""} onClick={() => setParams(item.value === "all" ? {} : { filter: item.value })}>{item.label}{item.value === "pending" ? <span>{onochuSongs.filter((song) => !data.votes.some((vote) => vote.songId === song.id && isVoteByMember(vote, profile))).length}</span> : null}</button>)}</div>
        <label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="곡, 아티스트 검색" /></label>
      </div>
      <div className="song-list full-list">{filtered.map((song) => {
        const hasVoted = data.votes.some((vote) => vote.songId === song.id && isVoteByMember(vote, profile));
        return <SongCard key={song.id} song={song} stats={voteStats.get(song.id) ?? emptyVoteStats()} hasVoted={hasVoted} onOpen={() => setDetailId(song.id)} showDecisionCounts />;
      })}{!filtered.length ? <div className="empty-card large"><Music2 /><h3>조건에 맞는 곡이 없어요</h3><p>다른 필터나 검색어를 사용해 보세요.</p></div> : null}</div>
      <SongDetailDialog songId={detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }} />
      <Dialog open={rulesOpen} onOpenChange={setRulesOpen} title="오노추 판정 기준" description="투표 수와 등록 기간을 함께 반영해요.">
        <div className="dialog-body rule-list">
          <article><span className="rule-dot promote" /><div><b>승격 후보</b><p>승격 수가 방출 수보다 3개 이상 많으면 후보가 됩니다.</p></div></article>
          <article><span className="rule-dot ready" /><div><b>무티고을 이동 가능</b><p>등록 후 7일이 지나고 승격 조건을 만족한 곡입니다.</p></div></article>
          <article><span className="rule-dot release" /><div><b>방출 예정</b><p>7일이 지났지만 아직 승격 조건을 만족하지 못했어요.</p></div></article>
          <article><span className="rule-dot pending" /><div><b>평가 중</b><p>7일 판정일까지 친구들의 평가를 기다리고 있어요.</p></div></article>
        </div>
      </Dialog>
    </div>
  );
}
