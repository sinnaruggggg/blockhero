-- ============================================
-- BlockHero authoritative economy RPCs
-- Run after:
--   1. setup_player_state_v2.sql
--   2. setup_rewards_v3.sql
--   3. admin_setup.sql
--   4. setup_profile_v2.sql
-- ============================================

alter table public.shop_items
  add column if not exists item_type text not null default 'item',
  add column if not exists item_key text,
  add column if not exists item_count integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shop_items_item_type_check'
  ) then
    alter table public.shop_items
      add constraint shop_items_item_type_check
      check (item_type in ('item', 'hearts', 'piece'));
  end if;
end $$;

insert into public.shop_items (
  item_id,
  gold_price,
  diamond_price,
  is_active,
  item_type,
  item_key,
  item_count
)
values
  ('refresh', 80, 3, true, 'item', 'refresh', 1),
  ('heal_small', 100, 2, true, 'item', 'heal_small', 1),
  ('heal_medium', 250, 3, true, 'item', 'heal_medium', 1),
  ('heal_large', 400, 7, true, 'item', 'heal_large', 1),
  ('power_small', 100, 2, true, 'item', 'power_small', 1),
  ('power_medium', 250, 3, true, 'item', 'power_medium', 1),
  ('power_large', 400, 7, true, 'item', 'power_large', 1),
  ('hearts', 60, 5, true, 'hearts', null, 1),
  ('piece_square3', 600, 20, true, 'piece', 'piece_square3', 1),
  ('piece_rect', 600, 20, true, 'piece', 'piece_rect', 1),
  ('piece_line5', 600, 20, true, 'piece', 'piece_line5', 1),
  ('piece_num2', 600, 20, true, 'piece', 'piece_num2', 1),
  ('piece_diag', 600, 20, true, 'piece', 'piece_diag', 1)
on conflict (item_id) do update
set
  gold_price = excluded.gold_price,
  diamond_price = excluded.diamond_price,
  is_active = excluded.is_active,
  item_type = excluded.item_type,
  item_key = excluded.item_key,
  item_count = excluded.item_count;

update public.shop_items
set is_active = false
where item_id in ('hammer', 'bomb');

create or replace function public.bh_now_ms()
returns bigint
language sql
stable
as $$
  select floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
$$;

create or replace function public.bh_default_game_data()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'hearts', 20,
    'lastHeartTime', public.bh_now_ms(),
    'gold', 0,
    'diamonds', 0,
    'startingItemLoadout', jsonb_build_array(
      jsonb_build_object('itemKey', null, 'count', 0),
      jsonb_build_object('itemKey', null, 'count', 0),
      jsonb_build_object('itemKey', null, 'count', 0)
    ),
    'items', jsonb_build_object(
      'hammer', 0,
      'refresh', 0,
      'heal_small', 0,
      'heal_medium', 0,
      'heal_large', 0,
      'power_small', 0,
      'power_medium', 0,
      'power_large', 0,
      'addTurns', 0,
      'bomb', 0,
      'piece_square3', 0,
      'piece_rect', 0,
      'piece_line5', 0,
      'piece_num2', 0,
      'piece_diag', 0,
      'raidSkill_0', 0,
      'raidSkill_1', 0,
      'raidSkill_2', 0,
      'raidSkill_3', 0,
      'raidSkill_4', 0,
      'raidSkill_5', 0
    )
  );
$$;

create or replace function public.bh_default_daily_stats()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'date', '',
    'games', 0,
    'score', 0,
    'lines', 0,
    'maxCombo', 0,
    'levelClears', 0
  );
$$;

create or replace function public.bh_default_endless_stats()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'totalGames', 0,
    'totalScore', 0,
    'totalLines', 0,
    'maxLevel', 0,
    'maxCombo', 0,
    'highScore', 0
  );
$$;

create or replace function public.bh_default_mission_data()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'date', '',
    'claimed', '{}'::jsonb
  );
$$;

create or replace function public.bh_lock_player_state()
returns public.player_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.player_state;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  insert into public.player_state (
    user_id,
    game_data,
    level_progress,
    endless_stats,
    daily_stats,
    mission_data,
    achievement_data,
    skin_data,
    selected_character_id,
    character_data,
    normal_raid_progress,
    codex_data,
    unlocked_titles,
    active_title
  )
  values (
    auth.uid(),
    public.bh_default_game_data(),
    '{}'::jsonb,
    public.bh_default_endless_stats(),
    public.bh_default_daily_stats(),
    public.bh_default_mission_data(),
    '{}'::jsonb,
    jsonb_build_object(
      'unlockedSkins', jsonb_build_array(0),
      'activeSkinId', 0,
      'summonProgress', '{}'::jsonb
    ),
    null,
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    '[]'::jsonb,
    null
  )
  on conflict (user_id) do nothing;

  select *
  into v_state
  from public.player_state
  where user_id = auth.uid()
  for update;

  return v_state;
end;
$$;

create or replace function public.bh_selected_character_points(
  p_state public.player_state,
  p_index integer
)
returns integer
language plpgsql
immutable
as $$
declare
  v_character_id text;
begin
  v_character_id := p_state.selected_character_id;
  if v_character_id is null then
    return 0;
  end if;

  return coalesce(
    (
      coalesce(p_state.character_data, '{}'::jsonb)
      -> v_character_id
      -> 'personalAllocations'
      ->> p_index
    )::integer,
    0
  );
exception
  when others then
    return 0;
end;
$$;

create or replace function public.bh_item_cap(p_state public.player_state)
returns integer
language plpgsql
immutable
as $$
begin
  return 99;
end;
$$;

create or replace function public.bh_shop_gold_discount(
  p_state public.player_state,
  p_item_id text
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_points integer := 0;
  v_base numeric := 0;
  v_refresh numeric := 0;
begin
  if p_state.selected_character_id <> 'rogue' then
    return 0;
  end if;

  v_points := public.bh_selected_character_points(p_state, 9);
  v_base := v_points * 0.03;
  v_refresh := v_points * 0.06;

  if p_item_id = 'refresh' then
    return greatest(v_base, v_refresh);
  end if;

  return v_base;
end;
$$;

create or replace function public.bh_heart_max(p_state public.player_state)
returns integer
language plpgsql
immutable
as $$
declare
  v_points integer := 0;
begin
  if p_state.selected_character_id = 'healer' then
    v_points := public.bh_selected_character_points(p_state, 3);
  end if;

  return least(20, 20 + case when v_points >= 3 then 1 else 0 end);
end;
$$;

create or replace function public.bh_player_metric(
  p_state public.player_state,
  p_metric text
)
returns bigint
language plpgsql
immutable
as $$
declare
  v_daily jsonb := coalesce(p_state.daily_stats, '{}'::jsonb);
  v_endless jsonb := coalesce(p_state.endless_stats, '{}'::jsonb);
  v_levels jsonb := coalesce(p_state.level_progress, '{}'::jsonb);
begin
  case p_metric
    when 'dailyGames' then
      return coalesce((v_daily->>'games')::bigint, 0);
    when 'dailyScore' then
      return coalesce((v_daily->>'score')::bigint, 0);
    when 'dailyLines' then
      return coalesce((v_daily->>'lines')::bigint, 0);
    when 'dailyMaxCombo' then
      return coalesce((v_daily->>'maxCombo')::bigint, 0);
    when 'dailyLevelClears' then
      return coalesce((v_daily->>'levelClears')::bigint, 0);
    when 'totalLevelClears' then
      return coalesce((
        select count(*)
        from jsonb_each(v_levels) as level_entry(level_id, level_value)
        where coalesce((level_value->>'cleared')::boolean, false)
      ), 0);
    when 'endlessHighScore' then
      return coalesce((v_endless->>'highScore')::bigint, 0);
    when 'totalLines' then
      return coalesce((v_endless->>'totalLines')::bigint, 0)
        + coalesce((v_daily->>'lines')::bigint, 0);
    when 'maxCombo' then
      return greatest(
        coalesce((v_endless->>'maxCombo')::bigint, 0),
        coalesce((v_daily->>'maxCombo')::bigint, 0)
      );
    when 'totalGames' then
      return coalesce((v_endless->>'totalGames')::bigint, 0)
        + coalesce((v_daily->>'games')::bigint, 0);
    when 'endlessMaxLevel' then
      return coalesce((v_endless->>'maxLevel')::bigint, 0);
    else
      raise exception 'unknown_metric';
  end case;
exception
  when invalid_text_representation then
    return 0;
end;
$$;

create or replace function public.bh_get_mission_definition(p_mission_id text)
returns table(metric text, target bigint, reward integer)
language sql
immutable
as $$
  select definition.metric, definition.target, definition.reward
  from (
    values
      ('play3', 'dailyGames', 3::bigint, 30),
      ('score5000', 'dailyScore', 5000::bigint, 50),
      ('lines10', 'dailyLines', 10::bigint, 40),
      ('combo5', 'dailyMaxCombo', 5::bigint, 60),
      ('level1', 'dailyLevelClears', 1::bigint, 30)
  ) as definition(mission_id, metric, target, reward)
  where definition.mission_id = p_mission_id;
$$;

create or replace function public.bh_get_achievement_definition(p_achievement_id text)
returns table(metric text, target bigint, reward integer)
language sql
immutable
as $$
  select definition.metric, definition.target, definition.reward
  from (
    values
      ('firstWin', 'totalLevelClears', 1::bigint, 50),
      ('score10k', 'endlessHighScore', 10000::bigint, 100),
      ('score50k', 'endlessHighScore', 50000::bigint, 200),
      ('lines100', 'totalLines', 100::bigint, 80),
      ('lines500', 'totalLines', 500::bigint, 150),
      ('combo10', 'maxCombo', 10::bigint, 100),
      ('levels10', 'totalLevelClears', 10::bigint, 100),
      ('levels50', 'totalLevelClears', 50::bigint, 200),
      ('combo15', 'maxCombo', 15::bigint, 150),
      ('games50', 'totalGames', 50::bigint, 100),
      ('endless5', 'endlessMaxLevel', 5::bigint, 80),
      ('endless10', 'endlessMaxLevel', 10::bigint, 150),
      ('levels100', 'totalLevelClears', 100::bigint, 300),
      ('levels300', 'totalLevelClears', 300::bigint, 1000)
  ) as definition(achievement_id, metric, target, reward)
  where definition.achievement_id = p_achievement_id;
$$;

create or replace function public.bh_purchase_shop_item(
  p_item_id text,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.player_state;
  v_game jsonb;
  v_item public.shop_items%rowtype;
  v_price integer;
  v_gold bigint;
  v_diamonds bigint;
  v_item_key text;
  v_current_count integer;
  v_next_count integer;
  v_discount numeric;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  v_state := public.bh_lock_player_state();
  v_game := coalesce(v_state.game_data, public.bh_default_game_data());

  select *
  into v_item
  from public.shop_items
  where item_id = p_item_id
  limit 1;

  if not found then
    raise exception 'shop_item_not_found';
  end if;

  if not coalesce(v_item.is_active, false) then
    raise exception 'shop_item_inactive';
  end if;

  if p_currency not in ('gold', 'diamonds') then
    raise exception 'invalid_currency';
  end if;

  v_gold := coalesce((v_game->>'gold')::bigint, 0);
  v_diamonds := coalesce((v_game->>'diamonds')::bigint, 0);

  if p_currency = 'gold' then
    v_discount := public.bh_shop_gold_discount(v_state, p_item_id);
    v_price := greatest(1, round(v_item.gold_price * (1 - v_discount))::integer);
    if v_gold < v_price then
      raise exception 'not_enough_gold';
    end if;
    v_game := jsonb_set(v_game, array['gold'], to_jsonb(v_gold - v_price), true);
  else
    v_price := v_item.diamond_price;
    if v_diamonds < v_price then
      raise exception 'not_enough_diamonds';
    end if;
    v_game := jsonb_set(v_game, array['diamonds'], to_jsonb(v_diamonds - v_price), true);
  end if;

  if v_item.item_type = 'hearts' then
    v_game := jsonb_set(v_game, array['hearts'], to_jsonb(public.bh_heart_max(v_state)), true);
    v_game := jsonb_set(v_game, array['lastHeartTime'], to_jsonb(public.bh_now_ms()), true);
  elsif v_item.item_key is not null then
    v_item_key := v_item.item_key;
    v_current_count := coalesce((v_game->'items'->>v_item_key)::integer, 0);
    v_next_count := v_current_count + coalesce(v_item.item_count, 1);

    if v_item_key in (
      'refresh',
      'heal_small',
      'heal_medium',
      'heal_large',
      'power_small',
      'power_medium',
      'power_large'
    ) then
      v_next_count := least(public.bh_item_cap(v_state), v_next_count);
      if v_next_count <= v_current_count then
        raise exception 'item_cap_reached';
      end if;
    end if;

    v_game := jsonb_set(v_game, array['items', v_item_key], to_jsonb(v_next_count), true);
  end if;

  update public.player_state
  set game_data = v_game
  where user_id = auth.uid();

  return jsonb_build_object('game_data', v_game);
end;
$$;

create or replace function public.bh_upgrade_raid_skill(
  p_skill_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.player_state;
  v_game jsonb;
  v_costs integer[] := array[30, 60, 100, 150, 200];
  v_skill_key text;
  v_current_level integer;
  v_cost integer;
  v_diamonds bigint;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  if p_skill_index < 0 or p_skill_index > 5 then
    raise exception 'raid_skill_not_found';
  end if;

  v_state := public.bh_lock_player_state();
  v_game := coalesce(v_state.game_data, public.bh_default_game_data());
  v_skill_key := format('raidSkill_%s', p_skill_index);
  v_current_level := coalesce((v_game->'items'->>v_skill_key)::integer, 0);

  if v_current_level >= 5 then
    raise exception 'raid_skill_max_level';
  end if;

  v_cost := v_costs[v_current_level + 1];
  v_diamonds := coalesce((v_game->>'diamonds')::bigint, 0);
  if v_diamonds < v_cost then
    raise exception 'not_enough_diamonds';
  end if;

  v_game := jsonb_set(v_game, array['diamonds'], to_jsonb(v_diamonds - v_cost), true);
  v_game := jsonb_set(
    v_game,
    array['items', v_skill_key],
    to_jsonb(v_current_level + 1),
    true
  );

  update public.player_state
  set game_data = v_game
  where user_id = auth.uid();

  return jsonb_build_object('game_data', v_game);
end;
$$;

create or replace function public.bh_claim_daily_mission_reward(
  p_mission_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.player_state;
  v_game jsonb;
  v_mission_data jsonb;
  v_claimed jsonb;
  v_metric text;
  v_target bigint;
  v_reward integer;
  v_gold bigint;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  v_state := public.bh_lock_player_state();
  select metric, target, reward
  into v_metric, v_target, v_reward
  from public.bh_get_mission_definition(p_mission_id);

  if v_metric is null then
    raise exception 'mission_not_found';
  end if;

  v_mission_data := coalesce(v_state.mission_data, public.bh_default_mission_data());
  if coalesce((v_mission_data->'claimed'->>p_mission_id)::boolean, false) then
    raise exception 'mission_already_claimed';
  end if;

  if public.bh_player_metric(v_state, v_metric) < v_target then
    raise exception 'mission_not_completed';
  end if;

  v_game := coalesce(v_state.game_data, public.bh_default_game_data());
  v_gold := coalesce((v_game->>'gold')::bigint, 0) + v_reward;
  v_game := jsonb_set(v_game, array['gold'], to_jsonb(v_gold), true);

  v_claimed := coalesce(v_mission_data->'claimed', '{}'::jsonb);
  v_claimed := jsonb_set(v_claimed, array[p_mission_id], 'true'::jsonb, true);
  v_mission_data := jsonb_set(v_mission_data, array['claimed'], v_claimed, true);

  update public.player_state
  set
    game_data = v_game,
    mission_data = v_mission_data
  where user_id = auth.uid();

  insert into public.reward_logs (user_id, source, source_ref, gold_delta)
  values (auth.uid(), 'mission', p_mission_id, v_reward);

  return jsonb_build_object(
    'game_data', v_game,
    'mission_data', v_mission_data,
    'reward', v_reward
  );
end;
$$;

create or replace function public.bh_claim_achievement_reward(
  p_achievement_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.player_state;
  v_game jsonb;
  v_achievement_data jsonb;
  v_metric text;
  v_target bigint;
  v_reward integer;
  v_gold bigint;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  v_state := public.bh_lock_player_state();
  select metric, target, reward
  into v_metric, v_target, v_reward
  from public.bh_get_achievement_definition(p_achievement_id);

  if v_metric is null then
    raise exception 'achievement_not_found';
  end if;

  v_achievement_data := coalesce(v_state.achievement_data, '{}'::jsonb);
  if coalesce((v_achievement_data->>p_achievement_id)::boolean, false) then
    raise exception 'achievement_already_claimed';
  end if;

  if public.bh_player_metric(v_state, v_metric) < v_target then
    raise exception 'achievement_not_completed';
  end if;

  v_game := coalesce(v_state.game_data, public.bh_default_game_data());
  v_gold := coalesce((v_game->>'gold')::bigint, 0) + v_reward;
  v_game := jsonb_set(v_game, array['gold'], to_jsonb(v_gold), true);
  v_achievement_data := jsonb_set(
    v_achievement_data,
    array[p_achievement_id],
    'true'::jsonb,
    true
  );

  update public.player_state
  set
    game_data = v_game,
    achievement_data = v_achievement_data
  where user_id = auth.uid();

  insert into public.reward_logs (user_id, source, source_ref, gold_delta)
  values (auth.uid(), 'achievement', p_achievement_id, v_reward);

  return jsonb_build_object(
    'game_data', v_game,
    'achievement_data', v_achievement_data,
    'reward', v_reward
  );
end;
$$;

create or replace function public.bh_claim_pending_resource_grants()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.player_state;
  v_game jsonb;
  v_grant record;
  v_claimed jsonb := '[]'::jsonb;
  v_gold bigint;
  v_diamonds bigint;
  v_item_key text;
  v_current_count integer;
  v_next_count integer;
  v_item_delta jsonb;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  v_state := public.bh_lock_player_state();
  v_game := coalesce(v_state.game_data, public.bh_default_game_data());

  for v_grant in
    select *
    from public.resource_grants
    where user_id = auth.uid()
      and status = 'pending'
    order by created_at
    for update
  loop
    v_item_delta := '{}'::jsonb;

    case v_grant.grant_type
      when 'gold' then
        v_gold := coalesce((v_game->>'gold')::bigint, 0) + greatest(v_grant.amount, 0);
        v_game := jsonb_set(v_game, array['gold'], to_jsonb(v_gold), true);
      when 'diamonds' then
        v_diamonds := coalesce((v_game->>'diamonds')::bigint, 0) + greatest(v_grant.amount, 0);
        v_game := jsonb_set(v_game, array['diamonds'], to_jsonb(v_diamonds), true);
      when 'hearts' then
        v_game := jsonb_set(v_game, array['hearts'], to_jsonb(public.bh_heart_max(v_state)), true);
        v_game := jsonb_set(v_game, array['lastHeartTime'], to_jsonb(public.bh_now_ms()), true);
      else
        v_item_key := v_grant.grant_type;
        v_current_count := coalesce((v_game->'items'->>v_item_key)::integer, 0);
        v_next_count := v_current_count + greatest(v_grant.amount, 0);

        if v_item_key in (
          'refresh',
          'heal_small',
          'heal_medium',
          'heal_large',
          'power_small',
          'power_medium',
          'power_large'
        ) then
          v_next_count := least(public.bh_item_cap(v_state), v_next_count);
        end if;

        v_game := jsonb_set(v_game, array['items', v_item_key], to_jsonb(v_next_count), true);
        v_item_delta := jsonb_build_object(v_item_key, greatest(v_grant.amount, 0));
    end case;

    update public.resource_grants
    set
      status = 'claimed',
      claimed_at = now()
    where id = v_grant.id;

    insert into public.reward_logs (
      user_id,
      source,
      source_ref,
      gold_delta,
      diamond_delta,
      item_delta
    )
    values (
      auth.uid(),
      'gm_grant',
      v_grant.id::text,
      case when v_grant.grant_type = 'gold' then greatest(v_grant.amount, 0) else 0 end,
      case when v_grant.grant_type = 'diamonds' then greatest(v_grant.amount, 0) else 0 end,
      v_item_delta
    );

    v_claimed := v_claimed || jsonb_build_array(jsonb_build_object(
      'type', v_grant.grant_type,
      'amount', v_grant.amount,
      'reason', v_grant.reason
    ));
  end loop;

  update public.player_state
  set game_data = v_game
  where user_id = auth.uid();

  return jsonb_build_object(
    'game_data', v_game,
    'claimed', v_claimed
  );
end;
$$;

create or replace function public.bh_change_profile_nickname(
  p_nickname text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.player_state;
  v_game jsonb;
  v_profile record;
  v_nickname text := btrim(p_nickname);
  v_diamonds bigint;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  if char_length(v_nickname) < 2 then
    raise exception 'nickname_too_short';
  end if;

  if char_length(v_nickname) > 10 then
    raise exception 'nickname_too_long';
  end if;

  if exists (
    select 1
    from public.profiles
    where nickname = v_nickname
      and id <> auth.uid()
  ) then
    raise exception 'nickname_taken';
  end if;

  insert into public.profiles (id, nickname, nickname_changed)
  values (auth.uid(), v_nickname, false)
  on conflict (id) do nothing;

  select *
  into v_profile
  from public.profiles
  where id = auth.uid()
  for update;

  v_state := public.bh_lock_player_state();
  v_game := coalesce(v_state.game_data, public.bh_default_game_data());

  if coalesce(v_profile.nickname, '') = v_nickname then
    return jsonb_build_object(
      'game_data', v_game,
      'nickname', v_profile.nickname,
      'nickname_changed', coalesce(v_profile.nickname_changed, false)
    );
  end if;

  if coalesce(v_profile.nickname_changed, false) then
    v_diamonds := coalesce((v_game->>'diamonds')::bigint, 0);
    if v_diamonds < 200 then
      raise exception 'not_enough_diamonds_for_nickname';
    end if;

    v_game := jsonb_set(v_game, array['diamonds'], to_jsonb(v_diamonds - 200), true);

    update public.player_state
    set game_data = v_game
    where user_id = auth.uid();
  end if;

  update public.profiles
  set
    nickname = v_nickname,
    nickname_changed = true
  where id = auth.uid();

  return jsonb_build_object(
    'game_data', v_game,
    'nickname', v_nickname,
    'nickname_changed', true
  );
end;
$$;
