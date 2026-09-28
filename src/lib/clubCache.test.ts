import { QueryClient } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { cacheSavedReply, cacheSavedVote } from "./clubCache";
import type { ClubData, Vote } from "../types";

const vote: Vote = { id: "vote", songId: "song", voter: "지우", member_id: "member", decision: "승격", rating: 4.5, reason: "저장한 평가", createdAt: "2026-09-28T00:00:00Z" };

it("updates confirmed votes without losing other songs or duplicating legacy evaluations", async () => {
  const client = new QueryClient();
  const other = { ...vote, id: "other", songId: "other-song" };
  client.setQueryData<ClubData>(["club-data"], { songs: [], members: [], mutigoeulEntries: [], votes: [{ ...vote, id: "legacy", member_id: null, rating: 2 }, other] });
  client.setQueryData(["song-discussion", "song"], { votes: [{ ...vote, rating: 2 }], replies: [{ id: "existing-reply" }] });
  await cacheSavedVote(client, vote);
  await cacheSavedVote(client, vote);
  expect(client.getQueryData<ClubData>(["club-data"])!.votes).toEqual([other, vote]);
  expect(client.getQueryData(["song-discussion", "song"])).toEqual({ votes: [vote], replies: [{ id: "existing-reply" }] });
  client.clear();
});

it("cancels an older in-flight read before applying a saved vote", async () => {
  const client = new QueryClient();
  client.setQueryData<ClubData>(["club-data"], { songs: [], votes: [], members: [], mutigoeulEntries: [] });
  let finish!: (value: ClubData) => void;
  const read = client.fetchQuery({ queryKey: ["club-data"], queryFn: () => new Promise<ClubData>((resolve) => { finish = resolve; }) }).catch(() => undefined);
  await cacheSavedVote(client, vote);
  finish({ songs: [], votes: [], members: [], mutigoeulEntries: [] });
  await read;
  expect(client.getQueryData<ClubData>(["club-data"])!.votes).toEqual([vote]);
  client.clear();
});

it("updates replies only in the relevant discussion and never invents an unloaded discussion", async () => {
  const client = new QueryClient();
  client.setQueryData(["song-discussion", "song"], { votes: [vote], replies: [] });
  const reply = { id: "reply", vote_id: vote.id, author: "서연", member_id: "other-member", body: "답글", created_at: vote.createdAt };
  await cacheSavedReply(client, "song", reply);
  await cacheSavedReply(client, "song", reply);
  expect(client.getQueryData(["song-discussion", "song"])).toEqual({ votes: [vote], replies: [reply] });
  await cacheSavedVote(client, { ...vote, songId: "unloaded" });
  expect(client.getQueryData(["song-discussion", "unloaded"])).toBeUndefined();
  client.clear();
});
