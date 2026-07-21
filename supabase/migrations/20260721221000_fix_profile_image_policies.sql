begin;

drop policy if exists "profile_images_select" on storage.objects;
drop policy if exists "profile_images_insert" on storage.objects;
drop policy if exists "profile_images_update" on storage.objects;
drop policy if exists "profile_images_delete" on storage.objects;

create policy "profile_images_select"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'profile-images'
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/avatar\.webp$'
  );

create policy "profile_images_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'profile-images'
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/avatar\.webp$'
  );

create policy "profile_images_update"
  on storage.objects for update
  to anon, authenticated
  using (
    bucket_id = 'profile-images'
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/avatar\.webp$'
  )
  with check (
    bucket_id = 'profile-images'
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/avatar\.webp$'
  );

create policy "profile_images_delete"
  on storage.objects for delete
  to anon, authenticated
  using (
    bucket_id = 'profile-images'
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/avatar\.webp$'
  );

commit;
