# 2026-04-07 Announcement Admin Update

## Done
- 관리자 공지 작성 화면에 `수정` 기능 추가
- 공지에 `이미지 URL` 입력 지원
- 관리자 화면에서 갤러리 이미지를 선택해 공지에 첨부 지원
- 공지 이미지는 `data URI` 또는 URL로 저장되며 추가 SQL 없이 동작
- 홈 화면 공지를 `Alert` 대신 상세 모달로 변경
- 홈 공지 모달에서 제목, 본문, 첨부 이미지 표시

## Notes
- 공지 이미지 기능은 `announcements.content` 안에 `[[image:...]]` 마커를 저장하는 방식
- 기존 공지는 이미지 없이 그대로 읽힘
- Supabase 스키마 추가 작업은 필요 없음

## Validation
- `npx tsc --noEmit`
- `android\\gradlew.bat assembleRelease`

## Release Checklist
- 버전 올리기
- `main` 푸시
- 태그 `vX.Y.Z` 푸시
- `scripts/wait-for-github-release.ps1 -Version X.Y.Z`로 latest release 전환 확인

## Remaining
- 없음
