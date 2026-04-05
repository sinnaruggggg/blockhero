-- Add session_id to user_presence for duplicate login prevention
ALTER TABLE user_presence ADD COLUMN IF NOT EXISTS session_id TEXT DEFAULT NULL;
