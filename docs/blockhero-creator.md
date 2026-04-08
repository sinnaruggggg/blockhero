# BlockHero Creator

## 목적
- 현재 게임 코드의 기본 레벨/레이드/적 템플릿을 초안으로 불러옵니다.
- 관리자 계정으로 수정한 내용을 `creator_draft`에 저장하고 `creator_releases`로 배포합니다.
- 일반 유저 앱은 published creator manifest를 내려받아 로컬 캐시에 저장해 사용합니다.

## PC 실행 방법
### 개발용 웹 실행
1. 루트에서 [run-blockhero-creator.bat](/C:/www/game/blockhero_codex/run-blockhero-creator.bat)을 실행합니다.
2. 브라우저에서 `http://localhost:4273`이 열립니다.
3. 관리자 계정으로 로그인하면 draft 또는 최신 배포본이 자동으로 불러와집니다.

### Windows 실행 파일
1. 루트에서 `npm run creator:exe`를 실행합니다.
2. 빌드가 끝나면 `tools/blockhero-creator-desktop/dist` 아래에 `BlockHero Creator` 실행 파일이 생성됩니다.
3. 생성된 `.exe`를 실행하면 브라우저 없이 데스크톱 앱으로 편집기를 사용할 수 있습니다.
4. 이후에는 [run-blockhero-creator-exe.bat](/C:/www/game/blockhero_codex/run-blockhero-creator-exe.bat)을 더블클릭해 바로 실행할 수 있습니다.

## 주요 기능
- 레벨 / 일반 레이드 / 보스 레이드 / 적 템플릿 트리 편집
- 항목별 상세 수치 편집
- 배경 assetKey 업로드 및 연결
- draft 저장
- publish
- 릴리즈 이력 확인 및 rollback
- 전체 manifest JSON 복사 / 붙여넣기

## 자동 불러오기 규칙
- draft가 있으면 draft를 우선 사용합니다.
- draft가 없고 published release가 있으면 최신 published release를 불러옵니다.
- 둘 다 없으면 기본 manifest를 로드해서 새 draft를 만들 수 있습니다.

## 서버 테이블
- draft: `creator_draft`
- release: `creator_releases`
- 배경 자산: `ui_assets`

## 권장 운영 순서
1. Creator에서 draft 수정
2. 배포 메모 작성
3. Draft 저장
4. Publish
5. 폰 앱에서 실제 화면 검수
