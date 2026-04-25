-- RAID_FIX: optional runtime-state columns for raid reconnect/polling fallback.
-- Run in Supabase SQL editor when realtime broadcasts are unreliable on a device.

ALTER TABLE public.raid_participants
ADD COLUMN IF NOT EXISTS avatar_icon TEXT,
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS is_host BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_ready BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_alive BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS current_hp BIGINT,
ADD COLUMN IF NOT EXISTS max_hp BIGINT,
ADD COLUMN IF NOT EXISTS battle_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS board_state JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.raid_participants REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS idx_raid_participants_ready
ON public.raid_participants (raid_instance_id, is_ready);

-- RAID_FIX: clean up stale duplicate party raid rooms created before the
-- single-active-party-raid guard. Keep the newest active room per party.
WITH ranked_party_raids AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY party_id
      ORDER BY created_at DESC, started_at DESC
    ) AS room_rank
  FROM public.raid_instances
  WHERE party_id IS NOT NULL
    AND status IN ('active', 'battle', 'waiting', 'ready')
    AND expires_at > NOW()
)
UPDATE public.raid_instances
SET status = 'closed'
WHERE id IN (
  SELECT id
  FROM ranked_party_raids
  WHERE room_rank > 1
);

-- RAID_FIX: old normal raid attempts were stored as long-lived active
-- raid_instances. Because raid_instances has no raid_type column yet, those
-- stale public normal rooms can appear as "active boss raids" for admins.
UPDATE public.raid_instances
SET status = 'closed'
WHERE party_id IS NULL
  AND status IN ('active', 'battle', 'waiting', 'ready')
  AND expires_at > NOW()
  AND expires_at - started_at >= INTERVAL '24 hours'
  AND created_at < NOW() - INTERVAL '30 minutes';

-- RAID_FIX: close very old party raid rooms left behind by app termination or
-- older builds before party-disband cleanup existed.
UPDATE public.raid_instances
SET status = 'closed'
WHERE party_id IS NOT NULL
  AND status IN ('active', 'battle', 'waiting', 'ready')
  AND expires_at > NOW()
  AND created_at < NOW() - INTERVAL '24 hours';

-- RAID_FIX: app cleanup can close stale raid rows through existing update
-- policies, but real deletion also needs delete policies on these raid tables.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'raid_instances'
      AND policyname = 'Anyone can delete raid_instances'
  ) THEN
    CREATE POLICY "Anyone can delete raid_instances"
      ON public.raid_instances
      FOR DELETE
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'raid_participants'
      AND policyname = 'Anyone can delete raid_participants'
  ) THEN
    CREATE POLICY "Anyone can delete raid_participants"
      ON public.raid_participants
      FOR DELETE
      USING (true);
  END IF;
END $$;

-- RAID_FIX: actually remove old unused party raid rows after closing them.
-- This keeps stale duplicate rooms from reappearing in later party/lobby flows.
WITH removable_party_raids AS (
  SELECT id
  FROM public.raid_instances
  WHERE party_id IS NOT NULL
    AND status IN ('closed', 'expired', 'failed', 'defeated', 'cleared')
)
DELETE FROM public.raid_participants
WHERE raid_instance_id IN (SELECT id FROM removable_party_raids);

WITH removable_party_raids AS (
  SELECT id
  FROM public.raid_instances
  WHERE party_id IS NOT NULL
    AND status IN ('closed', 'expired', 'failed', 'defeated', 'cleared')
)
DELETE FROM public.raid_instances
WHERE id IN (SELECT id FROM removable_party_raids);

-- RAID_FIX: delete abandoned long-lived public normal raid rows that were
-- previously closed because they could be mistaken for boss raid rooms.
WITH removable_public_long_raids AS (
  SELECT id
  FROM public.raid_instances
  WHERE party_id IS NULL
    AND status IN ('closed', 'expired', 'failed', 'defeated', 'cleared')
    AND expires_at - started_at >= INTERVAL '24 hours'
    AND created_at < NOW() - INTERVAL '30 minutes'
)
DELETE FROM public.raid_participants
WHERE raid_instance_id IN (SELECT id FROM removable_public_long_raids);

WITH removable_public_long_raids AS (
  SELECT id
  FROM public.raid_instances
  WHERE party_id IS NULL
    AND status IN ('closed', 'expired', 'failed', 'defeated', 'cleared')
    AND expires_at - started_at >= INTERVAL '24 hours'
    AND created_at < NOW() - INTERVAL '30 minutes'
)
DELETE FROM public.raid_instances
WHERE id IN (SELECT id FROM removable_public_long_raids);

-- RAID_FIX: clients subscribe to these tables with postgres_changes. If the
-- tables are not in the Supabase realtime publication, one device may miss
-- party/member updates and must wait for polling only.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'party_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.party_members;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'parties'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.parties;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'party_invites'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.party_invites;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'raid_instances'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.raid_instances;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'raid_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.raid_participants;
  END IF;
END $$;
