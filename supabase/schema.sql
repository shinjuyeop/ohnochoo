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

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  "songId" uuid not null references public.songs(id) on delete cascade,
  voter text not null,
  decision text not null check (decision in ('방출', '승격')),
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5 and rating * 2 = trunc(rating * 2)),
  reason text not null,
  "createdAt" timestamptz not null default now()
);

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

alter table public.songs enable row level security;
alter table public.members enable row level security;
alter table public.votes enable row level security;
alter table public.mutigoeul_songs enable row level security;

drop policy if exists "songs_select" on public.songs;
drop policy if exists "songs_insert" on public.songs;
drop policy if exists "songs_delete" on public.songs;
drop policy if exists "members_select" on public.members;
drop policy if exists "members_insert" on public.members;
drop policy if exists "votes_select" on public.votes;
drop policy if exists "votes_insert" on public.votes;
drop policy if exists "votes_delete" on public.votes;
drop policy if exists "mutigoeul_songs_select" on public.mutigoeul_songs;
drop policy if exists "mutigoeul_songs_insert" on public.mutigoeul_songs;

create policy "songs_select"
  on public.songs
  for select
  to anon
  using (true);

create policy "songs_insert"
  on public.songs
  for insert
  to anon
  with check (true);

create policy "songs_delete"
  on public.songs
  for delete
  to anon
  using (true);

create policy "members_select"
  on public.members
  for select
  to anon
  using (true);

create policy "members_insert"
  on public.members
  for insert
  to anon
  with check (true);

create policy "votes_select"
  on public.votes
  for select
  to anon
  using (true);

create policy "votes_insert"
  on public.votes
  for insert
  to anon
  with check (true);

create policy "votes_delete"
  on public.votes
  for delete
  to anon
  using (true);

create policy "mutigoeul_songs_select"
  on public.mutigoeul_songs
  for select
  to anon
  using (true);

create policy "mutigoeul_songs_insert"
  on public.mutigoeul_songs
  for insert
  to anon
  with check (true);
