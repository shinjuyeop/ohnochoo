import { isVoteByMember } from "./songRules";
import type { Decision, Vote } from "../types";

export interface VoteDraft {
  decision: Decision;
  rating: number;
  reason: string;
}

export type VoteSavePlan =
  | { action: "insert"; matching: [] }
  | { action: "unchanged"; matching: [Vote, ...Vote[]] }
  | { action: "update"; primary: Vote; duplicateIds: string[]; matching: [Vote, ...Vote[]] };

export function findMemberVotes(
  votes: Vote[],
  songId: string,
  member: { id: string; name: string },
) {
  return votes.filter((vote) => vote.songId === songId && isVoteByMember(vote, member));
}

export function isSameVote(existing: Vote, draft: VoteDraft) {
  return existing.decision === draft.decision
    && Number(existing.rating) === draft.rating
    && existing.reason.trim() === draft.reason.trim();
}

export function planVoteSave(matching: Vote[], draft: VoteDraft): VoteSavePlan {
  if (!matching.length) return { action: "insert", matching: [] };

  const [primary, ...duplicates] = matching as [Vote, ...Vote[]];
  if (isSameVote(primary, draft) && !duplicates.length) {
    return { action: "unchanged", matching: [primary] };
  }

  return {
    action: "update",
    primary,
    duplicateIds: duplicates.map((vote) => vote.id),
    matching: [primary, ...duplicates],
  };
}
