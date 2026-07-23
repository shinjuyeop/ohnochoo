begin;

create table if not exists public.vote_replies (
  id uuid primary key default gen_random_uuid(),
  vote_id uuid not null references public.votes(id) on delete cascade,
  author text not null,
  member_id uuid references public.members(id) on delete set null,
  body text not null check (char_length(trim(body)) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists vote_replies_vote_id_created_at_idx
  on public.vote_replies(vote_id, created_at);

alter table public.vote_replies enable row level security;

drop policy if exists "vote_replies_select" on public.vote_replies;
drop policy if exists "vote_replies_insert" on public.vote_replies;

create policy "vote_replies_select"
  on public.vote_replies
  for select
  to anon, authenticated
  using (true);

create policy "vote_replies_insert"
  on public.vote_replies
  for insert
  to anon, authenticated
  with check (true);

grant select, insert on public.vote_replies to anon, authenticated;

commit;
