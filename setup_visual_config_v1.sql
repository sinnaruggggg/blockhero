create table if not exists public.ui_config_draft (
  id integer primary key check (id = 1),
  config_json jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.ui_config_releases (
  version integer primary key,
  config_json jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.ui_assets (
  asset_key text primary key,
  data_url text not null,
  mime_type text,
  content_hash text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

drop trigger if exists ui_config_draft_updated_at on public.ui_config_draft;
create trigger ui_config_draft_updated_at
before update on public.ui_config_draft
for each row execute function public.update_updated_at();

drop trigger if exists ui_assets_updated_at on public.ui_assets;
create trigger ui_assets_updated_at
before update on public.ui_assets
for each row execute function public.update_updated_at();

alter table public.ui_config_draft enable row level security;
alter table public.ui_config_releases enable row level security;
alter table public.ui_assets enable row level security;

drop policy if exists ui_config_draft_admin_select on public.ui_config_draft;
create policy ui_config_draft_admin_select
on public.ui_config_draft
for select
using (public.is_admin());

drop policy if exists ui_config_draft_admin_insert on public.ui_config_draft;
create policy ui_config_draft_admin_insert
on public.ui_config_draft
for insert
with check (public.is_admin());

drop policy if exists ui_config_draft_admin_update on public.ui_config_draft;
create policy ui_config_draft_admin_update
on public.ui_config_draft
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists ui_config_releases_read_authenticated on public.ui_config_releases;
create policy ui_config_releases_read_authenticated
on public.ui_config_releases
for select
using (auth.uid() is not null);

drop policy if exists ui_config_releases_admin_insert on public.ui_config_releases;
create policy ui_config_releases_admin_insert
on public.ui_config_releases
for insert
with check (public.is_admin());

drop policy if exists ui_assets_read_authenticated on public.ui_assets;
create policy ui_assets_read_authenticated
on public.ui_assets
for select
using (auth.uid() is not null);

drop policy if exists ui_assets_admin_insert on public.ui_assets;
create policy ui_assets_admin_insert
on public.ui_assets
for insert
with check (public.is_admin());

drop policy if exists ui_assets_admin_update on public.ui_assets;
create policy ui_assets_admin_update
on public.ui_assets
for update
using (public.is_admin())
with check (public.is_admin());

insert into public.ui_config_draft (id, config_json)
values (1, '{}'::jsonb)
on conflict (id) do nothing;
