begin;

alter table public.members
  add column if not exists avatar_url text;

alter table public.members
  add column if not exists avatar_updated_at timestamptz;

drop policy if exists "members_update_avatar" on public.members;
create policy "members_update_avatar"
  on public.members
  for update
  to anon, authenticated
  using (true)
  with check (true);

revoke update on public.members from anon, authenticated;
grant update (avatar_url, avatar_updated_at) on public.members to anon, authenticated;

drop policy if exists "profile_images_select" on storage.objects;
drop policy if exists "profile_images_insert" on storage.objects;
drop policy if exists "profile_images_update" on storage.objects;
drop policy if exists "profile_images_delete" on storage.objects;

create policy "profile_images_select"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'profile-images'
    and storage.filename(name) = 'avatar.webp'
    and exists (
      select 1 from public.members
      where id::text = (storage.foldername(name))[1]
    )
  );

create policy "profile_images_insert"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'profile-images'
    and storage.filename(name) = 'avatar.webp'
    and exists (
      select 1 from public.members
      where id::text = (storage.foldername(name))[1]
    )
  );

create policy "profile_images_update"
  on storage.objects
  for update
  to anon, authenticated
  using (
    bucket_id = 'profile-images'
    and storage.filename(name) = 'avatar.webp'
    and exists (
      select 1 from public.members
      where id::text = (storage.foldername(name))[1]
    )
  )
  with check (
    bucket_id = 'profile-images'
    and storage.filename(name) = 'avatar.webp'
    and exists (
      select 1 from public.members
      where id::text = (storage.foldername(name))[1]
    )
  );

create policy "profile_images_delete"
  on storage.objects
  for delete
  to anon, authenticated
  using (
    bucket_id = 'profile-images'
    and storage.filename(name) = 'avatar.webp'
    and exists (
      select 1 from public.members
      where id::text = (storage.foldername(name))[1]
    )
  );

commit;
