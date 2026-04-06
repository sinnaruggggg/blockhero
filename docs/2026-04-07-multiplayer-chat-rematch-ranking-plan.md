# 2026-04-07 작업 기록

## 완료된 작업

### 1. 대전 로비 / 레이드 로비 실시간 모집 채팅
- 대전 로비와 레이드 로비에 공통 `채팅 버튼`을 추가했다.
- 버튼으로 채팅 패널을 열고 닫을 수 있다.
- Supabase Realtime `presence + broadcast` 기반으로 실시간 메시지를 주고받는다.
- 접속 시마다 채널을 랜덤 배정한다.
- 채널당 정원은 `30명`으로 제한했다.
- 현재 채널 번호와 인원 수를 표시한다.
- 채널 칩을 눌러 다른 채널로 이동할 수 있다.
- `랜덤` 버튼으로 다시 랜덤 채널 재배정이 가능하다.
- 적용 화면:
  - `src/screens/LobbyScreen.tsx`
  - `src/screens/RaidLobbyScreen.tsx`
- 공통 로직:
  - `src/hooks/useLobbyChat.ts`
  - `src/components/LobbyChatPanel.tsx`
  - `src/game/lobbyChatChannels.ts`

### 2. 레벨 모드 최초 블록 변경 버그 수정
- 레벨 모드 시작 직후 하단 첫 블록 팩이 한 번 더 재생성되면서 다른 블록으로 바뀌던 문제를 수정했다.
- 원인은 캐릭터/스킨 로딩 전 임시 팩 생성 후, 로딩 완료 뒤 다시 팩을 생성하던 구조였다.
- 수정 후에는 캐릭터/스킨 초기화가 끝난 뒤 최초 팩을 한 번만 생성한다.
- 적용 파일:
  - `src/screens/SingleGameScreen.tsx`

### 3. 블록 배치 이펙트 전 모드 공통화
- 배치 이펙트를 블록 중심 1점 이펙트에서 `놓인 블록 전체 셀 기준` 이펙트로 변경했다.
- 기존보다 더 작은 크기로 줄였고, 더 짧은 시간 안에 빠르게 끝나는 형태로 바꿨다.
- 적용 모드:
  - 레벨 모드
  - 무한 모드
  - 레이드 모드
  - 대전 모드
- 공통 구현:
  - `src/components/PiecePlacementEffect.tsx`
  - `src/game/piecePlacementEffect.ts`
- 적용 화면:
  - `src/screens/SingleGameScreen.tsx`
  - `src/screens/EndlessScreen.tsx`
  - `src/screens/RaidScreen.tsx`
  - `src/screens/BattleScreen.tsx`

### 4. 대전 모드 재도전 흐름 추가
- 대전 판이 끝난 뒤 바로 홈으로 나가지 않도록 수정했다.
- 종료 후 `재도전` 또는 `대전 로비로`를 선택할 수 있다.
- 두 플레이어가 모두 `재도전`을 누른 경우 같은 방에서 새 시드로 즉시 재시작한다.
- 한 명이라도 재도전을 거절하면 대전 로비로 복귀한다.
- 적용 파일:
  - `src/screens/BattleScreen.tsx`

## 남은 작업

### 기능적 후속 작업
- 로비 채팅은 현재 `실시간 세션형 채팅`이다.
  - 채팅 이력 저장 없음
  - 금칙어/차단/신고 기능 없음
  - 완전한 서버 권위 채널 정원 보장은 아님
- 현재 채널 정원 30명 제한은 `presence 기반 분산`이므로 동시 접속 경합이 심한 순간에는 짧게 오차가 날 수 있다.
- 대전 재도전은 `같은 방 즉시 재시작`만 지원한다.
  - 재도전 제한 시간
  - best-of-3 세트전
  - 재도전 거절 시 전적 기록 화면
  는 아직 없다.

### 랭킹 시스템 구현 전 선행 권장 작업
- 랭킹 집계용 서버 테이블 설계
- 기간별 스냅샷 배치 또는 Edge Function 집계
- 핵 방지를 위한 모드별 서버 검증 지표 정리
- 대전 랭킹용 매치 결과 확정 로직 서버 권위화

## 랭킹 시스템 플랜

### 공통 원칙
- 일일 / 주간 / 월간 랭킹을 각 모드별로 별도 운영한다.
- 원본 데이터는 반드시 서버 저장으로 집계한다.
- 클라이언트가 계산한 최종 점수만 저장하지 말고, 집계에 필요한 원시 지표도 함께 서버에 기록한다.
- 각 기간 랭킹은 `누적형`과 `베스트런형`을 혼합한다.
- 과도한 노가다 우위를 막기 위해 모드별로 `최고 기록 반영` 또는 `상위 N회 반영` 규칙을 둔다.

### 모드별 제안

#### 1. 레벨 모드
- 목적: 스테이지 숙련도와 완성도 반영
- 집계 방식:
  - 기간 내 `각 스테이지 최고 기록만 반영`
  - 전체 기간 점수는 반영된 스테이지 점수 합산
- 추천 점수식:
  - `stage_score = stage_base + star_bonus + hp_bonus + combo_bonus + no_item_bonus`
  - `stage_base = world * 1000 + stage_in_world * 120`
  - `star_bonus = stars * 250`
  - `hp_bonus = floor(remaining_hp_ratio * 200)`
  - `combo_bonus = min(max_combo, 20) * 15`
  - `no_item_bonus = 150 if used_battle_item == false else 0`
- 이유:
  - 같은 스테이지 반복 파밍보다 더 높은 완성도 클리어를 유도할 수 있다.
  - 별, 생존력, 콤보 숙련도를 동시에 반영할 수 있다.

#### 2. 무한 모드
- 목적: 순수 실력형 점수 랭킹
- 집계 방식:
  - 기간 내 `최고 단일 런 점수` 기준
- 추천 점수식:
  - 기본값은 현재 무한 모드 `최종 점수` 그대로 사용
  - 보조 지표는 동률 처리용으로만 사용
  - 동률 우선순위:
    1. 더 높은 최고 점수
    2. 더 높은 도달 레벨
    3. 더 높은 최대 콤보
    4. 더 적은 사용 아이템
- 이유:
  - 무한 모드는 본질적으로 하이스코어형이라 누적합보다 최고 기록이 더 자연스럽다.
  - 일일/주간/월간 모두 동일 규칙을 써도 유저가 이해하기 쉽다.

#### 3. 레이드 모드
- 목적: 보스 기여도와 고단계 공략 기여 반영
- 집계 분리:
  - 일반 레이드 랭킹
  - 보스 레이드 랭킹
- 일반 레이드 추천 점수식:
  - `normal_raid_points = stage * 400 + total_damage + clear_bonus`
  - `clear_bonus = 600 if boss_defeated else 0`
  - 기간 합산은 `상위 20회`만 반영
- 보스 레이드 추천 점수식:
  - `boss_raid_points = stage * 700 + total_damage + clear_bonus + ranking_bonus`
  - `clear_bonus = 1200 if defeated else 0`
  - `ranking_bonus = {1위: 500, 2위: 300, 3위: 150}`
  - 기간 합산은 `상위 15회`만 반영
- 이유:
  - 단순 누적 대미지만 보면 무한 반복 플레이가 너무 유리해진다.
  - 상위 N회 반영으로 실력과 기여도를 살리면서도 과도한 반복 우위를 줄일 수 있다.

#### 4. 대전 모드
- 목적: 승률보다 실력 기반 경쟁도 반영
- 추천 구조:
  - `레이팅 랭킹`을 메인으로 사용
  - 기간별 랭킹은 해당 기간 동안 변동한 `rated_score` 기준
- 추천 점수식:
  - 기본은 ELO/MMR 방식
  - 매 경기 종료 후:
    - 승리 시 상대 레이팅 기반 가중 획득
    - 패배 시 상대 레이팅 기반 차감
  - 추가 보정:
    - 연승 보정은 작게
    - 빠른 승리 보너스는 미세하게만
    - 아이템/특수 효과는 점수식 보정에 넣지 않음
- 기간별 표시값:
  - 일간: 기간 종료 시점 최고 레이팅
  - 주간: 기간 종료 시점 최고 레이팅
  - 월간: 기간 종료 시점 최고 레이팅
- 이유:
  - 단순 승수 누적은 플레이 시간 많은 유저에게 지나치게 유리하다.
  - 레이팅 기반이 가장 공정하고 이해 가능하다.

## 서버 저장 권장 데이터

### 레벨 모드
- `user_id`
- `period_key`
- `level_id`
- `world`
- `stage`
- `stars`
- `remaining_hp`
- `max_combo`
- `used_item`
- `stage_score`

### 무한 모드
- `user_id`
- `period_key`
- `run_id`
- `score`
- `level`
- `max_combo`
- `used_items`

### 레이드 모드
- `user_id`
- `period_key`
- `raid_type`
- `boss_stage`
- `instance_id`
- `total_damage`
- `clear_rank`
- `defeated`
- `raid_points`

### 대전 모드
- `user_id`
- `period_key`
- `match_id`
- `result`
- `opponent_rating`
- `rating_before`
- `rating_after`
- `rating_delta`

## 구현 우선순위 제안
1. 무한 모드 최고 점수 랭킹부터 먼저 구현
2. 레벨 모드 스테이지 최고점 랭킹 추가
3. 레이드 상위 N회 합산 랭킹 추가
4. 대전 레이팅 랭킹 추가
5. 일일 / 주간 / 월간 보상 연결
