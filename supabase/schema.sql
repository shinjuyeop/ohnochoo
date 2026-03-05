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
  reason text not null,
  "createdAt" timestamptz not null default now()
);

alter table public.songs enable row level security;
alter table public.members enable row level security;
alter table public.votes enable row level security;

drop policy if exists "songs_select" on public.songs;
drop policy if exists "songs_insert" on public.songs;
drop policy if exists "members_select" on public.members;
drop policy if exists "members_insert" on public.members;
drop policy if exists "votes_select" on public.votes;
drop policy if exists "votes_insert" on public.votes;

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
