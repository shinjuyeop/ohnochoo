import { useEffect, useRef } from "react";
import { ExternalLink, LoaderCircle, MessageCircle, Music2, Star, UserRound } from "lucide-react";
import { Dialog } from "./ui/Dialog";
import { SongCover } from "./ui/SongCover";
import { StatusBadge } from "./ui/StatusBadge";
import { StarRating } from "./ui/StarRating";
import { Avatar } from "./ui/Avatar";
import { VoteForm } from "./VoteForm";
import { VoteReplyForm } from "./VoteReplyForm";
import { useClubData, useSongDiscussion } from "../hooks/useClubData";
import { useProfile } from "../features/profile/ProfileContext";
import { averageRating, emptyVoteStats, isVoteByMember } from "../lib/songRules";
import { formatKoreanDate } from "../lib/utils";
import { MUTIGOEUL_APPLE_MUSIC_URL, ONOCHU_APPLE_MUSIC_URL } from "../lib/constants";

export function SongDetailDialog({ songId, focusVoteId, focusReplyId, onOpenChange }: { songId: string | null; focusVoteId?: string | null; focusReplyId?: string | null; onOpenChange: (open: boolean) => void }) {
  const { data, voteStats } = useClubData();
  const { profile } = useProfile();
  const song = data?.songs.find((item) => item.id === songId);
  const discussion = useSongDiscussion(song?.id ?? null);
  const focusTarget = useRef<HTMLDivElement | HTMLElement | null>(null);
  const focused = useRef("");
  useEffect(() => {
    const key = `${songId}:${focusVoteId}:${focusReplyId}`;
    if (!songId) { focused.current = ""; return; }
    if (!discussion.data || focused.current === key || !focusTarget.current) return;
    const frame = requestAnimationFrame(() => {
      focusTarget.current?.scrollIntoView({ block: "center" });
      focusTarget.current?.focus({ preventScroll: true });
      focused.current = key;
    });
    return () => cancelAnimationFrame(frame);
  }, [discussion.data, songId, focusVoteId, focusReplyId]);
  if (!songId || !data) return null;
  if (!song) return <Dialog open onOpenChange={onOpenChange} title="곡을 찾을 수 없어요"><div className="dialog-body"><p>삭제되었거나 더 이상 볼 수 없는 곡이에요.</p><button className="secondary-button" onClick={() => onOpenChange(false)}>목록으로 돌아가기</button></div></Dialog>;
  const allowVote = !data.mutigoeulEntries.some((entry) => entry.songId === song.id);
  const playlistName = allowVote ? "오노추" : "무티고을";
  const playlistUrl = allowVote ? ONOCHU_APPLE_MUSIC_URL : MUTIGOEUL_APPLE_MUSIC_URL;
  const stats = voteStats.get(song.id) ?? emptyVoteStats();
  const sortedVotes = discussion.data?.votes ?? [];
  const existingVote = profile ? sortedVotes.find((vote) => isVoteByMember(vote, profile)) ?? null : null;
  const recommendation = sortedVotes.find((vote) => {
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
        <a className="listen-link" href={playlistUrl} target="_blank" rel="noreferrer"><Music2 size={18} /><span><b>{playlistName} 플레이리스트 열기</b><small>Apple Music에서 열어요</small></span><ExternalLink size={16} /></a>
        <section className="vote-summary">
          <div><b>{stats.promotedCount}</b><span>승격</span></div><div><b>{stats.heldCount}</b><span>보류</span></div><div><b>{stats.releasedCount}</b><span>방출</span></div><div><b>{average === null ? "-" : average.toFixed(1)}</b><span><Star size={13} /> 평균</span></div>
        </section>
        <p className="rating-hint">별점을 남긴 평가만 평균에 포함돼요.</p>
        {discussion.isPending ? <div className="discussion-state" role="status"><LoaderCircle className="spin" size={18} /> 평가를 불러오는 중...</div> : null}
        {discussion.isError ? <div className="discussion-state" role="alert"><p>평가를 불러오지 못했어요. 작성 중인 내용은 이 기기에 보관돼요.</p><button className="secondary-button" onClick={() => void discussion.refetch()}>다시 시도</button></div> : null}
        {recommendation ? <section className="recommendation"><span className="eyebrow">추천한 이유</span><p>“{recommendation.reason}”</p></section> : null}
        {allowVote && discussion.data ? <section className="detail-section"><h3>{existingVote ? "내 평가 수정" : "이 곡 평가하기"}</h3><VoteForm key={`${song.id}:${profile?.id}`} song={song} existingVote={existingVote} /></section> : null}
        {discussion.data ? <section className="detail-section friend-votes">
          <div className="section-heading"><h3>평가</h3><span><MessageCircle size={15} /> {sortedVotes.length}</span></div>
          {sortedVotes.length ? sortedVotes.map((vote) => {
            const voterMember = data.members.find((member) => member.id === vote.member_id || member.name === vote.voter);
            const replies = discussion.data.replies.filter((reply) => reply.vote_id === vote.id);
            const isTargetVote = focusVoteId === vote.id && !replies.some((reply) => reply.id === focusReplyId);
            return (
              <article className={`friend-vote ${isTargetVote ? "notification-target" : ""}`} key={vote.id} tabIndex={isTargetVote ? -1 : undefined} ref={isTargetVote ? (node) => { focusTarget.current = node; } : undefined}>
                <Avatar name={vote.voter} imageUrl={voterMember?.avatar_url} imageVersion={voterMember?.avatar_updated_at} size="vote" />
                <div className="friend-vote-content">
                  <div className="friend-vote-head"><b>{vote.voter}</b><span className={`decision-label decision-label-${vote.decision}`}>{vote.decision}</span><StarRating value={Number(vote.rating)} readOnly /></div>
                  <p>{vote.reason}</p>
                  <div className="friend-vote-actions">
                    <time>{formatKoreanDate(vote.createdAt, true)}</time>
                    {profile ? <VoteReplyForm key={`${vote.id}:${profile.id}`} voteId={vote.id} /> : null}
                  </div>
                  {replies.length ? <div className="vote-replies">{replies.map((reply) => {
                    const authorMember = data.members.find((member) => member.id === reply.member_id || member.name === reply.author);
                    return (
                      <div className={`vote-reply ${focusReplyId === reply.id ? "notification-target" : ""}`} key={reply.id} tabIndex={focusReplyId === reply.id ? -1 : undefined} ref={focusReplyId === reply.id ? (node) => { focusTarget.current = node; } : undefined}>
                        <Avatar name={reply.author} imageUrl={authorMember?.avatar_url} imageVersion={authorMember?.avatar_updated_at} size="sm" />
                        <div><b>{reply.author}</b><p>{reply.body}</p><time>{formatKoreanDate(reply.created_at, true)}</time></div>
                      </div>
                    );
                  })}</div> : null}
                </div>
              </article>
            );
          }) : <div className="empty-inline"><MessageCircle /><p>아직 남겨진 평가가 없어요.</p></div>}
        </section> : null}
      </div>
    </Dialog>
  );
}
