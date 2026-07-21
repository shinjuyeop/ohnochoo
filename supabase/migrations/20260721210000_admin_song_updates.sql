begin;

drop policy if exists "songs_update" on public.songs;

create policy "songs_update"
  on public.songs
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

revoke update on public.songs from anon;
grant update on public.songs to authenticated;

commit;
