# Main Lobby UI Release 2026-05-04

## 작업 범위
- `이미지/UI/메인로비` 안의 마젠타 시트를 기준으로 메인로비 버튼 UI를 다시 생성했다.
- 이벤트 버튼은 사용자가 제공한 `배경제거` 폴더의 투명 PNG를 기준으로 유지했다.
- 프로필 카드와 재화 바의 동적 텍스트 베이스, 플레이 패널 베이스는 기존 정상 에셋을 보존했다.

## 생성 기준
- 사이드 버튼 7종: `02_side_buttons.png`
- 설정 버튼/로고: `01_top_hud_logo.png`
- 레벨 시작 버튼: `03_play_panel_modes.png`
- 모드 버튼: 메인로비 기준 비율 보존
- 하단 네비: `04_bottom_nav.png`

## 눌림 상태
- 눌림 상태 PNG는 기본 상태보다 내부 UI가 약간 아래로 내려가도록 생성했다.
- 터치 영역과 기존 배치 좌표는 변경하지 않았다.

## 검수 항목
- `scripts/regenerate_main_lobby_ui_assets.py`로 UI 재생성
- `scripts/verify_main_lobby_assets.py` 통과
- 상태별 미리보기: `output/main_lobby_ui_state_preview.png`
- 전체 합성 미리보기: `output/main_lobby_state_verification.png`
- Android release APK 빌드 후 실기기 홈 화면/버튼 눌림 상태 캡처 확인 예정

## 릴리즈
- 대상 버전: `1.3.104`
- 대상 태그: `v1.3.104`
