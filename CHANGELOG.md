# BlockHero 작업 정리

## v1.3.17-codex (2026-04-05)

### 레이드 진입 안정성 보강
- **문제 1**: 레이드 로비 첫 진입 시 `focus` 이벤트를 놓치면 로딩 스피너가 유지될 수 있었음
- **문제 2**: 레이드 전투 초기화 중 로컬 저장/서버 조회가 멈추면 준비 단계에서 복구 없이 대기할 수 있었음
- **수정**
  - `src/screens/RaidLobbyScreen.tsx`
    - 마운트 직후 `loadData()` 즉시 실행
    - 요청 번호와 마운트 상태를 함께 추적해 늦은 응답이 최신 상태를 덮지 못하게 정리
  - `src/screens/RaidScreen.tsx`
    - 플레이어/스킨/캐릭터/레이드 인스턴스/참가자 초기 조회에 timeout 방어 추가
    - 초기화가 멈추면 레이드 연결 실패 알림 후 홈으로 복귀하도록 정리
  - `__tests__/raidLobbyLoad.test.tsx`
    - `focus` 이벤트 없이도 초기 마운트만으로 레이드 로비 로드가 시작되는지 검증 추가

## v1.3.16-codex+raidfix (2026-04-05)

### 레이드 모드 접속 무한 로딩 수정
- **증상**: 일부 환경에서 레이드 화면 첫 진입 시 `RaidLobbyScreen`이 `focus` 이벤트를 기다리기만 해서 로딩 스피너가 끝나지 않음
- **원인**: 초기 데이터 로드를 `navigation.addListener('focus', loadData)`에만 의존하고, 마운트 직후에는 `loadData()`를 직접 호출하지 않음
- **수정 (`src/screens/RaidLobbyScreen.tsx`)**:
  - 화면 마운트 직후 `loadData()`를 즉시 실행하도록 변경
  - 중복/지연 응답이 최신 상태를 덮지 않도록 요청 번호와 마운트 상태를 함께 추적
  - 플레이어 프로필 조회도 timeout 경로에 포함해 로딩 상태가 더 안전하게 종료되도록 정리
- **검증 (`__tests__/raidLobbyLoad.test.tsx`)**:
  - `focus` 이벤트를 따로 발생시키지 않아도 초기 마운트만으로 데이터 로드가 시작되는지 테스트 추가

## v1.2 (2026-03-26)

### 블록 미리보기 위치 정밀도 개선
- **문제**: 드래그 중 블록 배치 미리보기(고스트)가 왼쪽 위로 치우침
- **원인**: `screenToBoard`에서 `Math.floor`로 정수 셀 좌표를 구한 뒤, `getPieceOrigin`에서 `Math.round`로 중심을 반올림하는 2단계 반올림 오차 누적
- **수정 (`src/game/useDragDrop.ts`)**:
  - `screenToBoardRaw` → `screenToBoardFloat`: 부동소수점 좌표 반환
  - 셀 중앙이 정수값에 매핑되도록 `- cellSize/2` 오프셋 적용
  - `getPieceOrigin`: 최종 원점에서만 `Math.round` 1회 반올림
  - 결과: 셀 왼쪽반은 왼쪽, 오른쪽반은 오른쪽으로 대칭 배분 (±0.5셀 이내)

### 특수 블록 5종 추가
각 100다이아, 상점에서 구매 → 게임 중 아이템바에서 사용

| 이름 | 모양 | 셀 수 |
|------|------|-------|
| 3×3 정사각형 | 꽉찬 사각형 | 9 |
| 2×3 직사각형 | 가로/세로 랜덤 | 6 |
| 5칸 긴 줄 | 가로/세로 랜덤 | 5 |
| 숫자 2 블록 | 숫자 2 모양 | 9 |
| 대각선 블록 | 방향 랜덤 | 3 |

**수정 파일**:
- `src/constants/index.ts` — PIECE_SHAPES 인덱스 20~27 추가
- `src/constants/shopItems.ts` — SPECIAL_PIECE_ITEMS 배열 추가
- `src/stores/gameStore.ts` — GameData.items에 piece_* 키 추가
- `src/components/ItemBar.tsx` — 보유한 특수블록 아이콘 표시 (ScrollView)
- `src/screens/ShopScreen.tsx` — 특수 블록 섹션 추가
- `src/screens/EndlessScreen.tsx` / `SingleGameScreen.tsx` — 특수블록 사용 로직
- `src/game/engine.ts` — `generateSpecificPiece()` 함수 추가
- `src/i18n/index.ts` — 특수블록 번역 추가

### GitHub 기반 자동 업데이트
- **이전**: Supabase `app_versions` 테이블에서 버전 체크 + Supabase 스토리지에서 APK 다운로드
- **변경**: GitHub Releases API에서 latest 릴리스 체크 + GitHub에서 APK 직접 다운로드
- **리포**: `sinnaruggggg/blockhero`
- **수정 (`src/services/updateService.ts`)**:
  - `https://api.github.com/repos/sinnaruggggg/blockhero/releases/latest` 호출
  - 태그 `v1.2` → 버전코드 12로 파싱, 앱 내 `CURRENT_VERSION_CODE`와 비교
  - APK asset URL로 다운로드 → 설치

**새 버전 배포 절차**:
1. `src/services/updateService.ts`에서 `CURRENT_VERSION_CODE`, `CURRENT_VERSION_NAME` 올림
2. APK 빌드
3. `gh release create v{버전} apk파일 --title "v{버전}" --notes "릴리스노트"`

---

## v1.2.6 (2026-03-30)

### 캐릭터 스프라이트 애니메이션 시스템 구축

#### KnightSprite / MageSprite 컴포넌트 신규 작성
- `src/components/KnightSprite.tsx` — 기사 아이들 애니메이션 (90프레임, 핑퐁)
- `src/components/MageSprite.tsx` — 매지션 아이들 애니메이션 (100프레임, 핑퐁)
- 스프라이트 시트를 2장으로 분할 (Android 텍스처 8192px 제한 대응)
  - knight_idle_a.png (프레임 0-44), knight_idle_b.png (프레임 45-89)
  - mage_idle_a.png (프레임 0-49), mage_idle_b.png (프레임 50-99)
- **핑퐁 루프**: `PING_PONG_LEN = TOTAL_FRAMES * 2 - 2` — 첫/끝 프레임 점프 없이 자연스럽게 반복
- **프레임 이동**: `transform: [translateX, translateY]` 사용 (left/top은 Android 릴리즈 빌드에서 재렌더 안 됨)
- **깜빡임 수정**: 두 시트를 항상 렌더 트리에 유지, opacity로만 전환 → source 교체 시 디코딩 공백 제거

#### HomeScreen 캐릭터 표시
- 기사/매지션 선택에 따라 해당 Sprite 컴포넌트 렌더
- `unstable_batchedUpdates`로 `setSelectedChar` + `setGameData` 단일 렌더 보장 → 캐릭터 없는 화면 깜빡임 제거
- 데이터 로드 전 배경 이미지만 표시 (검정 공백 방지)
- 매지션: `scaleX: -1`로 오른쪽을 바라보도록 반전
- 기사/매지션 크기 1.3배 축소 (`KNIGHT_SIZE / 1.3`)

#### 기사 발아래 그림자
- 원형 그림자, 기사보다 먼저 JSX 렌더(뒤 레이어) → 기사 발이 그림자 위에 올라옴
- `position: 'absolute'`, `bottom` 기준 위치 고정
- 크기: `KNIGHT_DISPLAY_SIZE * 0.27 * 1.44` (가로) × `0.27` (세로)
- `transform: [{translateX: KNIGHT_DISPLAY_SIZE * 0.065}]`로 오른쪽 오프셋

#### LobbyScreen (대기화면)
- 인라인 스프라이트 코드 제거 → `MageSprite` 컴포넌트 공유 사용

### 레이드 로비 무한 로딩 수정
- `RaidLobbyScreen` `loadData` 전체를 `try-catch-finally`로 감싸 `setLoading(false)` 항상 실행되도록 수정

### 스프라이트 이미지 생성 (Python)
- `이미지/UI/매지션스프라이트.png` (10×10 그리드) → 왼쪽 방향, 배경 제거, 2장 분할
- `이미지/UI/기사스프라이트.png` (9×10 그리드, 700×956px/프레임) → 배경 제거, 2장 분할
- `Image.NEAREST` 보간으로 원본 화질 유지
