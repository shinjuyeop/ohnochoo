import { MessageCircle, Star, UserRound } from "lucide-react";
import { Dialog } from "./ui/Dialog";
import { SongCover } from "./ui/SongCover";
import { StatusBadge } from "./ui/StatusBadge";
import { StarRating } from "./ui/StarRating";
import { Avatar } from "./ui/Avatar";
import { VoteForm } from "./VoteForm";
import { useClubData } from "../hooks/useClubData";
import { useProfile } from "../features/profile/ProfileContext";
import { averageRating, emptyVoteStats, isVoteByMember } from "../lib/songRules";
import { formatKoreanDate } from "../lib/utils";

export function SongDetailDialog({ songId, onOpenChange, allowVote = true }: { songId: string | null; onOpenChange: (open: boolean) => void; allowVote?: boolean }) {
  const { data, voteStats } = useClubData();
  const { profile } = useProfile();
  const song = data?.songs.find((item) => item.id === songId);
  if (!song || !data) return null;
  const stats = voteStats.get(song.id) ?? emptyVoteStats();
  const sortedVotes = [...stats.votes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const existingVote = profile ? sortedVotes.find((vote) => isVoteByMember(vote, profile)) ?? null : null;
  const recommendation = stats.votes.find((vote) => {
    if (song.adder_member_id && vote.member_id) return vote.member_id === song.adder_member_id;
    return vote.voter === song.adder;
  });
  const average = averageRating(stats.votes);

  return (
    <Dialog open={Boolean(songId)} onOpenChange={onOpenChange} title="곡 상세" className="song-detail-dialog">
      <div className="dialog-body song-detail-body">
        <section className="song-hero">
          <SongCover song={song} eager />
          <div className="song-hero-info">{allowVote ? <StatusBadge song={song} stats={stats} /> : null}<h2>{song.title}</h2><p>{song.artist}</p><small><UserRound size={14} /> {song.adder} · {formatKoreanDate(song.createdAt)}</small></div>
        </section>
        <section className="vote-summary">
          <div><b>{stats.promotedCount}</b><span>승격</span></div><div><b>{stats.heldCount}</b><span>보류</span></div><div><b>{stats.releasedCount}</b><span>방출</span></div><div><b>{average === null ? "-" : average.toFixed(1)}</b><span><Star size={13} /> 평균</span></div>
        </section>
        {recommendation ? <section className="recommendation"><span className="eyebrow">추천한 이유</span><p>“{recommendation.reason}”</p></section> : null}
        {allowVote ? <section className="detail-section"><h3>{existingVote ? "내 평가 수정" : "이 곡 평가하기"}</h3><VoteForm song={song} votes={data.votes} existingVote={existingVote} /></section> : null}
        <section className="detail-section friend-votes">
          <div className="section-heading"><h3>평가</h3><span><MessageCircle size={15} /> {sortedVotes.length}</span></div>
          {sortedVotes.length ? sortedVotes.map((vote) => {
            const voterMember = data.members.find((member) => member.id === vote.member_id || member.name === vote.voter);
            return (
              <article className="friend-vote" key={vote.id}>
                <Avatar name={vote.voter} imageUrl={voterMember?.avatar_url} imageVersion={voterMember?.avatar_updated_at} size="vote" />
                <div><div className="friend-vote-head"><b>{vote.voter}</b><span className={`decision-label decision-label-${vote.decision}`}>{vote.decision}</span><StarRating value={Number(vote.rating)} readOnly /></div><p>{vote.reason}</p><time>{formatKoreanDate(vote.createdAt, true)}</time></div>
              </article>
            );
          }) : <div className="empty-inline"><MessageCircle /><p>아직 남겨진 평가가 없어요.</p></div>}
        </section>
      </div>
    </Dialog>
  );
}
