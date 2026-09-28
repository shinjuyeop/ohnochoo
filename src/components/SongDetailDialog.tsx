import { useEffect, useRef, useState } from "react";
import { LoaderCircle, MessageCircle, Star, UserRound } from "lucide-react";
import { Dialog } from "./ui/Dialog";
import { SongCover } from "./ui/SongCover";
import { SongAlbumLink } from "./SongAlbumLink";
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
import { ReviewProgress } from "./ReviewProgress";
import { useReviewSession } from "../app/ReviewSessionContext";

export function SongDetailDialog({ songId, open = true, focusVoteId, focusReplyId, onOpenChange }: { songId: string | null; open?: boolean; focusVoteId?: string | null; focusReplyId?: string | null; onOpenChange: (open: boolean) => void }) {
  const { data, voteStats } = useClubData();
  const { profile } = useProfile();
  const review = useReviewSession();
  const [editingSavedVote, setEditingSavedVote] = useState(false);
  const song = data?.songs.find((item) => item.id === songId);
  const discussion = useSongDiscussion(song?.id ?? null, open);
  const focusTarget = useRef<HTMLDivElement | HTMLElement | null>(null);
  const focused = useRef("");
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0; setEditingSavedVote(false); }, [songId]);
  useEffect(() => {
    const key = `${songId}:${focusVoteId}:${focusReplyId}`;
    if (!songId || !open) { focused.current = ""; return; }
    if (!discussion.data || focused.current === key || !focusTarget.current) return;
    const frame = requestAnimationFrame(() => {
      focusTarget.current?.scrollIntoView({ block: "center" });
      focusTarget.current?.focus({ preventScroll: true });
      focused.current = key;
    });
    return () => cancelAnimationFrame(frame);
  }, [discussion.data, songId, open, focusVoteId, focusReplyId]);
  if (!songId || !data) return null;
  if (!song) return <Dialog open={open} onOpenChange={onOpenChange} title="곡을 찾을 수 없어요"><div className="dialog-body"><p>삭제되었거나 더 이상 볼 수 없는 곡이에요.</p><button className="secondary-button" onClick={() => onOpenChange(false)}>목록으로 돌아가기</button></div></Dialog>;
  const archived = Boolean(song.archived_at);
  const promoted = data.mutigoeulEntries.some((entry) => entry.songId === song.id);
  const allowVote = !archived && !promoted;
  const playlistName = promoted ? "무티고을" : "오노추";
  const playlistUrl = promoted ? MUTIGOEUL_APPLE_MUSIC_URL : ONOCHU_APPLE_MUSIC_URL;
  const stats = voteStats.get(song.id) ?? emptyVoteStats();
  const sortedVotes = discussion.data?.votes ?? [];
  const existingVote = profile ? sortedVotes.find((vote) => isVoteByMember(vote, profile)) ?? null : null;
  const recommendation = sortedVotes.find((vote) => {
    if (song.adder_member_id && vote.member_id) return vote.member_id === song.adder_member_id;
    return vote.voter === song.adder;
  });
  const average = averageRating(stats.votes);

  return (
    <Dialog open={open && Boolean(songId)} onOpenChange={onOpenChange} title="곡 상세" description={`${song.title} · ${song.artist}`} className="song-detail-dialog">
      <div className="dialog-body song-detail-body" ref={bodyRef}>
        <section className="song-hero">
          <SongCover song={song} eager />
          <div className="song-hero-info">{allowVote ? <StatusBadge song={song} stats={stats} /> : null}<h2>{song.title}</h2><p>{song.artist}</p><small><UserRound size={14} /> {song.adder} · {formatKoreanDate(song.createdAt)}</small></div>
        </section>
        <SongAlbumLink song={song} playlistUrl={playlistUrl} playlistName={playlistName} />
        {archived ? <p className="archived-notice">{formatKoreanDate(song.archived_at!)} 방출 · 당시 평가와 대화를 보관하고 있어요.</p> : null}
        <section className="vote-summary">
          <div className="summary-promote"><b>{stats.promotedCount}</b><span>승격</span></div><div><b>{stats.heldCount}</b><span>보류</span></div><div className="summary-release"><b>{stats.releasedCount}</b><span>방출</span></div><div><b>{average === null ? "-" : average.toFixed(1)}</b><span><Star size={13} /> 평균</span></div>
        </section>
        <p className="rating-hint">별점을 남긴 평가만 평균에 포함돼요.</p>
        {discussion.isPending ? <div className="discussion-state" role="status"><LoaderCircle className="spin" size={18} /> 평가를 불러오는 중...</div> : null}
        {discussion.isError ? <div className="discussion-state" role="alert"><p>평가를 불러오지 못했어요. 작성 중인 내용은 이 기기에 보관돼요.</p><button className="secondary-button" onClick={() => void discussion.refetch()}>다시 시도</button></div> : null}
        {recommendation ? <section className="recommendation"><span className="eyebrow">추천한 이유</span><p>“{recommendation.reason}”</p></section> : null}
        {allowVote && discussion.data ? existingVote && review.session?.completed.includes(song.id) && !editingSavedVote ? <section className="saved-review-summary"><div><span>내 평가</span><b>{existingVote.decision}{Number(existingVote.rating) > 0 ? ` · ${Number(existingVote.rating).toFixed(1)}점` : ""}</b></div><button className="text-button" onClick={() => setEditingSavedVote(true)}>평가 수정하기</button></section> : <section className="detail-section"><h3>{existingVote ? "내 평가 수정" : "이 곡 평가하기"}</h3><VoteForm key={`${song.id}:${profile?.id}`} song={song} existingVote={existingVote} onSaved={(result) => { review.saved(song.id, result.isNew); setEditingSavedVote(false); }} /></section> : null}
        <ReviewProgress songId={song.id} />
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
                    {profile && !archived ? <VoteReplyForm key={`${vote.id}:${profile.id}`} voteId={vote.id} /> : null}
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
