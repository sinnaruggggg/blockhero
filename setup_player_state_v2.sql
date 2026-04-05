-- ============================================
-- BlockHero unified player state storage
-- Run this in Supabase SQL Editor
-- ============================================

create or replace function public.touch_updated_at_player_state()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.profiles
  add column if not exists title text;

create table if not exists public.player_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  game_data jsonb not null default '{}'::jsonb,
  level_progress jsonb not null default '{}'::jsonb,
  endless_stats jsonb not null default '{}'::jsonb,
  daily_stats jsonb not null default '{}'::jsonb,
  mission_data jsonb not null default '{}'::jsonb,
  achievement_data jsonb not null default '{}'::jsonb,
  skin_data jsonb not null default '{}'::jsonb,
  selected_character_id text,
  character_data jsonb not null default '{}'::jsonb,
  normal_raid_progress jsonb not null default '{}'::jsonb,
  codex_data jsonb not null default '{}'::jsonb,
  unlocked_titles jsonb not null default '[]'::jsonb,
  active_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists player_state_updated_at on public.player_state;
create trigger player_state_updated_at
before update on public.player_state
for each row execute function public.touch_updated_at_player_state();

alter table public.player_state enable row level security;

drop policy if exists player_state_self on public.player_state;
create policy player_state_self
on public.player_state
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
