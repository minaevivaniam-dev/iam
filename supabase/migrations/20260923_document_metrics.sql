alter table if exists public.documents
  add column if not exists metrics jsonb not null default '{"startDate": "2026-09-14", "endDate": "2026-09-22", "quality": 10, "cost": 10}'::jsonb;

alter table if exists public.documents
  add column if not exists approval_status text not null default 'draft';