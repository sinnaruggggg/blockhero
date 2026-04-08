# BlockHero Creator

## 목적
- 현재 게임 코드의 기본 레벨, 레이드, 적 템플릿, 배경 설정을 초안으로 불러옵니다.
- 관리자 계정으로 수정한 내용을 `creator_draft`에 저장하고 `creator_releases`로 배포합니다.
- 일반 유저 앱은 published creator manifest를 받아와 로컬 캐시에 저장한 뒤 사용합니다.

## 실행 방법

### 웹 편집기
1. 루트에서 [run-blockhero-creator.bat](/C:/www/game/blockhero_codex/run-blockhero-creator.bat)을 실행합니다.
2. 브라우저에서 `http://localhost:4273`이 열립니다.
3. 관리자 계정으로 로그인하면 draft 또는 최신 배포본이 자동으로 불러와집니다.

### exe 실행기
1. 루트에서 [run-blockhero-creator-exe.bat](/C:/www/game/blockhero_codex/run-blockhero-creator-exe.bat)을 실행합니다.
2. 처음 실행이라 `blockhero-creator.local.json`이 없으면, 관리자 이메일과 비밀번호를 한 번만 입력받아 로컬 설정 파일을 만듭니다.
3. 그 다음부터는 로그인 화면 없이 자동 로그인됩니다.
4. 또는 `tools/blockhero-creator-desktop/dist` 아래의 최신 `BlockHero Creator *.exe`를 직접 실행할 수도 있습니다.

## 첫 사용 흐름
1. 첫 실행 시 로컬 자동 로그인 설정 저장
2. draft 자동 불러오기
3. draft가 없으면 최신 published release 불러오기
4. published도 없으면 기본 manifest를 생성해서 draft로 저장
5. 좌측 트리에서 편집할 항목 선택
6. 우측에서 값 수정
7. `Draft 저장`
8. `Publish`

## 편집 가능한 항목
- 레벨 스테이지
  - 이름
  - 월드 / 스테이지 번호
  - 목표 수치
  - 적 템플릿 연결
  - 보상
  - 배경
- 일반 레이드
  - 이름
  - 단계
  - 시간 제한
  - 참가 규칙
  - 보상
  - 배경
- 보스 레이드
  - 이름
  - 단계
  - 시간 제한
  - 참가 인원
  - 보상
  - 배경
- 적 템플릿
  - 이름
  - 이모지
  - 색상
  - HP / 공격력
  - 공격 주기
  - 패턴

## 자동 불러오기 규칙
- draft가 있으면 draft를 우선 사용합니다.
- draft가 없고 published release가 있으면 최신 published release를 불러옵니다.
- 둘 다 없으면 기본 manifest를 로드해서 새 draft를 만듭니다.
- exe에서는 `blockhero-creator.local.json`이 있으면 자동 로그인까지 수행합니다.

## 로컬 자동 로그인 파일
- 파일명: `blockhero-creator.local.json`
- 위치: 저장소 루트 또는 exe 옆 폴더
- Git에는 포함되지 않습니다.
- 예시는 [blockhero-creator.local.example.json](/C:/www/game/blockhero_codex/blockhero-creator.local.example.json) 입니다.
- 이 파일에는 관리자 이메일과 비밀번호가 평문으로 저장되므로, 본인 PC에서만 사용해야 합니다.

## 서버 테이블
- draft: `creator_draft`
- release: `creator_releases`
- 배경 자산: `ui_assets`

## 권장 운영 순서
1. 항목 선택
2. 값 수정
3. `Draft 저장`
4. 다른 항목 점검
5. 배포 메모 작성
6. `Publish`
7. 앱에서 실제 반영 확인
8. 문제 있으면 `릴리즈 이력`에서 롤백
