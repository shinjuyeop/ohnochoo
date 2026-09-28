import { ArrowRight, Camera, Disc3, ExternalLink, Music } from "lucide-react";
import { Link } from "react-router-dom";
import { SongCard } from "../components/SongCard";
import { useReviewSession } from "../app/ReviewSessionContext";
import { SongCover } from "../components/ui/SongCover";
import { useSongDialog } from "../hooks/useSongDialog";
import { useAppUi } from "../app/AppUiContext";
import { useClubData } from "../hooks/useClubData";
import { useProfile } from "../features/profile/ProfileContext";
import { emptyVoteStats, isSongByMember, isVoteByMember, sortByDecisionDate } from "../lib/songRules";
import { MUTIGOEUL_APPLE_MUSIC_URL, MUTIGOEUL_INSTAGRAM_URL, ONOCHU_APPLE_MUSIC_URL } from "../lib/constants";

export function HomePage() {
  const { data, onochuSongs, mutigoeulSongs, voteStats } = useClubData();
  const { profile } = useProfile();
  const { openAddSong } = useAppUi();
  const { openSong } = useSongDialog();
  const review = useReviewSession();
  if (!data || !profile) return null;
  const myVotes = data.votes.filter((vote) => isVoteByMember(vote, profile));
  const votedIds = new Set(myVotes.map((vote) => vote.songId));
  const pending = sortByDecisionDate(onochuSongs.filter((song) => !votedIds.has(song.id)));
  const mine = data.songs.filter((song) => isSongByMember(song, profile)).length;
  const recentArchive = [...data.mutigoeulEntries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((entry) => mutigoeulSongs.find((song) => song.id === entry.songId)).filter((song) => song !== undefined).slice(0, 4);

  return (
    <div className="page home-page">
      <h1 className="visually-hidden">홈</h1>
      <div className="home-layout">
        <div className="home-main">
          <section className="content-section queue-section">
            <div className="section-heading queue-heading">
              <div><h2>{pending.length ? `평가할 곡이 ${pending.length}개 있어요` : "모든 곡을 평가했어요"}</h2><p>{pending.length ? "판정일이 빠른 곡부터 차례로 들어보세요." : "오늘 발견한 좋은 음악을 나눠보세요."}</p></div>
              <button className="text-button queue-start" onClick={() => pending[0] ? review.start() : openAddSong()}>{pending.length ? (review.progress.remaining.length && review.progress.completed ? "평가 이어하기" : "바로 평가하기") : "새 노래 추천하기"}<ArrowRight size={16} /></button>
            </div>
            <div className="song-list full-list queue-list">
              {pending.slice(0, 4).map((song) => <SongCard key={song.id} song={song} stats={voteStats.get(song.id) ?? emptyVoteStats()} hasVoted={false} onOpen={() => openSong(song.id)} compact />)}
              {!pending.length ? <div className="empty-card"><Disc3 /><p>모두 들었네요.<br />친구들의 다음 추천을 기다려볼까요?</p></div> : null}
            </div>
            {pending.length ? <Link className="list-more" to="/onochoo?filter=pending">미평가 곡 전체 보기 <span>{pending.length}</span><ArrowRight size={15} /></Link> : null}
          </section>
        </div>
        <aside className="home-aside">
          <section className="home-collection">
            <div className="section-heading"><h2>무티고을</h2><span className="collection-count">{mutigoeulSongs.length}곡</span></div>
            {recentArchive.length ? <div className="collection-picks">{recentArchive.map((song) => <button className="collection-pick" key={song.id} onClick={() => openSong(song.id)}><SongCover song={song} /><span><b>{song.title}</b><small>{song.artist}</small></span><ArrowRight size={15} /></button>)}</div> : <p className="collection-empty">우리의 선택을 받은 음악이<br />이곳에 차곡차곡 모여요.</p>}
            <Link className="collection-more" to="/mutigoeul">플레이리스트 둘러보기 <ArrowRight size={15} /></Link>
          </section>
          <Link className="records-entry" to="/records">
            <span className="records-entry-heading"><b>기록</b><span className="records-entry-count">{data.songs.filter((song) => song.archived_at).length}곡<ArrowRight size={17} /></span></span>
            <small>방출된 곡과 그때 나눈 이야기</small>
          </Link>
          <section className="mini-stats">
            <h2>나의 음악 기록</h2>
            <dl><div><dt>추천한 곡</dt><dd>{mine}</dd></div><div><dt>남긴 평가</dt><dd>{myVotes.length}</dd></div></dl>
          </section>
        </aside>
      </div>
      <footer className="home-listening-links" aria-label="외부 링크">
        <span>앱 밖에서도 함께 들어요</span>
        <div>
          <a href={ONOCHU_APPLE_MUSIC_URL} target="_blank" rel="noreferrer"><Music size={15} /> 오노추 <ExternalLink size={12} /></a>
          <a href={MUTIGOEUL_APPLE_MUSIC_URL} target="_blank" rel="noreferrer"><Music size={15} /> 무티고을 <ExternalLink size={12} /></a>
          <a href={MUTIGOEUL_INSTAGRAM_URL} target="_blank" rel="noreferrer"><Camera size={15} /> Instagram <ExternalLink size={12} /></a>
        </div>
      </footer>
    </div>
  );
}
