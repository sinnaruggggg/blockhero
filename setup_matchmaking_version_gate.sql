alter table public.rooms
  add column if not exists app_version_code integer,
  add column if not exists app_version_name text;

alter table public.players
  add column if not exists app_version_code integer,
  add column if not exists app_version_name text;

alter table public.matching_queue
  add column if not exists app_version_code integer,
  add column if not exists app_version_name text;

create index if not exists matching_queue_status_version_created_idx
  on public.matching_queue (status, app_version_code, created_at);
