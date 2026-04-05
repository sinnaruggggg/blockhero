-- 앱 업데이트 버전 관리 테이블
CREATE TABLE IF NOT EXISTS app_versions (
  id SERIAL PRIMARY KEY,
  version_code INTEGER NOT NULL,
  version_name TEXT NOT NULL,
  download_url TEXT NOT NULL,
  release_notes TEXT DEFAULT '',
  force_update BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능
CREATE POLICY "app_versions_read" ON app_versions
  FOR SELECT USING (true);

-- 사용법:
-- 1. Supabase Storage에 APK 업로드 (bucket: apk)
-- 2. 이 테이블에 새 버전 INSERT:
--    INSERT INTO app_versions (version_code, version_name, download_url, release_notes, force_update)
--    VALUES (2, '1.1', 'https://alhlmdhixmlmsdvgzhdu.supabase.co/storage/v1/object/public/apk/blockhero_v1.1.apk', '버그 수정 및 성능 개선', false);
