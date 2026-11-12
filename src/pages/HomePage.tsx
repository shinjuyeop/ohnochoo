import { ArrowRight, Camera, ChevronRight, ExternalLink, Music, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAppUi } from "../app/AppUiContext";
import { SongCarousel } from "../components/SongCarousel";
import { Avatar } from "../components/ui/Avatar";
import { useSongDialog } from "../hooks/useSongDialog";
import { useClubData } from "../hooks/useClubData";
import { useProfile } from "../features/profile/ProfileContext";
import { isSongByMember, isVoteByMember } from "../lib/songRules";
import { ALBUMS_APPLE_MUSIC_URL, MUTIGOEUL_APPLE_MUSIC_URL, MUTIGOEUL_INSTAGRAM_URL, ONOCHU_APPLE_MUSIC_URL } from "../lib/constants";

export function HomePage() {
  const { data, onochuSongs, mutigoeulSongs, albumSongs } = useClubData();
  const { profile } = useProfile();
  const { openAddSong } = useAppUi();
  const { openSong } = useSongDialog();
  const navigate = useNavigate();
  if (!data || !profile) return null;
  const myVotes = data.votes.filter((vote) => isVoteByMember(vote, profile));
  const mine = data.songs.filter((song) => isSongByMember(song, profile)).length;
  const recentOnochoo = [...onochuSongs].reverse().slice(0, 12);
  const recentArchive = [...data.mutigoeulEntries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((entry) => mutigoeulSongs.find((song) => song.id === entry.songId)).filter((song) => song !== undefined).slice(0, 12);
  const recentAlbums = [...albumSongs].reverse().slice(0, 12);

  return (
    <div className="page home-page">
      <h1 className="visually-hidden">홈</h1>
      <header className="page-header mobile-topbar">
        <span className="wordmark">ohnochoo<span className="brand-period">.</span></span>
        <div className="mobile-topbar-actions"><button className="mobile-add-button glass-control" onClick={() => openAddSong()} aria-label="노래 추가"><Plus size={18} /><span>추가</span></button><button className="mobile-profile-button glass-control" onClick={() => navigate("/settings")} aria-label={`${profile.name} 내 정보`}><Avatar name={profile.name} imageUrl={profile.avatar_url} imageVersion={profile.avatar_updated_at} size="sm" /></button></div>
      </header>
      <div className="home-layout">
        <div className="home-main">
          <section className="content-section queue-section home-collection">
            <div className="section-heading queue-heading">
              <h2><Link className="home-section-link" to="/onochoo">오노추 <span className="section-count">{onochuSongs.length}</span><ChevronRight size={22} aria-hidden="true" /></Link></h2>
            </div>
            {recentOnochoo.length ? <SongCarousel songs={recentOnochoo} label="오노추 최근 추가된 곡" onOpen={openSong} /> : <p className="collection-empty">등록된 곡이 없어요.</p>}
          </section>
          <section className="home-collection">
            <div className="section-heading"><h2><Link className="home-section-link" to="/mutigoeul">무티고을 <span className="section-count">{mutigoeulSongs.length}</span><ChevronRight size={22} aria-hidden="true" /></Link></h2></div>
            {recentArchive.length ? <SongCarousel songs={recentArchive} label="무티고을 최근 추가된 곡" onOpen={openSong} /> : <p className="collection-empty">등록된 곡이 없어요.</p>}
          </section>
          <section className="home-collection">
            <div className="section-heading"><h2><Link className="home-section-link" to="/albums">앨범스 <span className="section-count">{albumSongs.length}</span><ChevronRight size={22} aria-hidden="true" /></Link></h2></div>
            {recentAlbums.length ? <SongCarousel songs={recentAlbums} label="앨범스 최근 추가된 앨범" onOpen={openSong} /> : <p className="collection-empty">등록된 앨범이 없어요.</p>}
          </section>
        </div>
        <aside className="home-aside">
          <Link className="records-entry" to="/records">
            <span className="records-entry-heading"><b>방출</b><span className="records-entry-count">{data.songs.filter((song) => song.archived_at).length}곡<ArrowRight size={17} /></span></span>
          </Link>
          <section className="mini-stats">
            <h2>나의 음악 기록</h2>
            <dl><div><dt>추천한 곡</dt><dd>{mine}</dd></div><div><dt>남긴 평가</dt><dd>{myVotes.length}</dd></div></dl>
          </section>
        </aside>
      </div>
      <footer className="home-listening-links" aria-label="외부 링크">
        <div>
          <a href={ONOCHU_APPLE_MUSIC_URL} target="_blank" rel="noreferrer"><Music size={15} /> 오노추 <ExternalLink size={12} /></a>
          <a href={MUTIGOEUL_APPLE_MUSIC_URL} target="_blank" rel="noreferrer"><Music size={15} /> 무티고을 <ExternalLink size={12} /></a>
          <a href={ALBUMS_APPLE_MUSIC_URL} target="_blank" rel="noreferrer"><Music size={15} /> 앨범스 <ExternalLink size={12} /></a>
          <a href={MUTIGOEUL_INSTAGRAM_URL} target="_blank" rel="noreferrer"><Camera size={15} /> Instagram <ExternalLink size={12} /></a>
        </div>
      </footer>
    </div>
  );
}
