create extension if not exists "pgcrypto";

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  adder text not null,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  "createdAt" timestamptz not null default now()
);

alter table public.members
  add column if not exists avatar_url text;

alter table public.members
  add column if not exists avatar_updated_at timestamptz;

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  "songId" uuid not null references public.songs(id) on delete cascade,
  voter text not null,
  decision text not null check (decision in ('방출', '승격', '보류')),
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5 and rating * 2 = trunc(rating * 2)),
  reason text not null,
  "createdAt" timestamptz not null default now()
);

alter table public.votes
  drop constraint if exists votes_decision_check;

alter table public.votes
  add constraint votes_decision_check
  check (decision in ('방출', '승격', '보류'));

alter table public.votes
  add column if not exists rating numeric(2,1) not null default 0;

alter table public.votes
  drop constraint if exists votes_rating_check;

alter table public.votes
  add constraint votes_rating_check
  check (rating >= 0 and rating <= 5 and rating * 2 = trunc(rating * 2));

create table if not exists public.mutigoeul_songs (
  id uuid primary key default gen_random_uuid(),
  "songId" uuid not null unique references public.songs(id) on delete cascade,
  "createdAt" timestamptz not null default now()
);

alter table public.songs
  add column if not exists "coverImageUrl" text;

alter table public.songs
  add column if not exists adder_member_id uuid references public.members(id) on delete set null;

alter table public.votes
  add column if not exists member_id uuid references public.members(id) on delete set null;

-- 기존 중복 데이터는 가장 최근 평가 하나만 남긴 뒤, 새 중복 생성을 DB에서 차단합니다.
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

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_member_id_idx
  on public.push_subscriptions(member_id);

create index if not exists push_subscriptions_is_active_idx
  on public.push_subscriptions(is_active);

create index if not exists push_subscriptions_active_updated_at_idx
  on public.push_subscriptions(is_active, updated_at);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete cascade,
  type text not null,
  dedupe_key text not null unique,
  title text not null,
  body text not null,
  related_song_id uuid references public.songs(id) on delete set null,
  related_vote_id uuid references public.votes(id) on delete set null,
  sent_at timestamptz not null default now(),
  status text not null default 'sent'
);

create index if not exists notification_logs_member_id_idx
  on public.notification_logs(member_id);

create schema if not exists private;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  member_id uuid not null unique references public.members(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

alter table public.songs enable row level security;
alter table public.members enable row level security;
alter table public.votes enable row level security;
alter table public.mutigoeul_songs enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_logs enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "songs_select" on public.songs;
drop policy if exists "songs_insert" on public.songs;
drop policy if exists "songs_update" on public.songs;
drop policy if exists "songs_delete" on public.songs;
drop policy if exists "members_select" on public.members;
drop policy if exists "members_insert" on public.members;
drop policy if exists "members_update_avatar" on public.members;
drop policy if exists "votes_select" on public.votes;
drop policy if exists "votes_insert" on public.votes;
drop policy if exists "votes_update" on public.votes;
drop policy if exists "votes_delete" on public.votes;
drop policy if exists "mutigoeul_songs_select" on public.mutigoeul_songs;
drop policy if exists "mutigoeul_songs_insert" on public.mutigoeul_songs;
drop policy if exists "push_subscriptions_no_anon_access" on public.push_subscriptions;
drop policy if exists "notification_logs_no_anon_access" on public.notification_logs;
drop policy if exists "admin_users_select_own" on public.admin_users;

create policy "songs_select"
  on public.songs
  for select
  to anon, authenticated
  using (true);

create policy "songs_insert"
  on public.songs
  for insert
  to anon, authenticated
  with check (true);

create policy "songs_update"
  on public.songs
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "songs_delete"
  on public.songs
  for delete
  to authenticated
  using ((select private.is_admin()));

create policy "members_select"
  on public.members
  for select
  to anon, authenticated
  using (true);

create policy "members_insert"
  on public.members
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "members_update_avatar"
  on public.members
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "votes_select"
  on public.votes
  for select
  to anon, authenticated
  using (true);

create policy "votes_insert"
  on public.votes
  for insert
  to anon, authenticated
  with check (true);

create policy "votes_update"
  on public.votes
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "votes_delete"
  on public.votes
  for delete
  to anon, authenticated
  using (true);

create policy "mutigoeul_songs_select"
  on public.mutigoeul_songs
  for select
  to anon, authenticated
  using (true);

create policy "mutigoeul_songs_insert"
  on public.mutigoeul_songs
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "admin_users_select_own"
  on public.admin_users
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;

grant select, insert on public.songs to anon, authenticated;
grant update, delete on public.songs to authenticated;
grant select on public.members to anon, authenticated;
grant insert on public.members to authenticated;
revoke update on public.members from anon, authenticated;
grant update (avatar_url, avatar_updated_at) on public.members to anon, authenticated;
grant select, insert, update, delete on public.votes to anon, authenticated;
grant select on public.mutigoeul_songs to anon, authenticated;
grant insert on public.mutigoeul_songs to authenticated;

create policy "push_subscriptions_no_anon_access"
  on public.push_subscriptions
  for all
  to anon
  using (false)
  with check (false);

create policy "notification_logs_no_anon_access"
  on public.notification_logs
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "profile_images_select" on storage.objects;
drop policy if exists "profile_images_insert" on storage.objects;
drop policy if exists "profile_images_update" on storage.objects;
drop policy if exists "profile_images_delete" on storage.objects;

create policy "profile_images_select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'profile-images' and storage.filename(name) = 'avatar.webp' and exists (
    select 1 from public.members where id::text = (storage.foldername(name))[1]
  ));

create policy "profile_images_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'profile-images' and storage.filename(name) = 'avatar.webp' and exists (
    select 1 from public.members where id::text = (storage.foldername(name))[1]
  ));

create policy "profile_images_update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'profile-images' and storage.filename(name) = 'avatar.webp' and exists (
    select 1 from public.members where id::text = (storage.foldername(name))[1]
  ))
  with check (bucket_id = 'profile-images' and storage.filename(name) = 'avatar.webp' and exists (
    select 1 from public.members where id::text = (storage.foldername(name))[1]
  ));

create policy "profile_images_delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'profile-images' and storage.filename(name) = 'avatar.webp' and exists (
    select 1 from public.members where id::text = (storage.foldername(name))[1]
  ));

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

grant execute on function public.add_song_with_initial_vote(text, text, text, uuid, text, numeric, text) to anon, authenticated;
grant execute on function public.save_member_vote(uuid, text, uuid, text, numeric, text) to anon, authenticated;
