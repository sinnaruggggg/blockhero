-- Add nickname_changed flag to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname_changed BOOLEAN DEFAULT FALSE;

-- Create unique index on nickname for duplicate checking
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_nickname_unique ON profiles (nickname) WHERE nickname IS NOT NULL;
