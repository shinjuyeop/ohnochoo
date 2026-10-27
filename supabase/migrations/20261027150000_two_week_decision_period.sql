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
    if old."createdAt" > now() - interval '14 days' or promoted >= released + 3 then
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

