alter table if exists media_plan_rows
  add column if not exists attachments jsonb not null default '[]'::jsonb;