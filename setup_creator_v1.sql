create table if not exists public.creator_draft (
  id integer primary key check (id = 1),
  manifest_json jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_releases (
  version integer primary key,
  manifest_json jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

drop trigger if exists creator_draft_updated_at on public.creator_draft;
create trigger creator_draft_updated_at
before update on public.creator_draft
for each row execute function public.update_updated_at();

alter table public.creator_draft enable row level security;
alter table public.creator_releases enable row level security;

drop policy if exists creator_draft_admin_select on public.creator_draft;
create policy creator_draft_admin_select
on public.creator_draft
for select
using (public.is_admin());

drop policy if exists creator_draft_admin_insert on public.creator_draft;
create policy creator_draft_admin_insert
on public.creator_draft
for insert
with check (public.is_admin());

drop policy if exists creator_draft_admin_update on public.creator_draft;
create policy creator_draft_admin_update
on public.creator_draft
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists creator_releases_read_authenticated on public.creator_releases;
create policy creator_releases_read_authenticated
on public.creator_releases
for select
using (auth.uid() is not null);

drop policy if exists creator_releases_admin_insert on public.creator_releases;
create policy creator_releases_admin_insert
on public.creator_releases
for insert
with check (public.is_admin());

insert into public.creator_draft (id, manifest_json)
values (1, '{}'::jsonb)
on conflict (id) do nothing;
