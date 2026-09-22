alter table if exists public.documents
  add column if not exists metrics jsonb not null default '{"time": 1, "quality": 1, "cost": 1}'::jsonb;