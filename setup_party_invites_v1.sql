ALTER TABLE public.raid_instances
ADD COLUMN IF NOT EXISTS party_id TEXT;

CREATE INDEX IF NOT EXISTS idx_raid_instances_party_stage_status
ON public.raid_instances (party_id, boss_stage, status, expires_at DESC);

CREATE TABLE IF NOT EXISTS public.parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id TEXT NOT NULL,
  raid_type TEXT,
  boss_stage INTEGER,
  status TEXT NOT NULL DEFAULT 'recruiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.party_members (
  party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (party_id, player_id)
);

ALTER TABLE public.parties
ADD COLUMN IF NOT EXISTS raid_type TEXT,
ADD COLUMN IF NOT EXISTS boss_stage INTEGER,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'recruiting',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_parties_raid_target_status
ON public.parties (raid_type, boss_stage, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_party_members_player
ON public.party_members (player_id);

ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties REPLICA IDENTITY FULL;
ALTER TABLE public.party_members REPLICA IDENTITY FULL;

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
      AND tablename = 'parties'
      AND policyname = 'Anyone can read parties'
  ) THEN
    CREATE POLICY "Anyone can read parties"
      ON public.parties
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'parties'
      AND policyname = 'Anyone can insert parties'
  ) THEN
    CREATE POLICY "Anyone can insert parties"
      ON public.parties
      FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'parties'
      AND policyname = 'Anyone can update parties'
  ) THEN
    CREATE POLICY "Anyone can update parties"
      ON public.parties
      FOR UPDATE
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'parties'
      AND policyname = 'Anyone can delete parties'
  ) THEN
    CREATE POLICY "Anyone can delete parties"
      ON public.parties
      FOR DELETE
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'party_members'
      AND policyname = 'Anyone can read party_members'
  ) THEN
    CREATE POLICY "Anyone can read party_members"
      ON public.party_members
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'party_members'
      AND policyname = 'Anyone can insert party_members'
  ) THEN
    CREATE POLICY "Anyone can insert party_members"
      ON public.party_members
      FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'party_members'
      AND policyname = 'Anyone can update party_members'
  ) THEN
    CREATE POLICY "Anyone can update party_members"
      ON public.party_members
      FOR UPDATE
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'party_members'
      AND policyname = 'Anyone can delete party_members'
  ) THEN
    CREATE POLICY "Anyone can delete party_members"
      ON public.party_members
      FOR DELETE
      USING (true);
  END IF;

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
    ALTER PUBLICATION supabase_realtime ADD TABLE public.parties;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;

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
