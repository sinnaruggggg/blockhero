-- ============================================
-- Cubricks - Supabase 전체 테이블 셋업
-- SQL Editor에 붙여넣고 실행하세요
-- ============================================

-- ============================================
-- 0. profiles 테이블 (auth.users 연동)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL DEFAULT 'Player',
    avatar_url TEXT,
    provider TEXT DEFAULT 'email',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 본인 프로필만 읽기/수정 가능
CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 다른 유저 닉네임 조회용 (대전 모드)
CREATE POLICY "Anyone can read nicknames"
    ON profiles FOR SELECT
    USING (true);

-- 회원가입 시 자동으로 profiles 생성하는 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, nickname, provider)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'nickname',
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            'Player'
        ),
        COALESCE(
            NEW.raw_app_meta_data->>'provider',
            'email'
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 있으면 삭제 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 1. rooms 테이블
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'waiting',
    seed INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기존 테이블에 seed 컬럼 추가 (이미 테이블이 있는 경우)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS seed INTEGER;

ALTER TABLE rooms REPLICA IDENTITY FULL;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can insert rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rooms" ON rooms FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete rooms" ON rooms FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- 2. players 테이블
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    room_code TEXT NOT NULL,
    player_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    board JSONB,
    game_over BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE players REPLICA IDENTITY FULL;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read players" ON players FOR SELECT USING (true);
CREATE POLICY "Anyone can insert players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update players" ON players FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete players" ON players FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- 3. matching_queue 테이블
CREATE TABLE IF NOT EXISTS matching_queue (
    id SERIAL PRIMARY KEY,
    player_id TEXT NOT NULL UNIQUE,
    nickname TEXT NOT NULL,
    status TEXT DEFAULT 'waiting',
    room_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE matching_queue REPLICA IDENTITY FULL;
ALTER TABLE matching_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read matching_queue" ON matching_queue FOR SELECT USING (true);
CREATE POLICY "Anyone can insert matching_queue" ON matching_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update matching_queue" ON matching_queue FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete matching_queue" ON matching_queue FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE matching_queue;

-- 오래된 대기열 자동 정리 함수
CREATE OR REPLACE FUNCTION cleanup_old_matching()
RETURNS void AS $$
BEGIN
    DELETE FROM matching_queue WHERE created_at < NOW() - INTERVAL '5 minutes';
    DELETE FROM rooms WHERE created_at < NOW() - INTERVAL '1 hour';
    DELETE FROM players WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
