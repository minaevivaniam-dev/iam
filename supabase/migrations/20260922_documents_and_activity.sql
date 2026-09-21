create extension if not exists pgcrypto;

create table if not exists documents (
  id text primary key,
  task_id text not null,
  title text not null default '',
  content text not null default '',
  uploads jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table documents add column if not exists description text;
alter table documents add column if not exists assignee text;

create table if not exists document_activity (
  id uuid primary key default gen_random_uuid(),
  task_id text not null,
  action text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_documents_task_id
  on documents(task_id);

create index if not exists idx_document_activity_task_id
  on document_activity(task_id);

create index if not exists idx_document_activity_created_at
  on document_activity(created_at desc);

alter table documents enable row level security;
alter table document_activity enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'documents_select_all'
  ) then
    create policy "documents_select_all" on documents for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'documents_insert_all'
  ) then
    create policy "documents_insert_all" on documents for insert with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'documents_update_all'
  ) then
    create policy "documents_update_all" on documents for update using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'documents_delete_all'
  ) then
    create policy "documents_delete_all" on documents for delete using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'document_activity' and policyname = 'document_activity_select_all'
  ) then
    create policy "document_activity_select_all" on document_activity for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'document_activity' and policyname = 'document_activity_insert_all'
  ) then
    create policy "document_activity_insert_all" on document_activity for insert with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'document_activity' and policyname = 'document_activity_update_all'
  ) then
    create policy "document_activity_update_all" on document_activity for update using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'document_activity' and policyname = 'document_activity_delete_all'
  ) then
    create policy "document_activity_delete_all" on document_activity for delete using (true);
  end if;
end $$;

create or replace function update_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_documents_updated_at on documents;
create trigger trg_documents_updated_at
before update on documents
for each row
execute function update_documents_updated_at();
