create table if not exists public.leaderboard_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('level', 'endless', 'battle', 'raid')),
  period text not null check (period in ('daily', 'weekly', 'monthly')),
  period_key text not null,
  nickname text,
  score bigint not null default 0,
  sort_a bigint not null default 0,
  sort_b bigint not null default 0,
  sort_c bigint not null default 0,
  sort_d bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  matches integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  rematch_wins integer not null default 0,
  best_streak integer not null default 0,
  current_streak integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, mode, period, period_key)
);

create index if not exists idx_leaderboard_entries_mode_period
on public.leaderboard_entries(mode, period, period_key, score desc);

alter table public.leaderboard_entries enable row level security;

drop policy if exists leaderboard_entries_read_all on public.leaderboard_entries;
create policy leaderboard_entries_read_all
on public.leaderboard_entries
for select
using (auth.uid() is not null);

drop trigger if exists leaderboard_entries_updated_at on public.leaderboard_entries;
create trigger leaderboard_entries_updated_at
before update on public.leaderboard_entries
for each row execute function public.update_updated_at();

create or replace function public.bh_leaderboard_period_key(p_period text)
returns text
language plpgsql
stable
as $$
declare
  v_now timestamp := now() at time zone 'Asia/Seoul';
begin
  case p_period
    when 'daily' then
      return to_char(v_now::date, 'YYYY-MM-DD');
    when 'weekly' then
      return to_char(date_trunc('week', v_now)::date, 'YYYY-MM-DD');
    when 'monthly' then
      return to_char(v_now::date, 'YYYY-MM');
    else
      raise exception 'invalid_period';
  end case;
end;
$$;

create or replace function public.bh_leaderboard_nickname()
returns text
language sql
stable
as $$
  select coalesce(
    (select nickname from public.profiles where id = auth.uid()),
    'Player'
  );
$$;

create or replace function public.bh_is_better_score(
  p_new_score bigint,
  p_new_a bigint,
  p_new_b bigint,
  p_new_c bigint,
  p_new_d bigint,
  p_old_score bigint,
  p_old_a bigint,
  p_old_b bigint,
  p_old_c bigint,
  p_old_d bigint
)
returns boolean
language plpgsql
immutable
as $$
begin
  if p_new_score <> p_old_score then
    return p_new_score > p_old_score;
  end if;
  if p_new_a <> p_old_a then
    return p_new_a > p_old_a;
  end if;
  if p_new_b <> p_old_b then
    return p_new_b > p_old_b;
  end if;
  if p_new_c <> p_old_c then
    return p_new_c > p_old_c;
  end if;
  return p_new_d > p_old_d;
end;
$$;

create or replace function public.bh_upsert_best_leaderboard_entry(
  p_mode text,
  p_period text,
  p_period_key text,
  p_score bigint,
  p_sort_a bigint,
  p_sort_b bigint,
  p_sort_c bigint,
  p_sort_d bigint,
  p_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.leaderboard_entries%rowtype;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  select *
  into v_existing
  from public.leaderboard_entries
  where user_id = auth.uid()
    and mode = p_mode
    and period = p_period
    and period_key = p_period_key
  for update;

  if not found then
    insert into public.leaderboard_entries (
      user_id,
      mode,
      period,
      period_key,
      nickname,
      score,
      sort_a,
      sort_b,
      sort_c,
      sort_d,
      metadata
    )
    values (
      auth.uid(),
      p_mode,
      p_period,
      p_period_key,
      public.bh_leaderboard_nickname(),
      p_score,
      p_sort_a,
      p_sort_b,
      p_sort_c,
      p_sort_d,
      p_metadata
    );
    return;
  end if;

  if public.bh_is_better_score(
    p_score,
    p_sort_a,
    p_sort_b,
    p_sort_c,
    p_sort_d,
    v_existing.score,
    v_existing.sort_a,
    v_existing.sort_b,
    v_existing.sort_c,
    v_existing.sort_d
  ) then
    update public.leaderboard_entries
    set
      nickname = public.bh_leaderboard_nickname(),
      score = p_score,
      sort_a = p_sort_a,
      sort_b = p_sort_b,
      sort_c = p_sort_c,
      sort_d = p_sort_d,
      metadata = p_metadata
    where user_id = auth.uid()
      and mode = p_mode
      and period = p_period
      and period_key = p_period_key;
  end if;
end;
$$;

create or replace function public.bh_get_leaderboard(
  p_mode text,
  p_period text,
  p_limit_count integer default 100
)
returns table(
  rank bigint,
  user_id uuid,
  nickname text,
  score bigint,
  metadata jsonb,
  matches integer,
  wins integer,
  losses integer,
  rematch_wins integer,
  best_streak integer
)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      row_number() over (
        order by
          score desc,
          sort_a desc,
          sort_b desc,
          sort_c desc,
          sort_d desc,
          updated_at asc
      ) as rank,
      user_id,
      coalesce(nickname, 'Player') as nickname,
      score,
      metadata,
      matches,
      wins,
      losses,
      rematch_wins,
      best_streak
    from public.leaderboard_entries
    where mode = p_mode
      and period = p_period
      and period_key = public.bh_leaderboard_period_key(p_period)
      and (p_mode <> 'battle' or matches >= 5)
  )
  select
    rank,
    user_id,
    nickname,
    score,
    metadata,
    matches,
    wins,
    losses,
    rematch_wins,
    best_streak
  from ranked
  order by rank
  limit greatest(1, least(coalesce(p_limit_count, 100), 100));
$$;

create or replace function public.bh_get_my_leaderboard(
  p_mode text,
  p_period text
)
returns table(
  rank bigint,
  user_id uuid,
  nickname text,
  score bigint,
  metadata jsonb,
  matches integer,
  wins integer,
  losses integer,
  rematch_wins integer,
  best_streak integer
)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      row_number() over (
        order by
          score desc,
          sort_a desc,
          sort_b desc,
          sort_c desc,
          sort_d desc,
          updated_at asc
      ) as rank,
      user_id,
      coalesce(nickname, 'Player') as nickname,
      score,
      metadata,
      matches,
      wins,
      losses,
      rematch_wins,
      best_streak
    from public.leaderboard_entries
    where mode = p_mode
      and period = p_period
      and period_key = public.bh_leaderboard_period_key(p_period)
      and (p_mode <> 'battle' or matches >= 5)
  )
  select
    rank,
    user_id,
    nickname,
    score,
    metadata,
    matches,
    wins,
    losses,
    rematch_wins,
    best_streak
  from ranked
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function public.bh_submit_level_leaderboard(
  p_level_id integer,
  p_stars integer,
  p_total_damage bigint,
  p_max_combo integer,
  p_clear_time_ms bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score bigint;
  v_period text;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  v_score := round(
    3000 +
    p_level_id * 100 +
    p_stars * 500 +
    least(p_total_damage, 200000) * 0.05 +
    p_max_combo * 120
  );

  foreach v_period in array array['daily', 'weekly', 'monthly']
  loop
    perform public.bh_upsert_best_leaderboard_entry(
      'level',
      v_period,
      public.bh_leaderboard_period_key(v_period),
      v_score,
      p_level_id,
      p_stars,
      p_max_combo,
      greatest(0, 2147483647 - least(p_clear_time_ms, 2147483647)),
      jsonb_build_object(
        'levelId', p_level_id,
        'stars', p_stars,
        'totalDamage', p_total_damage,
        'maxCombo', p_max_combo,
        'clearTimeMs', p_clear_time_ms
      )
    );
  end loop;
end;
$$;

create or replace function public.bh_submit_endless_leaderboard(
  p_final_score bigint,
  p_max_level integer,
  p_max_combo integer,
  p_play_time_ms bigint,
  p_total_lines integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  foreach v_period in array array['daily', 'weekly', 'monthly']
  loop
    perform public.bh_upsert_best_leaderboard_entry(
      'endless',
      v_period,
      public.bh_leaderboard_period_key(v_period),
      p_final_score,
      p_max_level,
      p_max_combo,
      p_total_lines,
      least(p_play_time_ms, 2147483647),
      jsonb_build_object(
        'maxLevel', p_max_level,
        'maxCombo', p_max_combo,
        'playTimeMs', p_play_time_ms,
        'totalLines', p_total_lines
      )
    );
  end loop;
end;
$$;

create or replace function public.bh_submit_raid_leaderboard(
  p_boss_stage integer,
  p_total_damage bigint,
  p_rank integer,
  p_boss_defeated boolean,
  p_clear_time_ms bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rank_bonus integer;
  v_time_bonus integer;
  v_score bigint;
  v_period text;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  v_rank_bonus := case
    when p_rank = 1 then 1200
    when p_rank = 2 then 700
    when p_rank = 3 then 400
    else 150
  end;
  v_time_bonus := case
    when p_boss_defeated then greatest(0, 1200 - floor(p_clear_time_ms / 1000.0)::integer)
    else 0
  end;
  v_score := round(
    p_boss_stage * 1000 +
    least(p_total_damage, 5000000) * 0.02 +
    v_rank_bonus +
    case when p_boss_defeated then 2500 else 0 end +
    v_time_bonus
  );

  foreach v_period in array array['daily', 'weekly', 'monthly']
  loop
    perform public.bh_upsert_best_leaderboard_entry(
      'raid',
      v_period,
      public.bh_leaderboard_period_key(v_period),
      v_score,
      p_boss_stage,
      least(p_total_damage, 2147483647),
      greatest(0, 100 - p_rank),
      greatest(0, 2147483647 - least(p_clear_time_ms, 2147483647)),
      jsonb_build_object(
        'bossStage', p_boss_stage,
        'totalDamage', p_total_damage,
        'rank', p_rank,
        'bossDefeated', p_boss_defeated,
        'clearTimeMs', p_clear_time_ms
      )
    );
  end loop;
end;
$$;

create or replace function public.bh_submit_battle_leaderboard(
  p_won boolean,
  p_rematch_win boolean,
  p_daily_current_streak integer,
  p_daily_best_streak integer,
  p_weekly_current_streak integer,
  p_weekly_best_streak integer,
  p_monthly_current_streak integer,
  p_monthly_best_streak integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text;
  v_period_key text;
  v_existing public.leaderboard_entries%rowtype;
  v_matches integer;
  v_wins integer;
  v_losses integer;
  v_rematch_wins integer;
  v_best_streak integer;
  v_current_streak integer;
  v_score bigint;
  v_win_rate integer;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  foreach v_period in array array['daily', 'weekly', 'monthly']
  loop
    v_period_key := public.bh_leaderboard_period_key(v_period);

    select *
    into v_existing
    from public.leaderboard_entries
    where user_id = auth.uid()
      and mode = 'battle'
      and period = v_period
      and period_key = v_period_key
    for update;

    if v_period = 'daily' then
      v_current_streak := greatest(0, p_daily_current_streak);
      v_best_streak := greatest(coalesce(v_existing.best_streak, 0), p_daily_best_streak);
    elsif v_period = 'weekly' then
      v_current_streak := greatest(0, p_weekly_current_streak);
      v_best_streak := greatest(coalesce(v_existing.best_streak, 0), p_weekly_best_streak);
    else
      v_current_streak := greatest(0, p_monthly_current_streak);
      v_best_streak := greatest(coalesce(v_existing.best_streak, 0), p_monthly_best_streak);
    end if;

    v_matches := coalesce(v_existing.matches, 0) + 1;
    v_wins := coalesce(v_existing.wins, 0) + case when p_won then 1 else 0 end;
    v_losses := coalesce(v_existing.losses, 0) + case when p_won then 0 else 1 end;
    v_rematch_wins := coalesce(v_existing.rematch_wins, 0) + case when p_rematch_win then 1 else 0 end;
    v_score := v_wins * 30 + v_rematch_wins * 5 + v_best_streak * 8 - v_losses * 10;
    v_win_rate := case
      when v_matches > 0 then floor((v_wins::numeric / v_matches::numeric) * 10000)::integer
      else 0
    end;

    insert into public.leaderboard_entries (
      user_id,
      mode,
      period,
      period_key,
      nickname,
      score,
      sort_a,
      sort_b,
      sort_c,
      sort_d,
      metadata,
      matches,
      wins,
      losses,
      rematch_wins,
      best_streak,
      current_streak
    )
    values (
      auth.uid(),
      'battle',
      v_period,
      v_period_key,
      public.bh_leaderboard_nickname(),
      v_score,
      v_win_rate,
      v_wins,
      v_best_streak,
      0,
      jsonb_build_object(
        'matches', v_matches,
        'wins', v_wins,
        'losses', v_losses,
        'rematchWins', v_rematch_wins,
        'bestStreak', v_best_streak
      ),
      v_matches,
      v_wins,
      v_losses,
      v_rematch_wins,
      v_best_streak,
      v_current_streak
    )
    on conflict (user_id, mode, period, period_key)
    do update set
      nickname = excluded.nickname,
      score = excluded.score,
      sort_a = excluded.sort_a,
      sort_b = excluded.sort_b,
      sort_c = excluded.sort_c,
      metadata = excluded.metadata,
      matches = excluded.matches,
      wins = excluded.wins,
      losses = excluded.losses,
      rematch_wins = excluded.rematch_wins,
      best_streak = excluded.best_streak,
      current_streak = excluded.current_streak;
  end loop;
end;
$$;

grant execute on function public.bh_submit_level_leaderboard(integer, integer, bigint, integer, bigint) to authenticated;
grant execute on function public.bh_submit_endless_leaderboard(bigint, integer, integer, bigint, integer) to authenticated;
grant execute on function public.bh_submit_raid_leaderboard(integer, bigint, integer, boolean, bigint) to authenticated;
grant execute on function public.bh_submit_battle_leaderboard(boolean, boolean, integer, integer, integer, integer, integer, integer) to authenticated;
grant execute on function public.bh_get_leaderboard(text, text, integer) to authenticated;
grant execute on function public.bh_get_my_leaderboard(text, text) to authenticated;
