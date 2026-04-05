-- ============================================
-- BlockHero Economy, Shop, Skin, and Reward Schema
-- Run this in Supabase SQL Editor
-- ============================================

create extension if not exists pgcrypto;

do $$
begin
  create type reward_source as enum (
    'stage_clear',
    'endless_threshold',
    'mission',
    'achievement',
    'raid_clear',
    'shop_refund',
    'gm_grant'
  );
exception
  when duplicate_object then null;
end $$;

create or replace function public.touch_updated_at_rewards()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.shop_items (
  item_id text primary key,
  gold_price integer not null,
  diamond_price integer not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.skin_definitions (
  skin_id text primary key,
  source_boss_id text not null,
  attack_bonus_rate numeric(6,4) not null,
  unique_effect_id text not null,
  summon_id text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.summon_definitions (
  summon_id text primary key,
  base_attack integer not null,
  max_duration_sec integer not null default 300,
  trait_id text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.player_raid_skill_upgrades (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_code text not null,
  upgrade_level integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_code)
);

create table if not exists public.reward_logs (
  reward_log_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source reward_source not null,
  source_ref text,
  gold_delta bigint not null default 0,
  diamond_delta bigint not null default 0,
  item_delta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_reward_logs_user_created on public.reward_logs(user_id, created_at desc);

drop trigger if exists player_raid_skill_upgrades_updated_at on public.player_raid_skill_upgrades;
create trigger player_raid_skill_upgrades_updated_at
before update on public.player_raid_skill_upgrades
for each row execute function public.touch_updated_at_rewards();

drop trigger if exists shop_items_updated_at on public.shop_items;
create trigger shop_items_updated_at
before update on public.shop_items
for each row execute function public.touch_updated_at_rewards();

alter table public.shop_items enable row level security;
alter table public.skin_definitions enable row level security;
alter table public.summon_definitions enable row level security;
alter table public.player_raid_skill_upgrades enable row level security;
alter table public.reward_logs enable row level security;

drop policy if exists shop_items_read_all on public.shop_items;
create policy shop_items_read_all
on public.shop_items
for select
using (true);

drop policy if exists skin_definitions_read_all on public.skin_definitions;
create policy skin_definitions_read_all
on public.skin_definitions
for select
using (true);

drop policy if exists summon_definitions_read_all on public.summon_definitions;
create policy summon_definitions_read_all
on public.summon_definitions
for select
using (true);

drop policy if exists player_raid_skill_upgrades_self on public.player_raid_skill_upgrades;
create policy player_raid_skill_upgrades_self
on public.player_raid_skill_upgrades
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists reward_logs_self on public.reward_logs;
create policy reward_logs_self
on public.reward_logs
for select
using (auth.uid() = user_id);

insert into public.shop_items (item_id, gold_price, diamond_price, is_active)
values
  ('hammer', 800, 4, true),
  ('bomb', 1200, 6, true),
  ('refresh', 1000, 5, true)
on conflict (item_id) do update
set gold_price = excluded.gold_price,
    diamond_price = excluded.diamond_price,
    is_active = excluded.is_active;
