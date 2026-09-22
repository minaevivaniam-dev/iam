-- Run after enabling Email auth in Supabase Authentication settings.

alter table if exists public.documents
  add column if not exists owner_id uuid references auth.users(id);
alter table if exists public.document_activity
  add column if not exists owner_id uuid references auth.users(id);
alter table if exists public.tasks
  add column if not exists owner_id uuid references auth.users(id);
alter table if exists public.executors
  add column if not exists owner_id uuid references auth.users(id);
alter table if exists public.media_plan_rows
  add column if not exists owner_id uuid references auth.users(id);

alter table if exists public.documents alter column owner_id set default auth.uid();
alter table if exists public.document_activity alter column owner_id set default auth.uid();
alter table if exists public.tasks alter column owner_id set default auth.uid();
alter table if exists public.executors alter column owner_id set default auth.uid();
alter table if exists public.media_plan_rows alter column owner_id set default auth.uid();

-- Remove the previous anonymous/open policies before adding owner-scoped policies.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('documents', 'document_activity', 'tasks', 'executors', 'media_plan_rows')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end $$;

do $$
begin
  if to_regclass('public.documents') is not null then
    create policy documents_select_own on public.documents for select to authenticated using (owner_id = auth.uid());
    create policy documents_insert_own on public.documents for insert to authenticated with check (owner_id = auth.uid());
    create policy documents_update_own on public.documents for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
    create policy documents_delete_own on public.documents for delete to authenticated using (owner_id = auth.uid());
  end if;

  if to_regclass('public.document_activity') is not null then
    create policy document_activity_select_own on public.document_activity for select to authenticated using (owner_id = auth.uid());
    create policy document_activity_insert_own on public.document_activity for insert to authenticated with check (owner_id = auth.uid());
    create policy document_activity_update_own on public.document_activity for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
    create policy document_activity_delete_own on public.document_activity for delete to authenticated using (owner_id = auth.uid());
  end if;

  if to_regclass('public.tasks') is not null then
    create policy tasks_select_own on public.tasks for select to authenticated using (owner_id = auth.uid());
    create policy tasks_insert_own on public.tasks for insert to authenticated with check (owner_id = auth.uid());
    create policy tasks_update_own on public.tasks for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
    create policy tasks_delete_own on public.tasks for delete to authenticated using (owner_id = auth.uid());
  end if;

  if to_regclass('public.executors') is not null then
    create policy executors_select_own on public.executors for select to authenticated using (owner_id = auth.uid());
    create policy executors_insert_own on public.executors for insert to authenticated with check (owner_id = auth.uid());
    create policy executors_update_own on public.executors for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
    create policy executors_delete_own on public.executors for delete to authenticated using (owner_id = auth.uid());
  end if;

  if to_regclass('public.media_plan_rows') is not null then
    create policy media_plan_rows_select_own on public.media_plan_rows for select to authenticated using (owner_id = auth.uid());
    create policy media_plan_rows_insert_own on public.media_plan_rows for insert to authenticated with check (owner_id = auth.uid());
    create policy media_plan_rows_update_own on public.media_plan_rows for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
    create policy media_plan_rows_delete_own on public.media_plan_rows for delete to authenticated using (owner_id = auth.uid());
  end if;
end $$;

update storage.buckets
set public = false
where id = 'documents';

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename in ('objects', 'buckets')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end $$;

create policy storage_documents_select_own
  on storage.objects for select to authenticated
  using (bucket_id = 'documents' and owner_id = auth.uid()::text);

create policy storage_documents_insert_own
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and owner_id = auth.uid()::text);

create policy storage_documents_update_own
  on storage.objects for update to authenticated
  using (bucket_id = 'documents' and owner_id = auth.uid()::text)
  with check (bucket_id = 'documents' and owner_id = auth.uid()::text);

create policy storage_documents_delete_own
  on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and owner_id = auth.uid()::text);

create policy storage_documents_bucket_select
  on storage.buckets for select to authenticated
  using (id = 'documents');

-- Existing rows have no owner. After creating your first account, replace the UUID below
-- with that account's id from Authentication -> Users, then run these statements once:
-- update public.documents set owner_id = 'USER_UUID' where owner_id is null;
-- update public.document_activity set owner_id = 'USER_UUID' where owner_id is null;
-- update public.tasks set owner_id = 'USER_UUID' where owner_id is null;
-- update public.executors set owner_id = 'USER_UUID' where owner_id is null;
-- update public.media_plan_rows set owner_id = 'USER_UUID' where owner_id is null;
