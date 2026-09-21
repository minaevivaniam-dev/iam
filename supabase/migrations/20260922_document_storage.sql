insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', true, 52428800, null)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_objects_select_all'
  ) then
    create policy "storage_objects_select_all"
      on storage.objects
      for select
      using ( true );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_objects_insert_all'
  ) then
    create policy "storage_objects_insert_all"
      on storage.objects
      for insert
      with check ( true );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_objects_update_all'
  ) then
    create policy "storage_objects_update_all"
      on storage.objects
      for update
      using ( true )
      with check ( true );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_objects_delete_all'
  ) then
    create policy "storage_objects_delete_all"
      on storage.objects
      for delete
      using ( true );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'buckets' and policyname = 'storage_buckets_select_all'
  ) then
    create policy "storage_buckets_select_all"
      on storage.buckets
      for select
      using ( true );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'buckets' and policyname = 'storage_buckets_insert_all'
  ) then
    create policy "storage_buckets_insert_all"
      on storage.buckets
      for insert
      with check ( true );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'buckets' and policyname = 'storage_buckets_update_all'
  ) then
    create policy "storage_buckets_update_all"
      on storage.buckets
      for update
      using ( true )
      with check ( true );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'buckets' and policyname = 'storage_buckets_delete_all'
  ) then
    create policy "storage_buckets_delete_all"
      on storage.buckets
      for delete
      using ( true );
  end if;
end $$;
