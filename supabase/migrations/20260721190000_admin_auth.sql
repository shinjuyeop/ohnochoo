begin;

create schema if not exists private;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  member_id uuid not null unique references public.members(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;

drop policy if exists "admin_users_select_own" on public.admin_users;
create policy "admin_users_select_own"
  on public.admin_users
  for select
  to authenticated
  using (user_id = (select auth.uid()));

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

create policy "songs_select"
  on public.songs for select
  to anon, authenticated
  using (true);

create policy "songs_insert"
  on public.songs for insert
  to anon, authenticated
  with check (true);

create policy "songs_delete"
  on public.songs for delete
  to authenticated
  using ((select private.is_admin()));

create policy "members_select"
  on public.members for select
  to anon, authenticated
  using (true);

create policy "members_insert"
  on public.members for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "votes_select"
  on public.votes for select
  to anon, authenticated
  using (true);

create policy "votes_insert"
  on public.votes for insert
  to anon, authenticated
  with check (true);

create policy "votes_update"
  on public.votes for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "votes_delete"
  on public.votes for delete
  to anon, authenticated
  using (true);

create policy "mutigoeul_songs_select"
  on public.mutigoeul_songs for select
  to anon, authenticated
  using (true);

create policy "mutigoeul_songs_insert"
  on public.mutigoeul_songs for insert
  to authenticated
  with check ((select private.is_admin()));

grant select, insert on public.songs to anon, authenticated;
grant delete on public.songs to authenticated;
grant select on public.members to anon, authenticated;
grant insert on public.members to authenticated;
grant select, insert, update, delete on public.votes to anon, authenticated;
grant select on public.mutigoeul_songs to anon, authenticated;
grant insert on public.mutigoeul_songs to authenticated;

grant execute on function public.add_song_with_initial_vote(text, text, text, uuid, text, numeric, text)
  to anon, authenticated;
grant execute on function public.save_member_vote(uuid, text, uuid, text, numeric, text)
  to anon, authenticated;

commit;
