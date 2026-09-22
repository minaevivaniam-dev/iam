-- Run this if Supabase shows: "Database error creating new user".

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  requested_role text := lower(coalesce(new.raw_user_meta_data->>'role', 'client'));
  profile_email text := coalesce(nullif(trim(new.email), ''), new.id::text || '@fc-bas.local');
begin
  if requested_role not in ('manager', 'copywriter', 'designer', 'client') then
    requested_role := 'client';
  end if;

  insert into public.profiles (id, email, role)
  values (new.id, profile_email, requested_role)
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles alter column email set default '';

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles for insert to authenticated
  with check (id = auth.uid());