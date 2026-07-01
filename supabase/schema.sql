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

alter table public.songs enable row level security;
alter table public.members enable row level security;
alter table public.votes enable row level security;
alter table public.mutigoeul_songs enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_logs enable row level security;

drop policy if exists "songs_select" on public.songs;
drop policy if exists "songs_insert" on public.songs;
drop policy if exists "songs_delete" on public.songs;
drop policy if exists "members_select" on public.members;
drop policy if exists "members_insert" on public.members;
drop policy if exists "votes_select" on public.votes;
drop policy if exists "votes_insert" on public.votes;
drop policy if exists "votes_update" on public.votes;
drop policy if exists "votes_delete" on public.votes;
drop policy if exists "mutigoeul_songs_select" on public.mutigoeul_songs;
drop policy if exists "mutigoeul_songs_insert" on public.mutigoeul_songs;
drop policy if exists "push_subscriptions_no_anon_access" on public.push_subscriptions;
drop policy if exists "notification_logs_no_anon_access" on public.notification_logs;

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

create policy "votes_update"
  on public.votes
  for update
  to anon
  using (true)
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
