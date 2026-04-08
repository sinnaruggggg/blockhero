# BlockHero Creator 복구 플랜

## 목표
- PC용 BlockHero Creator를 관리자 운영 도구로 실제 사용할 수 있는 상태까지 복구한다.
- 최소 기준은 아래와 같다.
  - exe 실행 가능
  - 한글 UI 정상 표시
  - 관리자 로그인 가능
  - draft 자동 불러오기 가능
  - published fallback 가능
  - 기본 manifest fallback 가능
  - draft 저장 / publish / rollback 동작

## 확인된 문제
1. 편집기 화면 문자열에 인코딩 손상이 남아 있었다.
2. 첫 실행 시 저장된 세션이 없으면 즉시 오류처럼 보이는 흐름이었다.
3. 문서와 실행 안내가 깨져 있어 실제 사용자가 어디서 시작해야 하는지 알기 어려웠다.
4. exe 실행은 되었지만 로그인부터 저장/배포까지의 사용 흐름이 정리되지 않았다.

## 작업 단계

### 1. UI 문자열 복구
- `tools/blockhero-creator/index.html` 한글 텍스트 재작성
- `tools/blockhero-creator/creator.js`의 편집기 제목, 설명, 버튼, 토스트, 확인 메시지 복구
- `docs/blockhero-creator.md` 사용 설명 재작성

### 2. 세션 복원 흐름 수정
- 첫 실행 시에는 조용히 세션 복원을 시도
- 세션이 없으면 로그인 카드만 보이고 오류 토스트는 띄우지 않음
- `세션 복원` 버튼을 눌렀을 때만 안내 메시지 표시

### 3. 편집/배포 흐름 점검
- draft 조회
- 최신 published 조회
- 기본 manifest fallback
- draft 저장
- publish
- rollback

### 4. 실행 경로 점검
- 웹 실행기
- exe 실행기
- 로컬 저장 세션 복원

## 검수 체크리스트
- exe가 실행된다.
- 로그인 카드가 깨지지 않는다.
- 관리자 로그인 후 workspace가 열린다.
- draft 또는 published가 자동으로 불러와진다.
- 항목 선택 시 상세 편집기가 열린다.
- Draft 저장이 된다.
- Publish가 된다.
- Rollback이 된다.

## 완료 기준
- “실행은 되지만 뭐부터 해야 하는지 모르겠다” 상태가 아니어야 한다.
- 관리자 계정으로 로그인한 뒤 레벨 하나를 수정해서 draft 저장까지 끝낼 수 있어야 한다.
