# BlockHero Creator

## 목적
- BlockHero 전용 PC 편집기입니다.
- 현재 게임의 배치/스테이지/배경 초안을 불러와 수정하고 서버에 저장합니다.
- 저장된 draft를 publish하면 일반 유저 앱이 새 설정을 내려받아 사용합니다.

## 실행 방법

### exe 실행
1. 루트에서 [run-blockhero-creator-exe.bat](/C:/www/game/blockhero_codex/run-blockhero-creator-exe.bat)을 실행합니다.
2. 처음 실행이고 `blockhero-creator.local.json`이 없으면 작은 설정창이 뜹니다.
3. 그 창에 관리자 이메일과 비밀번호를 한 번만 입력합니다.
4. 설정 파일이 만들어지면 다음부터는 로그인 창 없이 자동으로 실행됩니다.

### 웹 실행
1. 루트에서 [run-blockhero-creator.bat](/C:/www/game/blockhero_codex/run-blockhero-creator.bat)을 실행합니다.
2. 브라우저에서 `http://localhost:4273`을 엽니다.
3. 관리자 계정으로 로그인합니다.

## 처음 한 번 필요한 것
- 관리자 이메일
- 관리자 비밀번호

이 정보는 `blockhero-creator.local.json` 파일에 로컬 저장됩니다.

## 자동 로그인 파일
- 파일명: `blockhero-creator.local.json`
- 위치: 저장소 루트 또는 exe와 같은 폴더
- Git에는 포함되지 않습니다.
- 예시는 [blockhero-creator.local.example.json](/C:/www/game/blockhero_codex/blockhero-creator.local.example.json)에 있습니다.

예시:

```json
{
  "supabaseUrl": "https://alhlmdhixmlmsdvgzhdu.supabase.co",
  "supabaseAnonKey": "YOUR_SUPABASE_ANON_KEY",
  "email": "admin@example.com",
  "password": "YOUR_ADMIN_PASSWORD",
  "autoLogin": true
}
```

## 실행 흐름
1. 로컬 자동 로그인 파일 확인
2. 있으면 자동 로그인
3. 없으면 설정창 표시
4. draft 불러오기
5. draft가 없으면 latest release 불러오기
6. 그것도 없으면 기본 manifest로 새 draft 생성

## 편집 가능한 항목
- 레벨 스테이지
  - 이름
  - 월드/스테이지 번호
  - 목표 수치
  - 적 템플릿
  - 보상
  - 배경
- 일반 레이드
  - 이름
  - 단계
  - 제한 시간
  - 참가 규칙
  - 보상
  - 배경
- 보스 레이드
  - 이름
  - 단계
  - 제한 시간
  - 참가 인원
  - 보상
  - 배경
- 적 템플릿
  - 이름
  - 색상
  - HP
  - 공격력
  - 공격 주기
  - 패턴

## 서버 테이블
- draft: `creator_draft`
- release: `creator_releases`
- asset: `ui_assets`

## 권장 사용 순서
1. 항목 선택
2. 값 수정
3. `Draft 저장`
4. 다른 항목 확인
5. 배포 메모 작성
6. `Publish`
7. 폰에서 실제 반영 확인
8. 문제 있으면 릴리즈 이력에서 rollback
