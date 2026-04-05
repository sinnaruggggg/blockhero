-- ============================================
-- BlockHero Party and Raid Schema
-- Run this in Supabase SQL Editor
-- ============================================

create extension if not exists pgcrypto;

do $$
begin
  create type character_class as enum ('knight', 'mage', 'archer', 'rogue', 'healer');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type party_status as enum ('recruiting', 'ready', 'in_run', 'closed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type lobby_scope as enum ('global_party', 'party_room', 'normal_raid_lobby', 'boss_raid_lobby');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type raid_instance_status as enum ('waiting', 'active', 'defeated', 'failed', 'expired');
exception
  when duplicate_object then null;
end $$;

create or replace function public.touch_updated_at_raid()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.party_rooms (
  party_id uuid primary key default gen_random_uuid(),
  leader_user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  target_activity text,
  status party_status not null default 'recruiting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.party_members (
  party_id uuid not null references public.party_rooms(party_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id character_class not null,
  is_voice_enabled boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (party_id, user_id)
);

create table if not exists public.lobby_channels (
  channel_id uuid primary key default gen_random_uuid(),
  scope lobby_scope not null,
  scope_ref text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  message_id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.lobby_channels(channel_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.voice_sessions (
  voice_session_id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.party_rooms(party_id) on delete cascade,
  signaling_state jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.normal_raid_bosses (
  boss_id text primary key,
  stage integer not null unique,
  name text not null,
  skin_id text not null,
  first_clear_diamond_reward integer not null,
  repeat_diamond_reward integer not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.normal_raid_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  boss_id text not null references public.normal_raid_bosses(boss_id) on delete cascade,
  total_kills integer not null default 0,
  first_clear_at timestamptz,
  last_kill_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, boss_id)
);

create table if not exists public.boss_raid_windows (
  window_id uuid primary key default gen_random_uuid(),
  boss_stage integer not null,
  open_at timestamptz not null,
  join_close_at timestamptz not null,
  status raid_instance_status not null default 'waiting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boss_raid_instances (
  instance_id uuid primary key default gen_random_uuid(),
  window_id uuid not null references public.boss_raid_windows(window_id) on delete cascade,
  room_index integer not null,
  boss_stage integer not null,
  boss_current_hp bigint not null,
  boss_max_hp bigint not null,
  participant_cap integer not null default 30,
  participant_count integer not null default 0,
  status raid_instance_status not null default 'waiting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (window_id, room_index)
);

create table if not exists public.boss_raid_participants (
  instance_id uuid not null references public.boss_raid_instances(instance_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  character_id character_class not null,
  total_damage bigint not null default 0,
  rank_hint integer,
  is_alive boolean not null default true,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (instance_id, user_id)
);

create index if not exists idx_party_members_user on public.party_members(user_id);
create index if not exists idx_chat_messages_channel_created on public.chat_messages(channel_id, created_at desc);
create index if not exists idx_normal_raid_progress_user on public.normal_raid_progress(user_id);
create index if not exists idx_boss_raid_windows_stage on public.boss_raid_windows(boss_stage, open_at desc);
create index if not exists idx_boss_raid_instances_window on public.boss_raid_instances(window_id);
create index if not exists idx_boss_raid_participants_rank on public.boss_raid_participants(instance_id, total_damage desc);

drop trigger if exists party_rooms_updated_at on public.party_rooms;
create trigger party_rooms_updated_at
before update on public.party_rooms
for each row execute function public.touch_updated_at_raid();

drop trigger if exists voice_sessions_updated_at on public.voice_sessions;
create trigger voice_sessions_updated_at
before update on public.voice_sessions
for each row execute function public.touch_updated_at_raid();

drop trigger if exists normal_raid_progress_updated_at on public.normal_raid_progress;
create trigger normal_raid_progress_updated_at
before update on public.normal_raid_progress
for each row execute function public.touch_updated_at_raid();

drop trigger if exists boss_raid_windows_updated_at on public.boss_raid_windows;
create trigger boss_raid_windows_updated_at
before update on public.boss_raid_windows
for each row execute function public.touch_updated_at_raid();

drop trigger if exists boss_raid_instances_updated_at on public.boss_raid_instances;
create trigger boss_raid_instances_updated_at
before update on public.boss_raid_instances
for each row execute function public.touch_updated_at_raid();

drop trigger if exists boss_raid_participants_updated_at on public.boss_raid_participants;
create trigger boss_raid_participants_updated_at
before update on public.boss_raid_participants
for each row execute function public.touch_updated_at_raid();

alter table public.party_rooms enable row level security;
alter table public.party_members enable row level security;
alter table public.lobby_channels enable row level security;
alter table public.chat_messages enable row level security;
alter table public.voice_sessions enable row level security;
alter table public.normal_raid_bosses enable row level security;
alter table public.normal_raid_progress enable row level security;
alter table public.boss_raid_windows enable row level security;
alter table public.boss_raid_instances enable row level security;
alter table public.boss_raid_participants enable row level security;

drop policy if exists party_rooms_read_all on public.party_rooms;
create policy party_rooms_read_all
on public.party_rooms
for select
using (true);

drop policy if exists party_rooms_leader_write on public.party_rooms;
create policy party_rooms_leader_write
on public.party_rooms
for all
using (auth.uid() = leader_user_id)
with check (auth.uid() = leader_user_id);

drop policy if exists party_members_read_all on public.party_members;
create policy party_members_read_all
on public.party_members
for select
using (true);

drop policy if exists party_members_self_write on public.party_members;
create policy party_members_self_write
on public.party_members
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists lobby_channels_read_all on public.lobby_channels;
create policy lobby_channels_read_all
on public.lobby_channels
for select
using (true);

drop policy if exists chat_messages_read_all on public.chat_messages;
create policy chat_messages_read_all
on public.chat_messages
for select
using (true);

drop policy if exists chat_messages_insert_self on public.chat_messages;
create policy chat_messages_insert_self
on public.chat_messages
for insert
with check (auth.uid() = user_id);

drop policy if exists voice_sessions_read_all on public.voice_sessions;
create policy voice_sessions_read_all
on public.voice_sessions
for select
using (true);

drop policy if exists normal_raid_bosses_read_all on public.normal_raid_bosses;
create policy normal_raid_bosses_read_all
on public.normal_raid_bosses
for select
using (true);

drop policy if exists normal_raid_progress_self on public.normal_raid_progress;
create policy normal_raid_progress_self
on public.normal_raid_progress
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists boss_raid_windows_read_all on public.boss_raid_windows;
create policy boss_raid_windows_read_all
on public.boss_raid_windows
for select
using (true);

drop policy if exists boss_raid_instances_read_all on public.boss_raid_instances;
create policy boss_raid_instances_read_all
on public.boss_raid_instances
for select
using (true);

drop policy if exists boss_raid_participants_read_all on public.boss_raid_participants;
create policy boss_raid_participants_read_all
on public.boss_raid_participants
for select
using (true);

drop policy if exists boss_raid_participants_self_write on public.boss_raid_participants;
create policy boss_raid_participants_self_write
on public.boss_raid_participants
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Enable Realtime for these tables in Supabase:
-- public.party_rooms
-- public.party_members
-- public.chat_messages
-- public.voice_sessions
-- public.boss_raid_windows
-- public.boss_raid_instances
-- public.boss_raid_participants
