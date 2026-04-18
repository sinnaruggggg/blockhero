-- ============================================
-- Cubricks Admin 기능 DB 셋업
-- SQL Editor에서 실행하세요
-- ============================================

-- 1. profiles에 is_admin 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 관리자 본인 확인용 함수
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. announcements 테이블 (공지사항)
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 모든 유저가 활성 공지 읽기 가능
CREATE POLICY "Anyone can read active announcements"
    ON announcements FOR SELECT
    USING (is_active = true OR is_admin());

-- 관리자만 CRUD 가능
CREATE POLICY "Admins can insert announcements"
    ON announcements FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update announcements"
    ON announcements FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete announcements"
    ON announcements FOR DELETE
    USING (is_admin());

-- updated_at 트리거
DROP TRIGGER IF EXISTS announcements_updated_at ON announcements;
CREATE TRIGGER announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. resource_grants 테이블 (재화 지급)
-- 앱에서 로그인 시 pending 상태인 지급을 확인하고 적용
CREATE TABLE IF NOT EXISTS resource_grants (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    grant_type TEXT NOT NULL, -- 'stars', 'diamonds', 'hearts', 'refresh', 'heal_small', 'heal_medium', 'heal_large', 'power_small', 'power_medium', 'power_large', 'addTurns'
    amount INTEGER NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'claimed'
    granted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    claimed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE resource_grants ENABLE ROW LEVEL SECURITY;

-- 유저 본인의 지급 내역만 읽기 가능
CREATE POLICY "Users can read own grants"
    ON resource_grants FOR SELECT
    USING (auth.uid() = user_id OR is_admin());

-- 유저 본인의 pending 지급을 claimed로 업데이트 가능
CREATE POLICY "Users can claim own grants"
    ON resource_grants FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id AND status = 'claimed');

-- 관리자만 지급 생성 가능
CREATE POLICY "Admins can insert grants"
    ON resource_grants FOR INSERT
    WITH CHECK (is_admin());

-- 관리자는 모든 지급 내역 관리 가능
CREATE POLICY "Admins can update grants"
    ON resource_grants FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete grants"
    ON resource_grants FOR DELETE
    USING (is_admin());

-- 4. 관리자용 프로필 조회 정책 (모든 유저 목록)
-- 기존 정책과 별개로, 관리자는 모든 프로필 조회 가능
CREATE POLICY "Admins can read all profiles"
    ON profiles FOR SELECT
    USING (is_admin());

-- 5. 관리자용 통계 뷰
CREATE OR REPLACE VIEW admin_stats AS
SELECT
    (SELECT COUNT(*) FROM profiles) AS total_users,
    (SELECT COUNT(*) FROM profiles WHERE created_at::date = CURRENT_DATE) AS today_signups,
    (SELECT COUNT(*) FROM rooms WHERE status = 'waiting' OR status = 'playing') AS active_rooms,
    (SELECT COUNT(*) FROM matching_queue WHERE status = 'waiting') AS queue_size;

-- 뷰 접근 권한 (관리자 전용 - RPC로 호출)
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE(total_users BIGINT, today_signups BIGINT, active_rooms BIGINT, queue_size BIGINT) AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    RETURN QUERY SELECT
        (SELECT COUNT(*) FROM profiles)::BIGINT,
        (SELECT COUNT(*) FROM profiles WHERE created_at::date = CURRENT_DATE)::BIGINT,
        (SELECT COUNT(*) FROM rooms WHERE status IN ('waiting', 'playing'))::BIGINT,
        (SELECT COUNT(*) FROM matching_queue WHERE status = 'waiting')::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 관리자용 유저 목록 함수 (auth.users 이메일 포함)
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE(
    id UUID,
    email TEXT,
    nickname TEXT,
    provider TEXT,
    is_admin BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    RETURN QUERY
    SELECT
        p.id,
        u.email::TEXT,
        p.nickname,
        p.provider,
        p.is_admin,
        p.created_at
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 관리자 계정 설정 (본인 이메일로 변경하세요)
-- ============================================
-- UPDATE profiles SET is_admin = true WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
