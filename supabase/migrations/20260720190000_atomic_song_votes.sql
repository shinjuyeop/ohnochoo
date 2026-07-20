begin;

-- 동일한 곡에 같은 프로필이 남긴 중복 평가는 가장 최근 항목만 유지합니다.
with ranked_votes as (
  select id, row_number() over (
    partition by "songId", member_id
    order by "createdAt" desc, id desc
  ) as row_number
  from public.votes
  where member_id is not null
)
delete from public.votes
where id in (select id from ranked_votes where row_number > 1);

with ranked_legacy_votes as (
  select id, row_number() over (
    partition by "songId", voter
    order by "createdAt" desc, id desc
  ) as row_number
  from public.votes
  where member_id is null
)
delete from public.votes
where id in (select id from ranked_legacy_votes where row_number > 1);

create unique index if not exists votes_song_member_unique
  on public.votes ("songId", member_id)
  where member_id is not null;

create unique index if not exists votes_song_legacy_voter_unique
  on public.votes ("songId", voter)
  where member_id is null;

create or replace function public.add_song_with_initial_vote(
  p_title text,
  p_artist text,
  p_adder text,
  p_adder_member_id uuid,
  p_cover_image_url text,
  p_rating numeric,
  p_reason text
)
returns public.songs
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_song public.songs;
begin
  insert into public.songs (title, artist, adder, adder_member_id, "coverImageUrl")
  values (trim(p_title), trim(p_artist), trim(p_adder), p_adder_member_id, p_cover_image_url)
  returning * into created_song;

  insert into public.votes ("songId", voter, member_id, decision, rating, reason)
  values (created_song.id, trim(p_adder), p_adder_member_id, '승격', p_rating, trim(p_reason));

  return created_song;
end;
$$;

create or replace function public.save_member_vote(
  p_song_id uuid,
  p_voter text,
  p_member_id uuid,
  p_decision text,
  p_rating numeric,
  p_reason text
)
returns table (vote_id uuid, is_new boolean, changed boolean)
language plpgsql
security invoker
set search_path = public
as $$
declare
  existing_vote public.votes;
  normalized_reason text := trim(p_reason);
  needs_update boolean;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(p_song_id::text || ':' || coalesce(p_member_id::text, trim(p_voter)), 0)
  );

  if p_decision not in ('승격', '보류', '방출') then
    raise exception '올바르지 않은 평가 결정입니다.';
  end if;

  select vote.* into existing_vote
  from public.votes as vote
  where vote."songId" = p_song_id
    and (
      (p_member_id is not null and (vote.member_id = p_member_id or (vote.member_id is null and vote.voter = p_voter)))
      or (p_member_id is null and vote.member_id is null and vote.voter = p_voter)
    )
  order by (vote.member_id = p_member_id) desc nulls last, vote."createdAt" desc, vote.id desc
  limit 1
  for update;

  if existing_vote.id is null then
    insert into public.votes ("songId", voter, member_id, decision, rating, reason)
    values (p_song_id, trim(p_voter), p_member_id, p_decision, p_rating, normalized_reason)
    returning id into vote_id;
    is_new := true;
    changed := true;
    return next;
    return;
  end if;

  changed := existing_vote.decision is distinct from p_decision
    or existing_vote.rating is distinct from p_rating
    or trim(existing_vote.reason) is distinct from normalized_reason;
  needs_update := changed
    or existing_vote.member_id is distinct from p_member_id
    or existing_vote.voter is distinct from trim(p_voter);

  if needs_update then
    update public.votes
    set voter = trim(p_voter),
        member_id = p_member_id,
        decision = p_decision,
        rating = p_rating,
        reason = normalized_reason
    where id = existing_vote.id;
  end if;

  delete from public.votes as duplicate
  where duplicate."songId" = p_song_id
    and duplicate.id <> existing_vote.id
    and (
      (p_member_id is not null and (duplicate.member_id = p_member_id or (duplicate.member_id is null and duplicate.voter = p_voter)))
      or (p_member_id is null and duplicate.member_id is null and duplicate.voter = p_voter)
    );

  vote_id := existing_vote.id;
  is_new := false;
  return next;
end;
$$;

grant execute on function public.add_song_with_initial_vote(text, text, text, uuid, text, numeric, text) to anon;
grant execute on function public.save_member_vote(uuid, text, uuid, text, numeric, text) to anon;

commit;
