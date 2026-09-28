import type { QueryClient } from "@tanstack/react-query";
import type { ClubData, Song, Vote, VoteReply, VoteSummary } from "../types";
import { isVoteByMember } from "./songRules";

type Discussion = { votes: Vote[]; replies: VoteReply[] };

function replaceVote<T extends VoteSummary>(votes: T[], vote: T) {
  return [...votes.filter((item) => item.id !== vote.id && !(item.songId === vote.songId && isVoteByMember(item, { id: vote.member_id ?? "", name: vote.voter }))), vote];
}

// Apply only server-confirmed writes. Cancel older reads so they cannot undo the result.
export async function cacheSavedVote(client: QueryClient, saved: Vote, song?: Song) {
  const vote = { ...saved, rating: Number(saved.rating) };
  const discussionKey = ["song-discussion", vote.songId];
  await Promise.all([
    client.cancelQueries({ queryKey: ["club-data"] }),
    client.cancelQueries({ queryKey: discussionKey }),
  ]);
  client.setQueryData<ClubData>(["club-data"], (data) => data && ({
    ...data,
    songs: song ? [...data.songs.filter((item) => item.id !== song.id), song] : data.songs,
    votes: replaceVote(data.votes, vote),
  }));
  client.setQueryData<Discussion>(discussionKey, (data) => data && ({
    ...data,
    votes: replaceVote(data.votes, vote).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)),
  }));
  // Refresh on the next visit/focus; saving does not wait for the entire library.
  void client.invalidateQueries({ queryKey: ["club-data"], refetchType: "none" });
  void client.invalidateQueries({ queryKey: discussionKey, refetchType: "none" });
}

export async function cacheSavedReply(client: QueryClient, songId: string, reply: VoteReply) {
  const key = ["song-discussion", songId];
  await client.cancelQueries({ queryKey: key });
  client.setQueryData<Discussion>(key, (data) => data && ({
    ...data,
    replies: [...data.replies.filter((item) => item.id !== reply.id), reply]
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)),
  }));
  void client.invalidateQueries({ queryKey: key, refetchType: "none" });
}
