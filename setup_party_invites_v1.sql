ALTER TABLE public.raid_instances
ADD COLUMN IF NOT EXISTS party_id TEXT;

CREATE INDEX IF NOT EXISTS idx_raid_instances_party_stage_status
ON public.raid_instances (party_id, boss_stage, status, expires_at DESC);

CREATE TABLE IF NOT EXISTS public.party_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id TEXT NOT NULL,
  inviter_id TEXT NOT NULL,
  inviter_nickname TEXT NOT NULL,
  invitee_id TEXT NOT NULL,
  invitee_nickname TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.party_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_invites REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS idx_party_invites_invitee_status
ON public.party_invites (invitee_id, status, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_party_invites_party_invitee_status
ON public.party_invites (party_id, invitee_id, status, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'party_invites'
      AND policyname = 'Anyone can read party_invites'
  ) THEN
    CREATE POLICY "Anyone can read party_invites"
      ON public.party_invites
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'party_invites'
      AND policyname = 'Anyone can insert party_invites'
  ) THEN
    CREATE POLICY "Anyone can insert party_invites"
      ON public.party_invites
      FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'party_invites'
      AND policyname = 'Anyone can update party_invites'
  ) THEN
    CREATE POLICY "Anyone can update party_invites"
      ON public.party_invites
      FOR UPDATE
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'party_invites'
      AND policyname = 'Anyone can delete party_invites'
  ) THEN
    CREATE POLICY "Anyone can delete party_invites"
      ON public.party_invites
      FOR DELETE
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.party_invites;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.party_members;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;
