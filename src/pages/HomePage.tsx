import { ArrowRight, Camera, Clock3, Disc3, ExternalLink, Music, Plus, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { SongCard } from "../components/SongCard";
import { SongDetailDialog } from "../components/SongDetailDialog";
import { useAppUi } from "../app/AppUiContext";
import { useClubData } from "../hooks/useClubData";
import { useProfile } from "../features/profile/ProfileContext";
import { emptyVoteStats, isSongByMember, isVoteByMember } from "../lib/songRules";
import { MUTIGOEUL_APPLE_MUSIC_URL, MUTIGOEUL_INSTAGRAM_URL, ONOCHU_APPLE_MUSIC_URL } from "../lib/constants";

export function HomePage() {
  const { data, onochuSongs, voteStats } = useClubData();
  const { profile } = useProfile();
  const { openAddSong } = useAppUi();
  const navigate = useNavigate();
  const [detailId, setDetailId] = useState<string | null>(null);
  if (!data || !profile) return null;
  const votedIds = new Set(data.votes.filter((vote) => isVoteByMember(vote, profile)).map((vote) => vote.songId));
  const pending = [...onochuSongs].filter((song) => !votedIds.has(song.id)).reverse();
  const mine = onochuSongs.filter((song) => isSongByMember(song, profile)).length;
  return (
    <div className="page home-page">
      <div className="home-layout">
        <div className="home-main">
          <section className="task-hero">
            <div className="task-icon"><Sparkles /></div>
            <div><span>지금 할 일</span><h2>{pending.length ? `평가할 곡이 ${pending.length}개 있어요` : "모든 곡을 평가했어요"}</h2></div>
          </section>
          <section className="content-section">
            <div className="section-heading"><div><span className="eyebrow"><Clock3 size={13} /> YOUR QUEUE</span><h2>평가를 기다리는 곡</h2></div><Link to="/onochoo?filter=pending">전체 보기 <ArrowRight size={16} /></Link></div>
            <div className="song-list full-list queue-list">{pending.slice(0, 3).map((song) => <SongCard key={song.id} song={song} stats={voteStats.get(song.id) ?? emptyVoteStats()} hasVoted={false} onOpen={() => setDetailId(song.id)} compact />)}{!pending.length ? <div className="empty-card"><Disc3 /><p>대기 중인 평가가 없어요.<br />여유롭게 음악을 즐겨보세요.</p></div> : null}</div>
          </section>
          <section className="content-section home-links-section" aria-label="외부 링크">
            <div className="section-heading"><div><span className="eyebrow">LINKS</span><h2>바로가기</h2></div></div>
            <div className="mutigoeul-links home-external-links">
              <a href={ONOCHU_APPLE_MUSIC_URL} target="_blank" rel="noreferrer"><span className="external-icon onochu"><Music /></span><div><b>오노추 플레이리스트</b></div><ExternalLink /></a>
              <a href={MUTIGOEUL_APPLE_MUSIC_URL} target="_blank" rel="noreferrer"><span className="external-icon apple"><Music /></span><div><b>무티고을 플레이리스트</b></div><ExternalLink /></a>
              <a href={MUTIGOEUL_INSTAGRAM_URL} target="_blank" rel="noreferrer"><span className="external-icon instagram"><Camera /></span><div><b>무티고을 Instagram</b></div><ExternalLink /></a>
            </div>
          </section>
        </div>
        <aside className="home-aside">
          <section className="mini-stats"><h3>나의 기록</h3><div><span><b>{data.votes.filter((vote) => isVoteByMember(vote, profile)).length}</b>평가</span><span><b>{mine}</b>추천</span><span><b>{data.mutigoeulEntries.length}</b>무티고을</span></div></section>
          <button className="aside-add" onClick={openAddSong}><span><Plus /></span><div><b>새 노래 추천하기</b><small>오늘 발견한 음악을 나눠요</small></div><ArrowRight /></button>
          <button className="aside-link" onClick={() => navigate("/mutigoeul")}><Disc3 /><span><b>무티고을 둘러보기</b><small>우리의 최종 플레이리스트</small></span><ArrowRight /></button>
        </aside>
      </div>
      <SongDetailDialog songId={detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }} />
    </div>
  );
}
