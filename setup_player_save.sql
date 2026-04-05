-- ============================================
-- BlockHero Player Progression Schema
-- Run this in Supabase SQL Editor
-- ============================================

create extension if not exists pgcrypto;

do $$
begin
  create type character_class as enum ('knight', 'mage', 'archer', 'rogue', 'healer');
exception
  when duplicate_object then null;
end $$;

create or replace function public.touch_updated_at_player()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default 'Player',
  avatar_url text,
  selected_character_id character_class,
  account_level integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gold bigint not null default 0,
  diamond bigint not null default 0,
  heart_current integer not null default 10,
  heart_max integer not null default 10,
  heart_last_regen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_inventories (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hammer_count integer not null default 0,
  bomb_count integer not null default 0,
  refresh_count integer not null default 0,
  temporary_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.character_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id character_class not null,
  level integer not null default 1,
  exp bigint not null default 0,
  skill_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, character_id)
);

create table if not exists public.skill_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id character_class not null,
  skill_id text not null,
  tree_type text not null check (tree_type in ('personal', 'party')),
  skill_level integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, character_id, skill_id)
);

create table if not exists public.stage_definitions (
  stage_id integer primary key,
  world_id integer not null,
  chapter_index integer not null,
  stage_number_in_world integer not null,
  stage_name text not null,
  monster_id text not null,
  monster_name text not null,
  monster_type text not null check (monster_type in ('normal', 'elite', 'boss')),
  monster_hp bigint not null,
  monster_attack integer not null,
  attack_interval_sec integer not null,
  reward_gold bigint not null,
  reward_character_exp bigint not null,
  unlocks_boss_raid_stage integer,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.stage_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  stage_id integer not null references public.stage_definitions(stage_id) on delete cascade,
  cleared boolean not null default false,
  total_clears integer not null default 0,
  best_clear_seconds integer,
  last_cleared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, stage_id)
);

create table if not exists public.endless_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  high_score bigint not null default 0,
  total_runs integer not null default 0,
  total_gold_earned bigint not null default 0,
  max_obstacle_tier integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_skins (
  user_id uuid not null references auth.users(id) on delete cascade,
  skin_id text not null,
  equipped boolean not null default false,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, skin_id)
);

create table if not exists public.player_summons (
  user_id uuid not null references auth.users(id) on delete cascade,
  summon_id text not null,
  level integer not null default 1,
  exp bigint not null default 0,
  evolution_tier integer not null default 1,
  active_time_left_sec integer not null default 300,
  primary key (user_id, summon_id)
);

create index if not exists idx_character_progress_user on public.character_progress(user_id);
create index if not exists idx_skill_progress_user on public.skill_progress(user_id);
create index if not exists idx_stage_progress_user on public.stage_progress(user_id);
create index if not exists idx_stage_definitions_world on public.stage_definitions(world_id, stage_id);

drop trigger if exists player_profiles_updated_at on public.player_profiles;
create trigger player_profiles_updated_at
before update on public.player_profiles
for each row execute function public.touch_updated_at_player();

drop trigger if exists player_wallets_updated_at on public.player_wallets;
create trigger player_wallets_updated_at
before update on public.player_wallets
for each row execute function public.touch_updated_at_player();

drop trigger if exists player_inventories_updated_at on public.player_inventories;
create trigger player_inventories_updated_at
before update on public.player_inventories
for each row execute function public.touch_updated_at_player();

drop trigger if exists character_progress_updated_at on public.character_progress;
create trigger character_progress_updated_at
before update on public.character_progress
for each row execute function public.touch_updated_at_player();

drop trigger if exists skill_progress_updated_at on public.skill_progress;
create trigger skill_progress_updated_at
before update on public.skill_progress
for each row execute function public.touch_updated_at_player();

drop trigger if exists stage_progress_updated_at on public.stage_progress;
create trigger stage_progress_updated_at
before update on public.stage_progress
for each row execute function public.touch_updated_at_player();

drop trigger if exists endless_profiles_updated_at on public.endless_profiles;
create trigger endless_profiles_updated_at
before update on public.endless_profiles
for each row execute function public.touch_updated_at_player();

alter table public.player_profiles enable row level security;
alter table public.player_wallets enable row level security;
alter table public.player_inventories enable row level security;
alter table public.character_progress enable row level security;
alter table public.skill_progress enable row level security;
alter table public.stage_definitions enable row level security;
alter table public.stage_progress enable row level security;
alter table public.endless_profiles enable row level security;
alter table public.player_skins enable row level security;
alter table public.player_summons enable row level security;

drop policy if exists player_profiles_select_self on public.player_profiles;
create policy player_profiles_select_self
on public.player_profiles
for select
using (auth.uid() = user_id);

drop policy if exists player_profiles_write_self on public.player_profiles;
create policy player_profiles_write_self
on public.player_profiles
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists player_wallets_self on public.player_wallets;
create policy player_wallets_self
on public.player_wallets
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists player_inventories_self on public.player_inventories;
create policy player_inventories_self
on public.player_inventories
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists character_progress_self on public.character_progress;
create policy character_progress_self
on public.character_progress
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists skill_progress_self on public.skill_progress;
create policy skill_progress_self
on public.skill_progress
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists stage_definitions_read_all on public.stage_definitions;
create policy stage_definitions_read_all
on public.stage_definitions
for select
using (true);

drop policy if exists stage_progress_self on public.stage_progress;
create policy stage_progress_self
on public.stage_progress
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists endless_profiles_self on public.endless_profiles;
create policy endless_profiles_self
on public.endless_profiles
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists player_skins_self on public.player_skins;
create policy player_skins_self
on public.player_skins
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists player_summons_self on public.player_summons;
create policy player_summons_self
on public.player_summons
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
