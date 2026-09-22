-- Run once after signing in. Replace USER_UUID with the id from Authentication -> Users.
-- This assigns records created before authentication to your first account.

update public.documents
set owner_id = 'USER_UUID'
where owner_id is null;

update public.document_activity
set owner_id = 'USER_UUID'
where owner_id is null;

update public.tasks
set owner_id = 'USER_UUID'
where owner_id is null;

update public.executors
set owner_id = 'USER_UUID'
where owner_id is null;

update public.media_plan_rows
set owner_id = 'USER_UUID'
where owner_id is null;

update storage.objects
set owner_id = 'USER_UUID'
where bucket_id = 'documents'
  and owner_id is null;