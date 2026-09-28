-- Weekly recommendations are optional; the existing song RPC remains compatible.
create table public.weekly_themes (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique check (extract(isodow from week_start) = 1),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 280),
  created_at timestamptz not null default now()
);
alter table public.weekly_themes enable row level security;
create policy weekly_themes_read on public.weekly_themes
  for select to anon, authenticated using (true);
create policy weekly_themes_admin_insert on public.weekly_themes
  for insert to authenticated with check ((select private.is_admin()));
create policy weekly_themes_admin_update on public.weekly_themes
  for update to authenticated using ((select private.is_admin()))
  with check ((select private.is_admin()));
revoke all on public.weekly_themes from anon, authenticated;
grant select on public.weekly_themes to anon, authenticated;
grant insert, update on public.weekly_themes to authenticated;

alter table public.songs add column weekly_theme_id uuid references public.weekly_themes(id) on delete restrict;
create index songs_weekly_theme_id_idx on public.songs(weekly_theme_id) where weekly_theme_id is not null;

create function public.check_song_weekly_theme()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.weekly_theme_id is null then return new; end if;
  if tg_op = 'UPDATE' then
    if new.weekly_theme_id is not distinct from old.weekly_theme_id then return new; end if;
  end if;
  if not exists (
    select 1 from public.weekly_themes where id = new.weekly_theme_id
      and week_start = date_trunc('week', now() at time zone 'Asia/Seoul')::date
  ) then
    raise exception '이번 주 주제가 바뀌었어요. 주제를 다시 선택해 주세요.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.check_song_weekly_theme() from public;
create trigger songs_check_weekly_theme before insert or update of weekly_theme_id on public.songs
  for each row execute function public.check_song_weekly_theme();

create function public.add_song_with_weekly_theme(
  p_title text, p_artist text, p_adder text, p_adder_member_id uuid,
  p_cover_image_url text, p_rating numeric, p_reason text, p_weekly_theme_id uuid
)
returns public.songs language plpgsql security invoker set search_path = public as $$
declare created_song public.songs;
begin
  if p_weekly_theme_id is null then
    raise exception '이번 주 주제를 선택해 주세요.' using errcode = '23514';
  end if;
  insert into public.songs (title, artist, adder, adder_member_id, "coverImageUrl", weekly_theme_id)
  values (trim(p_title), trim(p_artist), trim(p_adder), p_adder_member_id, p_cover_image_url, p_weekly_theme_id)
  returning * into created_song;
  insert into public.votes ("songId", voter, member_id, decision, rating, reason)
  values (created_song.id, trim(p_adder), p_adder_member_id, '승격', p_rating, trim(p_reason));
  return created_song;
end;
$$;
revoke all on function public.add_song_with_weekly_theme(text, text, text, uuid, text, numeric, text, uuid) from public;
grant execute on function public.add_song_with_weekly_theme(text, text, text, uuid, text, numeric, text, uuid) to anon, authenticated;
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.weekly_themes;
  end if;
end;
$$;
