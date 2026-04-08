# BlockHero Creator

## 목적
- 현재 게임 코드 기준의 레벨, 일반 레이드, 보스 레이드, 적 템플릿 데이터를 자동으로 draft로 가져옵니다.
- 관리자 계정이 PC에서 수정한 뒤 `creator_draft`에 저장하고 `creator_releases`로 publish 합니다.
- 일반 유저 앱은 publish된 creator manifest를 시작 시 한 번 내려받아 로컬에 캐시합니다.

## 실행
1. 루트의 [run-blockhero-creator.bat](/C:/www/game/blockhero_codex/run-blockhero-creator.bat)을 실행합니다.
2. 브라우저가 `http://localhost:4273`을 엽니다.
3. 관리자 이메일/비밀번호로 로그인합니다.
4. draft 또는 latest published manifest가 자동으로 로드됩니다.

## 주요 기능
- 레벨/일반 레이드/보스 레이드/적 템플릿 트리
- 선택 항목 상세 폼 편집
- assetKey 기반 배경 자산 라이브러리와 업로드
- draft 저장
- publish
- 릴리즈 이력 확인 및 rollback
- 전체 manifest JSON 복사/수동 적용

## 자동 불러오기 규칙
- draft가 있으면 draft 우선
- draft가 없고 published release가 있으면 latest release 사용
- 둘 다 없으면 [default-creator-manifest.json](/C:/www/game/blockhero_codex/tools/blockhero-creator/default-creator-manifest.json)을 불러와 draft를 자동 생성

## 데이터 저장 위치
- draft: `creator_draft`
- release: `creator_releases`
- 배경 자산: `ui_assets`

## 권장 운영 흐름
1. PC Creator에서 draft 수정
2. publish 메모 작성
3. Draft 저장
4. Publish
5. 폰에서 실제 레벨/레이드 한 번씩 열어 최종 검수
