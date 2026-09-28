begin;

alter table public.songs add column if not exists archived_at timestamptz;
alter table public.songs add column if not exists album_url text;
alter table public.songs add column if not exists album_name text;
alter table public.songs add constraint songs_album_url_check
  check (album_url is null or album_url ~ '^https://music[.]apple[.]com/[a-zA-Z-]+/album/[^?#]+$');
create index if not exists songs_archived_at_idx on public.songs (archived_at desc) where archived_at is not null;

-- All app clients, including older versions, must preserve songs and their children.
drop policy if exists songs_delete on public.songs;
revoke delete on public.songs from anon, authenticated;

create or replace function private.protect_song_history()
returns trigger language plpgsql security definer set search_path = '' as $$
declare promoted integer; released integer;
begin
  if tg_op = 'DELETE' then
    raise exception '곡은 삭제 대신 방출 보관함에 보관해 주세요.';
  end if;
  if tg_op = 'INSERT' then
    if new.archived_at is not null then raise exception '새 곡은 평가 중 상태로 등록해 주세요.'; end if;
    return new;
  end if;
  if old.archived_at is not null then raise exception '보관된 곡의 기록은 변경할 수 없어요.'; end if;
  if new.archived_at is not null then
    if not private.is_admin() then raise exception '관리자만 곡을 보관할 수 있어요.'; end if;
    if exists (select 1 from public.mutigoeul_songs where "songId" = old.id) then
      raise exception '무티고을의 곡은 방출 보관할 수 없어요.';
    end if;
    select count(*) filter (where decision = '승격'), count(*) filter (where decision = '방출')
      into promoted, released from public.votes where "songId" = old.id;
    if old."createdAt" > now() - interval '7 days' or promoted >= released + 3 then
      raise exception '지금 방출 예정인 곡만 보관할 수 있어요. 목록을 새로 확인해 주세요.';
    end if;
    if (to_jsonb(new) - 'archived_at') is distinct from (to_jsonb(old) - 'archived_at') then
      raise exception '곡 정보 변경과 보관은 따로 진행해 주세요.';
    end if;
    new.archived_at := now();
  end if;
  return new;
end;
$$;
revoke all on function private.protect_song_history() from public;
create trigger protect_song_history before insert or update or delete on public.songs
  for each row execute function private.protect_song_history();

-- Serialize votes and final decisions using the same parent row lock.
create or replace function private.protect_closed_votes()
returns trigger language plpgsql security definer set search_path = '' as $$
declare old_id uuid; new_id uuid; target public.songs;
begin
  if tg_op <> 'INSERT' then old_id := old."songId"; end if;
  if tg_op <> 'DELETE' then new_id := new."songId"; end if;
  for target in select * from public.songs where id in (old_id, new_id) order by id for update loop
    if target.archived_at is not null or exists (select 1 from public.mutigoeul_songs where "songId" = target.id) then
      raise exception '평가가 종료된 곡은 평가를 변경할 수 없어요.';
    end if;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.protect_closed_votes() from public;
create trigger protect_closed_votes before insert or update or delete on public.votes
  for each row execute function private.protect_closed_votes();

create or replace function private.protect_archived_replies()
returns trigger language plpgsql security definer set search_path = '' as $$
declare old_vote uuid; new_vote uuid; target public.songs;
begin
  if tg_op <> 'INSERT' then old_vote := old.vote_id; end if;
  if tg_op <> 'DELETE' then new_vote := new.vote_id; end if;
  for target in select s.* from public.songs s where s.id in
    (select "songId" from public.votes where id in (old_vote, new_vote)) order by s.id for update loop
    if target.archived_at is not null then raise exception '보관된 곡의 대화는 변경할 수 없어요.'; end if;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.protect_archived_replies() from public;
create trigger protect_archived_replies before insert or update or delete on public.vote_replies
  for each row execute function private.protect_archived_replies();

create or replace function private.protect_song_promotion()
returns trigger language plpgsql security definer set search_path = '' as $$
declare archived timestamptz;
begin
  select archived_at into archived from public.songs where id = new."songId" for update;
  if archived is not null then raise exception '보관된 곡은 무티고을로 이동할 수 없어요.'; end if;
  return new;
end;
$$;
revoke all on function private.protect_song_promotion() from public;
create trigger protect_song_promotion before insert or update on public.mutigoeul_songs
  for each row execute function private.protect_song_promotion();

create or replace function public.archive_songs(p_song_ids uuid[])
returns integer language plpgsql security invoker set search_path = '' as $$
declare requested integer; found integer;
begin
  if not private.is_admin() then raise exception '관리자만 곡을 보관할 수 있어요.'; end if;
  select count(distinct id) into requested from unnest(p_song_ids) id;
  if requested = 0 then raise exception '보관할 곡을 선택해 주세요.'; end if;
  perform id from public.songs where id = any(p_song_ids) order by id for update;
  select count(*) into found from public.songs where id = any(p_song_ids);
  if found <> requested then raise exception '선택한 곡을 찾을 수 없어요. 목록을 새로 확인해 주세요.'; end if;
  update public.songs set archived_at = now() where id = any(p_song_ids) and archived_at is null;
  -- Retrying an already successful request is safe and preserves the original date.
  return found;
end;
$$;
revoke all on function public.archive_songs(uuid[]) from public, anon;
grant execute on function public.archive_songs(uuid[]) to authenticated;

-- Persist Apple Music metadata in the same transaction as the recommendation.
create or replace function public.add_song_with_metadata(
  p_title text, p_artist text, p_adder text, p_adder_member_id uuid,
  p_cover_image_url text, p_rating numeric, p_reason text, p_album_url text, p_album_name text
)
returns public.songs language plpgsql security invoker set search_path = '' as $$
declare created_song public.songs;
begin
  insert into public.songs (title, artist, adder, adder_member_id, "coverImageUrl", album_url, album_name)
  values (trim(p_title), trim(p_artist), trim(p_adder), p_adder_member_id, p_cover_image_url, p_album_url, p_album_name)
  returning * into created_song;
  insert into public.votes ("songId", voter, member_id, decision, rating, reason)
  values (created_song.id, trim(p_adder), p_adder_member_id, '승격', p_rating, trim(p_reason));
  return created_song;
end;
$$;
revoke all on function public.add_song_with_metadata(text, text, text, uuid, text, numeric, text, text, text) from public;
grant execute on function public.add_song_with_metadata(text, text, text, uuid, text, numeric, text, text, text) to anon, authenticated;

commit;
