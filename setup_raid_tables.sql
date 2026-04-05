-- ============================================
-- Cubrix Raid Mode - Database Setup
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Raid Rooms table
CREATE TABLE IF NOT EXISTS raid_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  boss_stage INTEGER NOT NULL,
  boss_current_hp BIGINT NOT NULL,
  boss_max_hp BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting | active | defeated | failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ DEFAULT NULL
);

-- 2. Raid Participants table
CREATE TABLE IF NOT EXISTS raid_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  raid_room_id UUID NOT NULL REFERENCES raid_rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  total_damage BIGINT NOT NULL DEFAULT 0,
  blocks_broken INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(raid_room_id, player_id)
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_raid_rooms_code ON raid_rooms(code);
CREATE INDEX IF NOT EXISTS idx_raid_rooms_status ON raid_rooms(status);
CREATE INDEX IF NOT EXISTS idx_raid_participants_room ON raid_participants(raid_room_id);
CREATE INDEX IF NOT EXISTS idx_raid_participants_player ON raid_participants(player_id);

-- 4. RLS Policies
ALTER TABLE raid_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE raid_participants ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write raid rooms
CREATE POLICY "Anyone can read raid rooms" ON raid_rooms
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create raid rooms" ON raid_rooms
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update raid rooms" ON raid_rooms
  FOR UPDATE USING (true);

-- Allow all authenticated users to read/write raid participants
CREATE POLICY "Anyone can read raid participants" ON raid_participants
  FOR SELECT USING (true);

CREATE POLICY "Anyone can join raid" ON raid_participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update raid participants" ON raid_participants
  FOR UPDATE USING (true);

-- 5. Enable realtime for raid tables
ALTER PUBLICATION supabase_realtime ADD TABLE raid_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE raid_participants;
