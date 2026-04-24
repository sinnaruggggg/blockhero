import { getVisualRuntimeLayout } from '../../src/game/visualRuntimeLayout';

export const DEFAULT_REFERENCE_VIEWPORT = {
  width: 412,
  height: 915,
  safeTop: 34,
  safeBottom: 34,
};

export const DEVICE_PROFILES = [
  {
    id: 'galaxy-s23-ultra',
    label: '갤럭시 S23 울트라',
    viewport: { width: 412, height: 915, safeTop: 34, safeBottom: 34 },
  },
  {
    id: 'galaxy-a54',
    label: '갤럭시 A54',
    viewport: { width: 411, height: 891, safeTop: 32, safeBottom: 24 },
  },
  {
    id: 'galaxy-fold-cover',
    label: '갤럭시 폴드 커버',
    viewport: { width: 360, height: 780, safeTop: 30, safeBottom: 24 },
  },
  {
    id: 'iphone-15-pro',
    label: '아이폰 15 프로',
    viewport: { width: 393, height: 852, safeTop: 59, safeBottom: 34 },
  },
  {
    id: 'iphone-15-pro-max',
    label: '아이폰 15 프로 맥스',
    viewport: { width: 430, height: 932, safeTop: 59, safeBottom: 34 },
  },
  {
    id: 'small-android',
    label: '소형 안드로이드',
    viewport: { width: 360, height: 800, safeTop: 28, safeBottom: 24 },
  },
  {
    id: 'tablet-portrait',
    label: '태블릿 세로',
    viewport: { width: 800, height: 1280, safeTop: 24, safeBottom: 20 },
  },
];

export const SCREEN_LABELS = {
  level: '레벨 모드',
  endless: '무한 모드',
  battle: '대전 모드',
  raidNormal: '일반 레이드',
  raidBoss: '보스 레이드',
};

export const ELEMENT_DEFS = {
  level: [
    { id: 'header', label: '상단 헤더' },
    { id: 'battle_lane', label: '전투 HUD' },
    { id: 'board', label: '블록 보드' },
    { id: 'skill_effect', label: '스킬 이펙트' },
    { id: 'piece_tray', label: '블록 트레이' },
    { id: 'item_bar', label: '아이템 바' },
    { id: 'combo_gauge', label: '콤보 게이지' },
  ],
  endless: [
    { id: 'header', label: '상단 헤더' },
    { id: 'status_bar', label: '상태 바' },
    { id: 'summon_panel', label: '피버 패널' },
    { id: 'next_preview', label: '다음 블록' },
    { id: 'board', label: '블록 보드' },
    { id: 'skill_effect', label: '스킬 이펙트' },
    { id: 'piece_tray', label: '블록 트레이' },
    { id: 'item_bar', label: '아이템 바' },
    { id: 'combo_gauge', label: '콤보 게이지' },
  ],
  battle: [
    { id: 'back_button', label: '뒤로 버튼' },
    { id: 'opponent_panel', label: '상대 패널' },
    { id: 'attack_bar', label: '공격 바' },
    { id: 'board', label: '블록 보드' },
    { id: 'skill_effect', label: '스킬 이펙트' },
    { id: 'piece_tray', label: '블록 트레이' },
  ],
  raidNormal: [
    { id: 'top_panel', label: '상단 패널' },
    { id: 'skill_bar', label: '스킬 바' },
    { id: 'info_bar', label: '정보 바' },
    { id: 'board', label: '블록 보드' },
    { id: 'skill_effect', label: '스킬 이펙트' },
    { id: 'piece_tray', label: '블록 트레이' },
    { id: 'combo_gauge', label: '콤보 게이지' },
  ],
  raidBoss: [
    { id: 'top_panel', label: '상단 패널' },
    { id: 'skill_bar', label: '스킬 바' },
    { id: 'info_bar', label: '정보 바' },
    { id: 'board', label: '블록 보드' },
    { id: 'skill_effect', label: '스킬 이펙트' },
    { id: 'piece_tray', label: '블록 트레이' },
    { id: 'combo_gauge', label: '콤보 게이지' },
  ],
};

export const ELEMENT_HELP = {
  level: {
    header: '상단 헤더는 한 손으로 누르기 쉬운 위치인지 확인하세요.',
    battle_lane: '전투 HUD는 보드와 충돌하지 않게 여백을 두는 편이 안전합니다.',
    board: '보드는 기준 요소입니다. 다른 UI는 보드에 맞춰 정렬하세요.',
    skill_effect:
      '스킬 이펙트는 보드 위에 붙는 발동 레이어입니다. 보드 기준 위치를 크게 벗어나지 않게 맞추세요.',
    piece_tray: '블록 트레이는 하단 조작 영역과 겹치지 않게 맞추세요.',
    item_bar: '아이템 바는 트레이와 너무 가까우면 터치가 겹칩니다.',
    combo_gauge: '콤보 게이지는 보드 위를 가리지 않게 두는 편이 안정적입니다.',
  },
  endless: {
    header: '상단 헤더는 점수와 진행 정보가 잘 보이는지 확인하세요.',
    status_bar: '상태 바는 보드와 충돌하지 않도록 여백을 유지하세요.',
    summon_panel: '피버 패널은 상단 정보보다 아래에 두는 편이 읽기 쉽습니다.',
    next_preview: '다음 블록 영역은 보드와 너무 가까우면 답답하게 보입니다.',
    board: '무한 모드의 중심 조작 영역입니다.',
    skill_effect:
      '스킬 이펙트는 보드 중심 연출 레이어입니다. 콤보 게이지와 시선 충돌이 없는지 확인하세요.',
    piece_tray: '하단 조작 영역과 겹치지 않게 여유를 두세요.',
    item_bar: '아이템 바는 트레이와 충돌하지 않게 맞추세요.',
    combo_gauge: '콤보 게이지는 보드를 가리지 않게 배치하세요.',
  },
  battle: {
    back_button: '뒤로 버튼은 한 손으로도 누르기 쉬운지 확인하세요.',
    opponent_panel: '상대 패널은 상단 정보를 너무 가리지 않게 두세요.',
    attack_bar: '공격 바는 보드와 적당한 간격을 유지하세요.',
    board: '대전 모드의 중심 조작 영역입니다.',
    skill_effect:
      '스킬 이펙트는 대전 보드 위에서 발동합니다. 공격 바보다 아래, 보드 중심에 맞추는 편이 안정적입니다.',
    piece_tray: '하단 조작 영역과 겹치지 않게 조정하세요.',
  },
  raidNormal: {
    top_panel: '상단 패널은 보스 정보가 읽기 쉬운지 확인하세요.',
    skill_bar: '스킬 바는 보드 상단 여백을 너무 먹지 않게 배치하세요.',
    info_bar: '정보 바는 중요한 진행 정보가 잘 보이도록 두세요.',
    board: '레이드 조작의 중심 영역입니다.',
    skill_effect:
      '스킬 이펙트는 레이드 보드 위 발동 레이어입니다. 상태 카드와 겹치지 않게 보드 중심에 두세요.',
    piece_tray: '블록 트레이가 콤보 게이지와 겹치지 않게 조정하세요.',
    combo_gauge: '콤보 게이지는 보드 상단의 시야를 가리지 않게 두세요.',
  },
  raidBoss: {
    top_panel: '상단 패널은 보스 정보가 읽기 쉬운지 확인하세요.',
    skill_bar: '스킬 바는 보드 상단 여백을 너무 먹지 않게 배치하세요.',
    info_bar: '정보 바는 중요한 진행 정보가 잘 보이도록 두세요.',
    board: '레이드 조작의 중심 영역입니다.',
    skill_effect:
      '스킬 이펙트는 레이드 보드 위 발동 레이어입니다. 상태 카드와 겹치지 않게 보드 중심에 두세요.',
    piece_tray: '블록 트레이가 콤보 게이지와 겹치지 않게 조정하세요.',
    combo_gauge: '콤보 게이지는 보드 상단의 시야를 가리지 않게 두세요.',
  },
};

export const DEFAULT_RULE = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  widthScale: 1,
  heightScale: 1,
  opacity: 1,
  visible: true,
  zIndex: 0,
  safeAreaAware: false,
};

export const DEFAULT_GAMEPLAY_DRAG_TUNING = {
  liftOffsetCells: 2.5,
  centerOffsetXCells: 0,
  centerOffsetYCells: 0,
  dragDistanceScaleX: 1,
  dragDistanceScaleY: 1,
  snapMaxDistanceCells: 0.42,
  stickyThresholdCells: 0,
  snapSearchRadius: 1,
};

export const GAMEPLAY_SFX_EVENT_IDS = [
  'blockPlace',
  'blockPlaceFail',
  'lineClear',
  'combo',
  'levelUp',
  'skillUse',
  'reward',
  'button',
  'battleStart',
  'victory',
  'defeat',
  'raidEnter',
  'raidBossAppear',
  'matchingSuccess',
  'notice',
];

export const GAMEPLAY_BGM_TRACK_IDS = [
  'home',
  'level',
  'endless',
  'battle',
  'raidNormal',
  'raidBoss',
  'shop',
  'heroes',
  'lobby',
];

export const MAX_GAMEPLAY_AUDIO_VOLUME = 3;

export const DEFAULT_GAMEPLAY_SFX_RULE = {
  assetKey: null,
  volume: 3,
  cooldownMs: 40,
  allowOverlap: true,
  enabled: true,
};

export const DEFAULT_GAMEPLAY_BGM_RULE = {
  assetKey: null,
  volume: 1.5,
  loop: true,
  fadeInMs: 800,
  fadeOutMs: 500,
  enabled: true,
};

export const DEFAULT_GAMEPLAY_AUDIO_CONFIG = {
  masterVolume: 1,
  sfxVolume: 1,
  bgmVolume: 1,
  muted: false,
  sfx: Object.fromEntries(
    GAMEPLAY_SFX_EVENT_IDS.map(id => [id, clone(DEFAULT_GAMEPLAY_SFX_RULE)]),
  ),
  bgm: Object.fromEntries(
    GAMEPLAY_BGM_TRACK_IDS.map(id => [id, clone(DEFAULT_GAMEPLAY_BGM_RULE)]),
  ),
};

export const PREVIEW_LAYOUT = {
  level: {
    header: { left: 12, top: 52, width: 388, height: 70 },
    battle_lane: { left: 16, top: 132, width: 380, height: 116 },
    board: { left: 34, top: 270, width: 344, height: 344 },
    skill_effect: { left: 34, top: 270, width: 344, height: 344 },
    piece_tray: { left: 16, top: 704, width: 380, height: 130 },
    item_bar: { left: 28, top: 844, width: 356, height: 62 },
    combo_gauge: { left: 106, top: 278, width: 200, height: 42 },
  },
  endless: {
    header: { left: 12, top: 48, width: 388, height: 88 },
    status_bar: { left: 20, top: 150, width: 372, height: 52 },
    summon_panel: { left: 20, top: 210, width: 372, height: 64 },
    next_preview: { left: 20, top: 284, width: 372, height: 70 },
    board: { left: 34, top: 366, width: 344, height: 344 },
    skill_effect: { left: 34, top: 366, width: 344, height: 344 },
    piece_tray: { left: 16, top: 732, width: 380, height: 128 },
    item_bar: { left: 26, top: 870, width: 360, height: 44 },
    combo_gauge: { left: 106, top: 374, width: 200, height: 42 },
  },
  battle: {
    back_button: { left: 16, top: 48, width: 74, height: 56 },
    opponent_panel: { left: 102, top: 56, width: 208, height: 168 },
    attack_bar: { left: 20, top: 236, width: 372, height: 80 },
    board: { left: 34, top: 344, width: 344, height: 344 },
    skill_effect: { left: 34, top: 344, width: 344, height: 344 },
    piece_tray: { left: 16, top: 714, width: 380, height: 126 },
  },
  raidNormal: {
    top_panel: { left: 12, top: 34, width: 388, height: 188 },
    skill_bar: { left: 20, top: 232, width: 372, height: 54 },
    info_bar: { left: 20, top: 294, width: 372, height: 50 },
    board: { left: 34, top: 372, width: 344, height: 344 },
    skill_effect: { left: 34, top: 372, width: 344, height: 344 },
    piece_tray: { left: 16, top: 746, width: 380, height: 126 },
    combo_gauge: { left: 106, top: 380, width: 200, height: 42 },
  },
  raidBoss: {
    top_panel: { left: 12, top: 34, width: 388, height: 188 },
    skill_bar: { left: 20, top: 232, width: 372, height: 54 },
    info_bar: { left: 20, top: 294, width: 372, height: 50 },
    board: { left: 34, top: 372, width: 344, height: 344 },
    skill_effect: { left: 34, top: 372, width: 344, height: 344 },
    piece_tray: { left: 16, top: 746, width: 380, height: 126 },
    combo_gauge: { left: 106, top: 380, width: 200, height: 42 },
  },
};

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function sanitizeRule(rule) {
  const merged = { ...DEFAULT_RULE, ...(rule ?? {}) };
  return {
    offsetX: Math.round(clamp(numberOr(merged.offsetX, 0), -800, 800)),
    offsetY: Math.round(clamp(numberOr(merged.offsetY, 0), -1200, 1200)),
    scale: clamp(numberOr(merged.scale, 1), 0.3, 3),
    widthScale: clamp(numberOr(merged.widthScale, 1), 0.3, 3),
    heightScale: clamp(numberOr(merged.heightScale, 1), 0.3, 3),
    opacity: clamp(numberOr(merged.opacity, 1), 0, 1),
    visible: merged.visible !== false,
    zIndex: Math.round(clamp(numberOr(merged.zIndex, 0), -50, 100)),
    safeAreaAware: merged.safeAreaAware === true,
  };
}

export function sanitizeViewport(viewport) {
  const merged = { ...DEFAULT_REFERENCE_VIEWPORT, ...(viewport ?? {}) };
  return {
    width: Math.round(
      clamp(
        numberOr(merged.width, DEFAULT_REFERENCE_VIEWPORT.width),
        280,
        1600,
      ),
    ),
    height: Math.round(
      clamp(
        numberOr(merged.height, DEFAULT_REFERENCE_VIEWPORT.height),
        480,
        3200,
      ),
    ),
    safeTop: Math.round(clamp(numberOr(merged.safeTop, 0), 0, 240)),
    safeBottom: Math.round(clamp(numberOr(merged.safeBottom, 0), 0, 240)),
  };
}

export function createDefaultVisualManifest() {
  return {
    version: 0,
    referenceViewport: clone(DEFAULT_REFERENCE_VIEWPORT),
    gameplay: {
      dragTuning: clone(DEFAULT_GAMEPLAY_DRAG_TUNING),
      audio: clone(DEFAULT_GAMEPLAY_AUDIO_CONFIG),
    },
    studioSnapshots: {},
    screens: {
      level: {
        elements: Object.fromEntries(
          ELEMENT_DEFS.level.map(({ id }) => [id, clone(DEFAULT_RULE)]),
        ),
        backgrounds: { byWorld: {}, byLevel: {} },
      },
      endless: {
        elements: Object.fromEntries(
          ELEMENT_DEFS.endless.map(({ id }) => [id, clone(DEFAULT_RULE)]),
        ),
      },
      battle: {
        elements: Object.fromEntries(
          ELEMENT_DEFS.battle.map(({ id }) => [id, clone(DEFAULT_RULE)]),
        ),
      },
      raidNormal: {
        elements: Object.fromEntries(
          ELEMENT_DEFS.raidNormal.map(({ id }) => [id, clone(DEFAULT_RULE)]),
        ),
        backgrounds: { byBossStage: {} },
      },
      raidBoss: {
        elements: Object.fromEntries(
          ELEMENT_DEFS.raidBoss.map(({ id }) => [id, clone(DEFAULT_RULE)]),
        ),
        backgrounds: { byBossStage: {} },
      },
    },
  };
}

function sanitizeElementFrame(frame) {
  const merged = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    ...(frame ?? {}),
  };
  return {
    x: Math.round(clamp(numberOr(merged.x, 0), -2000, 4000)),
    y: Math.round(clamp(numberOr(merged.y, 0), -2000, 4000)),
    width: Math.round(clamp(numberOr(merged.width, 0), 0, 4000)),
    height: Math.round(clamp(numberOr(merged.height, 0), 0, 4000)),
  };
}

function sanitizeBackgroundOverride(value) {
  const merged = {
    assetKey: null,
    tintColor: '#000000',
    tintOpacity: 0,
    removeImage: false,
    ...(value ?? {}),
  };
  return {
    assetKey:
      typeof merged.assetKey === 'string' && merged.assetKey.trim().length > 0
        ? merged.assetKey.trim()
        : null,
    tintColor:
      typeof merged.tintColor === 'string' && merged.tintColor.trim().length > 0
        ? merged.tintColor.trim()
        : '#000000',
    tintOpacity: clamp(numberOr(merged.tintOpacity, 0), 0, 1),
    removeImage: merged.removeImage === true,
  };
}

function sanitizeBackgroundMap(values) {
  const result = {};
  Object.entries(values ?? {}).forEach(([key, value]) => {
    if (!key) {
      return;
    }
    result[key] = sanitizeBackgroundOverride(value);
  });
  return result;
}

export function sanitizeGameplayDragTuning(value) {
  const merged = { ...DEFAULT_GAMEPLAY_DRAG_TUNING, ...(value ?? {}) };
  return {
    liftOffsetCells: clamp(
      numberOr(
        merged.liftOffsetCells,
        DEFAULT_GAMEPLAY_DRAG_TUNING.liftOffsetCells,
      ),
      0.5,
      8,
    ),
    centerOffsetXCells: clamp(
      numberOr(
        merged.centerOffsetXCells,
        DEFAULT_GAMEPLAY_DRAG_TUNING.centerOffsetXCells,
      ),
      -3,
      3,
    ),
    centerOffsetYCells: clamp(
      numberOr(
        merged.centerOffsetYCells,
        DEFAULT_GAMEPLAY_DRAG_TUNING.centerOffsetYCells,
      ),
      -3,
      3,
    ),
    dragDistanceScaleX: clamp(
      numberOr(
        merged.dragDistanceScaleX,
        DEFAULT_GAMEPLAY_DRAG_TUNING.dragDistanceScaleX,
      ),
      0.5,
      2,
    ),
    dragDistanceScaleY: clamp(
      numberOr(
        merged.dragDistanceScaleY,
        DEFAULT_GAMEPLAY_DRAG_TUNING.dragDistanceScaleY,
      ),
      0.5,
      2,
    ),
    snapMaxDistanceCells: clamp(
      numberOr(
        merged.snapMaxDistanceCells,
        DEFAULT_GAMEPLAY_DRAG_TUNING.snapMaxDistanceCells,
      ),
      0,
      2.4,
    ),
    stickyThresholdCells: clamp(
      numberOr(
        merged.stickyThresholdCells,
        DEFAULT_GAMEPLAY_DRAG_TUNING.stickyThresholdCells,
      ),
      0,
      1.6,
    ),
    snapSearchRadius: Math.round(
      clamp(
        numberOr(
          merged.snapSearchRadius,
          DEFAULT_GAMEPLAY_DRAG_TUNING.snapSearchRadius,
        ),
        0,
        4,
      ),
    ),
  };
}

function sanitizeAssetKey(value) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

export function sanitizeGameplayAudioConfig(value) {
  const merged = { ...DEFAULT_GAMEPLAY_AUDIO_CONFIG, ...(value ?? {}) };
  return {
    masterVolume: clamp(
      numberOr(merged.masterVolume, DEFAULT_GAMEPLAY_AUDIO_CONFIG.masterVolume),
      0,
      MAX_GAMEPLAY_AUDIO_VOLUME,
    ),
    sfxVolume: clamp(
      numberOr(merged.sfxVolume, DEFAULT_GAMEPLAY_AUDIO_CONFIG.sfxVolume),
      0,
      MAX_GAMEPLAY_AUDIO_VOLUME,
    ),
    bgmVolume: clamp(
      numberOr(merged.bgmVolume, DEFAULT_GAMEPLAY_AUDIO_CONFIG.bgmVolume),
      0,
      MAX_GAMEPLAY_AUDIO_VOLUME,
    ),
    muted: merged.muted === true,
    sfx: Object.fromEntries(
      GAMEPLAY_SFX_EVENT_IDS.map(id => {
        const rule = {
          ...DEFAULT_GAMEPLAY_SFX_RULE,
          ...(merged.sfx?.[id] ?? {}),
        };
        return [
          id,
          {
            assetKey: sanitizeAssetKey(rule.assetKey),
            volume: clamp(
              numberOr(rule.volume, DEFAULT_GAMEPLAY_SFX_RULE.volume),
              0,
              MAX_GAMEPLAY_AUDIO_VOLUME,
            ),
            cooldownMs: Math.round(clamp(numberOr(rule.cooldownMs, 40), 0, 2000)),
            allowOverlap: rule.allowOverlap !== false,
            enabled: rule.enabled !== false,
          },
        ];
      }),
    ),
    bgm: Object.fromEntries(
      GAMEPLAY_BGM_TRACK_IDS.map(id => {
        const rule = {
          ...DEFAULT_GAMEPLAY_BGM_RULE,
          ...(merged.bgm?.[id] ?? {}),
        };
        return [
          id,
          {
            assetKey: sanitizeAssetKey(rule.assetKey),
            volume: clamp(
              numberOr(rule.volume, DEFAULT_GAMEPLAY_BGM_RULE.volume),
              0,
              MAX_GAMEPLAY_AUDIO_VOLUME,
            ),
            loop: rule.loop !== false,
            fadeInMs: Math.round(clamp(numberOr(rule.fadeInMs, 800), 0, 10000)),
            fadeOutMs: Math.round(clamp(numberOr(rule.fadeOutMs, 500), 0, 10000)),
            enabled: rule.enabled !== false,
          },
        ];
      }),
    ),
  };
}

export function sanitizeGameplayVisualConfig(value) {
  return {
    dragTuning: sanitizeGameplayDragTuning(value?.dragTuning),
    audio: sanitizeGameplayAudioConfig(value?.audio),
  };
}

function sanitizeStudioSnapshot(snapshot) {
  if (!snapshot) {
    return null;
  }
  const elementFrames = {};
  Object.entries(snapshot.elementFrames ?? {}).forEach(([elementId, frame]) => {
    elementFrames[elementId] = sanitizeElementFrame(frame);
  });

  const elementRules = {};
  Object.entries(snapshot.elementRules ?? {}).forEach(([elementId, rule]) => {
    elementRules[elementId] = sanitizeRule(rule);
  });

  return {
    assetKey:
      typeof snapshot.assetKey === 'string' &&
      snapshot.assetKey.trim().length > 0
        ? snapshot.assetKey.trim()
        : null,
    capturedAt:
      typeof snapshot.capturedAt === 'string' &&
      snapshot.capturedAt.trim().length > 0
        ? snapshot.capturedAt.trim()
        : '',
    viewport: sanitizeViewport(snapshot.viewport),
    referenceViewport: sanitizeViewport(snapshot.referenceViewport),
    elementFrames,
    elementRules,
  };
}

function sanitizeStudioSnapshots(raw) {
  const result = {};
  const legacyRaidSnapshot = raw?.raid;
  Object.keys(SCREEN_LABELS).forEach(screenId => {
    const snapshot = sanitizeStudioSnapshot(raw?.[screenId]);
    if (snapshot) {
      result[screenId] = snapshot;
    }
  });
  const raidSnapshot = sanitizeStudioSnapshot(legacyRaidSnapshot);
  if (raidSnapshot) {
    result.raidNormal = result.raidNormal ?? raidSnapshot;
    result.raidBoss = result.raidBoss ?? raidSnapshot;
  }
  return result;
}

export function ensureVisualManifest(raw) {
  const next = createDefaultVisualManifest();
  const value = raw ?? {};
  const legacyRaidScreen = value?.screens?.raid;
  next.version = Math.max(0, Math.round(numberOr(value.version, 0)));
  next.referenceViewport = sanitizeViewport(value.referenceViewport);
  next.gameplay = sanitizeGameplayVisualConfig(value.gameplay);
  next.studioSnapshots = sanitizeStudioSnapshots(value.studioSnapshots);
  Object.keys(ELEMENT_DEFS).forEach(screenId => {
    const sourceElements =
      screenId === 'raidNormal' || screenId === 'raidBoss'
        ? value?.screens?.[screenId]?.elements ?? legacyRaidScreen?.elements
        : value?.screens?.[screenId]?.elements;
    ELEMENT_DEFS[screenId].forEach(({ id }) => {
      next.screens[screenId].elements[id] = sanitizeRule(sourceElements?.[id]);
    });
  });
  next.screens.level.backgrounds.byWorld = sanitizeBackgroundMap(
    value?.screens?.level?.backgrounds?.byWorld,
  );
  next.screens.level.backgrounds.byLevel = sanitizeBackgroundMap(
    value?.screens?.level?.backgrounds?.byLevel,
  );
  const legacyRaidBackgrounds = legacyRaidScreen?.backgrounds?.byBossStage;
  next.screens.raidNormal.backgrounds.byBossStage = sanitizeBackgroundMap(
    value?.screens?.raidNormal?.backgrounds?.byBossStage ??
      legacyRaidBackgrounds,
  );
  next.screens.raidBoss.backgrounds.byBossStage = sanitizeBackgroundMap(
    value?.screens?.raidBoss?.backgrounds?.byBossStage ?? legacyRaidBackgrounds,
  );
  return next;
}

export function scaleRect(rect, viewport) {
  const widthRatio = viewport.width / DEFAULT_REFERENCE_VIEWPORT.width;
  const heightRatio = viewport.height / DEFAULT_REFERENCE_VIEWPORT.height;
  return {
    left: Math.round(rect.left * widthRatio),
    top: Math.round(rect.top * heightRatio),
    width: Math.round(rect.width * widthRatio),
    height: Math.round(rect.height * heightRatio),
  };
}

export function scaleRectBetweenViewports(
  rect,
  sourceViewport,
  targetViewport,
) {
  const widthRatio = targetViewport.width / Math.max(1, sourceViewport.width);
  const heightRatio =
    targetViewport.height / Math.max(1, sourceViewport.height);
  return {
    left: rect.left * widthRatio,
    top: rect.top * heightRatio,
    width: rect.width * widthRatio,
    height: rect.height * heightRatio,
  };
}

export function resolveVisualOffset(
  offsetX,
  offsetY,
  currentViewport,
  referenceViewport,
  safeAreaAware,
) {
  const safeWidthCurrent = Math.max(1, currentViewport.width);
  const safeWidthReference = Math.max(1, referenceViewport.width);
  const safeHeightCurrent = Math.max(
    1,
    currentViewport.height -
      (safeAreaAware
        ? currentViewport.safeTop + currentViewport.safeBottom
        : 0),
  );
  const safeHeightReference = Math.max(
    1,
    referenceViewport.height -
      (safeAreaAware
        ? referenceViewport.safeTop + referenceViewport.safeBottom
        : 0),
  );

  return {
    x: Math.round(offsetX * (safeWidthCurrent / safeWidthReference)),
    y: Math.round(offsetY * (safeHeightCurrent / safeHeightReference)),
  };
}

export function convertViewportDeltaToReference(
  dx,
  dy,
  currentViewport,
  referenceViewport,
  safeAreaAware,
) {
  const currentWidth = Math.max(1, currentViewport.width);
  const referenceWidth = Math.max(1, referenceViewport.width);
  const currentHeight = Math.max(
    1,
    currentViewport.height -
      (safeAreaAware
        ? currentViewport.safeTop + currentViewport.safeBottom
        : 0),
  );
  const referenceHeight = Math.max(
    1,
    referenceViewport.height -
      (safeAreaAware
        ? referenceViewport.safeTop + referenceViewport.safeBottom
        : 0),
  );

  return {
    x: dx * (referenceWidth / currentWidth),
    y: dy * (referenceHeight / currentHeight),
  };
}

export function getRule(manifest, screenId, elementId) {
  return manifest?.screens?.[screenId]?.elements?.[elementId] ?? DEFAULT_RULE;
}

export function getStudioSnapshot(manifest, screenId) {
  return manifest?.studioSnapshots?.[screenId] ?? null;
}

export function deriveBaseRectFromMeasuredFrame(
  frame,
  rule,
  currentViewport,
  referenceViewport,
) {
  const safeRule = sanitizeRule(rule);
  const offset = resolveVisualOffset(
    safeRule.offsetX,
    safeRule.offsetY,
    currentViewport,
    referenceViewport,
    safeRule.safeAreaAware,
  );
  const scaleX = Math.max(0.001, safeRule.scale * safeRule.widthScale);
  const scaleY = Math.max(0.001, safeRule.scale * safeRule.heightScale);
  const width = frame.width / scaleX;
  const height = frame.height / scaleY;
  return {
    left: frame.x - offset.x + (frame.width - width) / 2,
    top: frame.y - offset.y + (frame.height - height) / 2,
    width,
    height,
  };
}

export function getMeasuredBaseRect(
  manifest,
  screenId,
  elementId,
  targetViewport,
) {
  const snapshot = getStudioSnapshot(manifest, screenId);
  const frame = snapshot?.elementFrames?.[elementId];
  if (!snapshot || !frame) {
    return null;
  }
  const snapshotViewport = sanitizeViewport(snapshot.viewport);
  const snapshotReferenceViewport = sanitizeViewport(
    snapshot.referenceViewport ?? manifest?.referenceViewport,
  );
  const snapshotRule = snapshot.elementRules?.[elementId] ?? DEFAULT_RULE;
  const baseRect = deriveBaseRectFromMeasuredFrame(
    sanitizeElementFrame(frame),
    snapshotRule,
    snapshotViewport,
    snapshotReferenceViewport,
  );
  return scaleRectBetweenViewports(baseRect, snapshotViewport, targetViewport);
}

export function applyRuleToRect(
  rect,
  rule,
  currentViewport,
  referenceViewport,
) {
  const safeRule = sanitizeRule(rule);
  const offset = resolveVisualOffset(
    safeRule.offsetX,
    safeRule.offsetY,
    currentViewport,
    referenceViewport,
    safeRule.safeAreaAware,
  );
  const width = rect.width * safeRule.scale * safeRule.widthScale;
  const height = rect.height * safeRule.scale * safeRule.heightScale;
  return {
    left: rect.left + offset.x - (width - rect.width) / 2,
    top: rect.top + offset.y - (height - rect.height) / 2,
    width,
    height,
  };
}

export function getPreviewLayout(
  screenId,
  viewport = DEFAULT_REFERENCE_VIEWPORT,
) {
  return getVisualRuntimeLayout(screenId, sanitizeViewport(viewport));
}

export function formatElementLabel(screenId, elementId) {
  const meta = ELEMENT_DEFS[screenId]?.find(item => item.id === elementId);
  return meta ? meta.label : elementId;
}

