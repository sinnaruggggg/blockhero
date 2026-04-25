export type VisualScreenId =
  | 'level'
  | 'endless'
  | 'battle'
  | 'raidNormal'
  | 'raidBoss';

export type VisualCharacterId =
  | 'knight'
  | 'mage'
  | 'archer'
  | 'rogue'
  | 'healer';

export type VisualViewport = {
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
};

export type VisualElementFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type VisualDeviceProfile = {
  id: string;
  label: string;
  viewport: VisualViewport;
};

export type LevelElementId =
  | 'header'
  | 'battle_lane'
  | 'board'
  | 'skill_effect'
  | 'piece_tray'
  | 'item_bar'
  | 'combo_gauge';

export type EndlessElementId =
  | 'header'
  | 'status_bar'
  | 'summon_panel'
  | 'next_preview'
  | 'board'
  | 'skill_effect'
  | 'piece_tray'
  | 'item_bar'
  | 'combo_gauge';

export type BattleElementId =
  | 'back_button'
  | 'opponent_panel'
  | 'attack_bar'
  | 'next_preview'
  | 'board'
  | 'skill_effect'
  | 'piece_tray';

export type RaidElementId =
  | 'top_panel'
  | 'skill_bar'
  | 'info_bar'
  | 'next_preview'
  | 'board'
  | 'skill_effect'
  | 'piece_tray'
  | 'combo_gauge';

export type VisualElementId =
  | LevelElementId
  | EndlessElementId
  | BattleElementId
  | RaidElementId;

export type VisualElementRule = {
  offsetX: number;
  offsetY: number;
  scale: number;
  widthScale: number;
  heightScale: number;
  opacity: number;
  visible: boolean;
  zIndex: number;
  safeAreaAware: boolean;
};

export type VisualCharacterElementOverrides<T extends string> = Partial<
  Record<VisualCharacterId, Partial<Record<T, VisualElementRule>>>
>;

export type VisualBackgroundOverride = {
  assetKey: string | null;
  tintColor: string;
  tintOpacity: number;
  removeImage: boolean;
};

export type GameplayDragTuning = {
  liftOffsetCells: number;
  centerOffsetXCells: number;
  centerOffsetYCells: number;
  dragDistanceScaleX: number;
  dragDistanceScaleY: number;
  snapMaxDistanceCells: number;
  stickyThresholdCells: number;
  snapSearchRadius: number;
};

export type GameplaySfxEventId =
  | 'blockPlace'
  | 'blockPlaceFail'
  | 'lineClear'
  | 'combo'
  | 'levelUp'
  | 'skillUse'
  | 'reward'
  | 'button'
  | 'battleStart'
  | 'victory'
  | 'defeat'
  | 'raidEnter'
  | 'raidBossAppear'
  | 'matchingSuccess'
  | 'notice';

export type GameplayBgmTrackId =
  | 'home'
  | 'level'
  | 'endless'
  | 'battle'
  | 'raidNormal'
  | 'raidBoss'
  | 'shop'
  | 'heroes'
  | 'lobby';

export type GameplaySfxRule = {
  assetKey: string | null;
  volume: number;
  cooldownMs: number;
  allowOverlap: boolean;
  enabled: boolean;
};

export type GameplayBgmRule = {
  assetKey: string | null;
  volume: number;
  loop: boolean;
  fadeInMs: number;
  fadeOutMs: number;
  enabled: boolean;
};

export type GameplayAudioConfig = {
  masterVolume: number;
  sfxVolume: number;
  bgmVolume: number;
  muted: boolean;
  sfx: Record<GameplaySfxEventId, GameplaySfxRule>;
  bgm: Record<GameplayBgmTrackId, GameplayBgmRule>;
};

export type GameplayVisualConfig = {
  dragTuning: GameplayDragTuning;
  audio: GameplayAudioConfig;
};

export type LevelScreenVisualConfig = {
  elements: Record<LevelElementId, VisualElementRule>;
  characterElements: VisualCharacterElementOverrides<LevelElementId>;
  backgrounds: {
    byWorld: Record<string, VisualBackgroundOverride>;
    byLevel: Record<string, VisualBackgroundOverride>;
  };
};

export type EndlessScreenVisualConfig = {
  elements: Record<EndlessElementId, VisualElementRule>;
  characterElements: VisualCharacterElementOverrides<EndlessElementId>;
};

export type BattleScreenVisualConfig = {
  elements: Record<BattleElementId, VisualElementRule>;
  characterElements: VisualCharacterElementOverrides<BattleElementId>;
};

export type RaidScreenVisualConfig = {
  elements: Record<RaidElementId, VisualElementRule>;
  characterElements: VisualCharacterElementOverrides<RaidElementId>;
  backgrounds: {
    byBossStage: Record<string, VisualBackgroundOverride>;
  };
};

export type VisualConfigManifest = {
  version: number;
  referenceViewport: VisualViewport;
  gameplay: GameplayVisualConfig;
  studioSnapshots?: Partial<
    Record<
      VisualScreenId,
      {
        assetKey: string | null;
        capturedAt: string;
        viewport: VisualViewport;
        referenceViewport: VisualViewport;
        elementFrames: Record<string, VisualElementFrame>;
        elementRules: Record<string, VisualElementRule>;
      }
    >
  >;
  screens: {
    level: LevelScreenVisualConfig;
    endless: EndlessScreenVisualConfig;
    battle: BattleScreenVisualConfig;
    raidNormal: RaidScreenVisualConfig;
    raidBoss: RaidScreenVisualConfig;
  };
};

export const VISUAL_SCREEN_LABELS: Record<VisualScreenId, string> = {
  level: '레벨 모드',
  endless: '무한 모드',
  battle: '대전 모드',
  raidNormal: '일반 레이드',
  raidBoss: '보스 레이드',
};

export const VISUAL_CHARACTER_IDS: VisualCharacterId[] = [
  'knight',
  'mage',
  'archer',
  'rogue',
  'healer',
];

export const VISUAL_CHARACTER_LABELS: Record<VisualCharacterId, string> = {
  knight: '기사',
  mage: '마법사',
  archer: '궁수',
  rogue: '도적',
  healer: '힐러',
};

export const DEFAULT_VISUAL_REFERENCE_VIEWPORT: VisualViewport = {
  width: 412,
  height: 915,
  safeTop: 34,
  safeBottom: 34,
};

export const VISUAL_DEVICE_PROFILES: VisualDeviceProfile[] = [
  {
    id: 'current',
    label: '현재 기기',
    viewport: DEFAULT_VISUAL_REFERENCE_VIEWPORT,
  },
  {
    id: 'galaxy-s23-ultra',
    label: 'Galaxy S23 Ultra',
    viewport: { width: 412, height: 915, safeTop: 34, safeBottom: 34 },
  },
  {
    id: 'galaxy-a54',
    label: 'Galaxy A54',
    viewport: { width: 411, height: 891, safeTop: 32, safeBottom: 24 },
  },
  {
    id: 'galaxy-fold-cover',
    label: 'Galaxy Fold Cover',
    viewport: { width: 360, height: 780, safeTop: 30, safeBottom: 24 },
  },
  {
    id: 'iphone-15-pro',
    label: 'iPhone 15 Pro',
    viewport: { width: 393, height: 852, safeTop: 59, safeBottom: 34 },
  },
  {
    id: 'iphone-15-pro-max',
    label: 'iPhone 15 Pro Max',
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

export const VISUAL_ELEMENT_LABELS: Record<
  VisualScreenId,
  { id: string; label: string }[]
> = {
  level: [
    { id: 'header', label: '상단 헤더' },
    { id: 'battle_lane', label: '전투 HUD' },
    { id: 'board', label: '블록 보드' },
    { id: 'piece_tray', label: '블록 트레이' },
    { id: 'item_bar', label: '아이템 바' },
    { id: 'combo_gauge', label: '콤보 게이지' },
  ],
  endless: [
    { id: 'header', label: '상단 헤더' },
    { id: 'status_bar', label: '상태 바' },
    { id: 'next_preview', label: '다음 블록' },
    { id: 'board', label: '블록 보드' },
    { id: 'piece_tray', label: '블록 트레이' },
    { id: 'item_bar', label: '아이템 바' },
    { id: 'combo_gauge', label: '콤보 게이지' },
  ],
  battle: [
    { id: 'back_button', label: '뒤로 버튼' },
    { id: 'opponent_panel', label: '상대 패널' },
    { id: 'attack_bar', label: '공격 바' },
    { id: 'next_preview', label: '다음 블록' },
    { id: 'board', label: '블록 보드' },
    { id: 'piece_tray', label: '블록 트레이' },
  ],
  raidNormal: [
    { id: 'top_panel', label: '상단 패널' },
    { id: 'skill_bar', label: '스킬 바' },
    { id: 'info_bar', label: '정보 바' },
    { id: 'next_preview', label: '다음 블록' },
    { id: 'board', label: '블록 보드' },
    { id: 'piece_tray', label: '블록 트레이' },
    { id: 'combo_gauge', label: '콤보 게이지' },
  ],
  raidBoss: [
    { id: 'top_panel', label: '상단 패널' },
    { id: 'skill_bar', label: '스킬 바' },
    { id: 'info_bar', label: '정보 바' },
    { id: 'next_preview', label: '다음 블록' },
    { id: 'board', label: '블록 보드' },
    { id: 'piece_tray', label: '블록 트레이' },
    { id: 'combo_gauge', label: '콤보 게이지' },
  ],
};

export const DEFAULT_VISUAL_ELEMENT_RULE: VisualElementRule = {
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

export const DEFAULT_VISUAL_BACKGROUND_OVERRIDE: VisualBackgroundOverride = {
  assetKey: null,
  tintColor: '#000000',
  tintOpacity: 0,
  removeImage: false,
};

export const DEFAULT_GAMEPLAY_DRAG_TUNING: GameplayDragTuning = {
  liftOffsetCells: 2.5,
  centerOffsetXCells: 0,
  centerOffsetYCells: 0,
  dragDistanceScaleX: 1,
  dragDistanceScaleY: 1,
  snapMaxDistanceCells: 0.42,
  stickyThresholdCells: 0,
  snapSearchRadius: 1,
};

export const GAMEPLAY_SFX_EVENT_IDS: GameplaySfxEventId[] = [
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

export const GAMEPLAY_BGM_TRACK_IDS: GameplayBgmTrackId[] = [
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

export const GAMEPLAY_SFX_LABELS: Record<GameplaySfxEventId, string> = {
  blockPlace: '블록 놓기',
  blockPlaceFail: '블록 놓기 실패',
  lineClear: '줄 클리어',
  combo: '콤보',
  levelUp: '레벨업',
  skillUse: '스킬 사용',
  reward: '보상 획득',
  button: '버튼 클릭',
  battleStart: '전투 시작',
  victory: '승리',
  defeat: '패배',
  raidEnter: '레이드 입장',
  raidBossAppear: '레이드 보스 등장',
  matchingSuccess: '매칭 성공',
  notice: '알림/팝업',
};

export const GAMEPLAY_BGM_LABELS: Record<GameplayBgmTrackId, string> = {
  home: '홈',
  level: '레벨 모드',
  endless: '무한 모드',
  battle: '대전 모드',
  raidNormal: '일반 레이드',
  raidBoss: '보스 레이드',
  shop: '상점',
  heroes: '영웅',
  lobby: '로비/매칭',
};

export const MAX_GAMEPLAY_AUDIO_VOLUME = 3;

export const DEFAULT_GAMEPLAY_SFX_RULE: GameplaySfxRule = {
  assetKey: null,
  volume: 3,
  cooldownMs: 40,
  allowOverlap: true,
  enabled: true,
};

export const DEFAULT_GAMEPLAY_BGM_RULE: GameplayBgmRule = {
  assetKey: null,
  volume: 1.5,
  loop: true,
  fadeInMs: 800,
  fadeOutMs: 500,
  enabled: true,
};

function createDefaultGameplaySfxMap(): Record<GameplaySfxEventId, GameplaySfxRule> {
  return GAMEPLAY_SFX_EVENT_IDS.reduce(
    (acc, id) => {
      acc[id] = {...DEFAULT_GAMEPLAY_SFX_RULE};
      return acc;
    },
    {} as Record<GameplaySfxEventId, GameplaySfxRule>,
  );
}

function createDefaultGameplayBgmMap(): Record<GameplayBgmTrackId, GameplayBgmRule> {
  return GAMEPLAY_BGM_TRACK_IDS.reduce(
    (acc, id) => {
      acc[id] = {...DEFAULT_GAMEPLAY_BGM_RULE};
      return acc;
    },
    {} as Record<GameplayBgmTrackId, GameplayBgmRule>,
  );
}

export const DEFAULT_GAMEPLAY_AUDIO_CONFIG: GameplayAudioConfig = {
  masterVolume: 1,
  sfxVolume: 1,
  bgmVolume: 1,
  muted: false,
  sfx: createDefaultGameplaySfxMap(),
  bgm: createDefaultGameplayBgmMap(),
};

function cloneRule(): VisualElementRule {
  return { ...DEFAULT_VISUAL_ELEMENT_RULE };
}

function createRules<T extends string>(ids: T[]): Record<T, VisualElementRule> {
  return ids.reduce((acc, id) => {
    acc[id] = cloneRule();
    return acc;
  }, {} as Record<T, VisualElementRule>);
}

function createRaidRules(ids: RaidElementId[]): Record<RaidElementId, VisualElementRule> {
  const rules = createRules<RaidElementId>(ids);
  // RAID_FIX: raid board starts as the lowest layer, while combo and skill
  // overlays stay visible and remain adjustable in PC edit mode via zIndex.
  rules.board.zIndex = -20;
  rules.skill_effect.zIndex = 20;
  rules.combo_gauge.zIndex = 40;
  return rules;
}

export const DEFAULT_VISUAL_CONFIG_MANIFEST: VisualConfigManifest = {
  version: 0,
  referenceViewport: DEFAULT_VISUAL_REFERENCE_VIEWPORT,
  gameplay: {
    dragTuning: { ...DEFAULT_GAMEPLAY_DRAG_TUNING },
    audio: JSON.parse(JSON.stringify(DEFAULT_GAMEPLAY_AUDIO_CONFIG)),
  },
  screens: {
    level: {
      elements: createRules<LevelElementId>([
        'header',
        'battle_lane',
        'board',
        'skill_effect',
        'piece_tray',
        'item_bar',
        'combo_gauge',
      ]),
      characterElements: {},
      backgrounds: {
        byWorld: {},
        byLevel: {},
      },
    },
    endless: {
      elements: createRules<EndlessElementId>([
        'header',
        'status_bar',
        'summon_panel',
        'next_preview',
        'board',
        'skill_effect',
        'piece_tray',
        'item_bar',
        'combo_gauge',
      ]),
      characterElements: {},
    },
    battle: {
      elements: createRules<BattleElementId>([
        'back_button',
        'opponent_panel',
        'attack_bar',
        'next_preview',
        'board',
        'skill_effect',
        'piece_tray',
      ]),
      characterElements: {},
    },
    raidNormal: {
      elements: createRaidRules([
        'top_panel',
        'skill_bar',
        'info_bar',
        'next_preview',
        'board',
        'skill_effect',
        'piece_tray',
        'combo_gauge',
      ]),
      characterElements: {},
      backgrounds: {
        byBossStage: {},
      },
    },
    raidBoss: {
      elements: createRaidRules([
        'top_panel',
        'skill_bar',
        'info_bar',
        'next_preview',
        'board',
        'skill_effect',
        'piece_tray',
        'combo_gauge',
      ]),
      characterElements: {},
      backgrounds: {
        byBossStage: {},
      },
    },
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function numberOr(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeGameplayDragTuning(
  value?: Partial<GameplayDragTuning> | null,
): GameplayDragTuning {
  const merged = {
    ...DEFAULT_GAMEPLAY_DRAG_TUNING,
    ...(value ?? {}),
  };

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

function sanitizeAssetKey(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function sanitizeGameplaySfxRule(
  value?: Partial<GameplaySfxRule> | null,
): GameplaySfxRule {
  const merged = {
    ...DEFAULT_GAMEPLAY_SFX_RULE,
    ...(value ?? {}),
  };

  return {
    assetKey: sanitizeAssetKey(merged.assetKey),
    volume: clamp(
      numberOr(merged.volume, DEFAULT_GAMEPLAY_SFX_RULE.volume),
      0,
      MAX_GAMEPLAY_AUDIO_VOLUME,
    ),
    cooldownMs: Math.round(
      clamp(
        numberOr(merged.cooldownMs, DEFAULT_GAMEPLAY_SFX_RULE.cooldownMs),
        0,
        2000,
      ),
    ),
    allowOverlap: merged.allowOverlap !== false,
    enabled: merged.enabled !== false,
  };
}

function sanitizeGameplayBgmRule(
  value?: Partial<GameplayBgmRule> | null,
): GameplayBgmRule {
  const merged = {
    ...DEFAULT_GAMEPLAY_BGM_RULE,
    ...(value ?? {}),
  };

  return {
    assetKey: sanitizeAssetKey(merged.assetKey),
    volume: clamp(
      numberOr(merged.volume, DEFAULT_GAMEPLAY_BGM_RULE.volume),
      0,
      MAX_GAMEPLAY_AUDIO_VOLUME,
    ),
    loop: merged.loop !== false,
    fadeInMs: Math.round(
      clamp(
        numberOr(merged.fadeInMs, DEFAULT_GAMEPLAY_BGM_RULE.fadeInMs),
        0,
        10000,
      ),
    ),
    fadeOutMs: Math.round(
      clamp(
        numberOr(merged.fadeOutMs, DEFAULT_GAMEPLAY_BGM_RULE.fadeOutMs),
        0,
        10000,
      ),
    ),
    enabled: merged.enabled !== false,
  };
}

function sanitizeGameplayAudioConfig(
  value?: Partial<GameplayAudioConfig> | null,
): GameplayAudioConfig {
  const merged = {
    ...DEFAULT_GAMEPLAY_AUDIO_CONFIG,
    ...(value ?? {}),
  };

  const sfx = GAMEPLAY_SFX_EVENT_IDS.reduce(
    (acc, id) => {
      acc[id] = sanitizeGameplaySfxRule(
        (merged.sfx as Partial<Record<GameplaySfxEventId, GameplaySfxRule>> | undefined)?.[id],
      );
      return acc;
    },
    {} as Record<GameplaySfxEventId, GameplaySfxRule>,
  );

  const bgm = GAMEPLAY_BGM_TRACK_IDS.reduce(
    (acc, id) => {
      acc[id] = sanitizeGameplayBgmRule(
        (merged.bgm as Partial<Record<GameplayBgmTrackId, GameplayBgmRule>> | undefined)?.[id],
      );
      return acc;
    },
    {} as Record<GameplayBgmTrackId, GameplayBgmRule>,
  );

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
    sfx,
    bgm,
  };
}

function sanitizeGameplayVisualConfig(
  value?: Partial<GameplayVisualConfig> | null,
): GameplayVisualConfig {
  return {
    dragTuning: sanitizeGameplayDragTuning(value?.dragTuning),
    audio: sanitizeGameplayAudioConfig(value?.audio),
  };
}

function sanitizeElementRule(
  value?: Partial<VisualElementRule> | null,
): VisualElementRule {
  const merged = {
    ...DEFAULT_VISUAL_ELEMENT_RULE,
    ...(value ?? {}),
  };

  return {
    offsetX: Math.round(clamp(Number(merged.offsetX) || 0, -480, 480)),
    offsetY: Math.round(clamp(Number(merged.offsetY) || 0, -720, 720)),
    scale: clamp(Number(merged.scale) || 1, 0.3, 3),
    widthScale: clamp(Number(merged.widthScale) || 1, 0.3, 3),
    heightScale: clamp(Number(merged.heightScale) || 1, 0.3, 3),
    opacity: clamp(Number(merged.opacity) || 1, 0, 1),
    visible: merged.visible !== false,
    zIndex: Math.round(clamp(Number(merged.zIndex) || 0, -20, 60)),
    safeAreaAware: merged.safeAreaAware === true,
  };
}

function sanitizeViewport(
  value?: Partial<VisualViewport> | null,
): VisualViewport {
  const merged = {
    ...DEFAULT_VISUAL_REFERENCE_VIEWPORT,
    ...(value ?? {}),
  };

  return {
    width: Math.round(
      clamp(
        Number(merged.width) || DEFAULT_VISUAL_REFERENCE_VIEWPORT.width,
        280,
        1600,
      ),
    ),
    height: Math.round(
      clamp(
        Number(merged.height) || DEFAULT_VISUAL_REFERENCE_VIEWPORT.height,
        480,
        3200,
      ),
    ),
    safeTop: Math.round(clamp(Number(merged.safeTop) || 0, 0, 200)),
    safeBottom: Math.round(clamp(Number(merged.safeBottom) || 0, 0, 200)),
  };
}

function sanitizeElementFrame(
  value?: Partial<VisualElementFrame> | null,
): VisualElementFrame {
  const merged = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    ...(value ?? {}),
  };

  return {
    x: Math.round(clamp(Number(merged.x) || 0, -2000, 4000)),
    y: Math.round(clamp(Number(merged.y) || 0, -2000, 4000)),
    width: Math.round(clamp(Number(merged.width) || 0, 0, 4000)),
    height: Math.round(clamp(Number(merged.height) || 0, 0, 4000)),
  };
}

function sanitizeStudioSnapshots(
  value?: Partial<
    Record<
      VisualScreenId,
      {
        assetKey?: string | null;
        capturedAt?: string;
        viewport?: Partial<VisualViewport>;
        referenceViewport?: Partial<VisualViewport>;
        elementFrames?: Record<string, Partial<VisualElementFrame>>;
        elementRules?: Record<string, Partial<VisualElementRule>>;
      }
    >
  > | null,
) {
  const sanitizeSnapshot = (
    snapshot?: {
      assetKey?: string | null;
      capturedAt?: string;
      viewport?: Partial<VisualViewport>;
      referenceViewport?: Partial<VisualViewport>;
      elementFrames?: Record<string, Partial<VisualElementFrame>>;
      elementRules?: Record<string, Partial<VisualElementRule>>;
    } | null,
  ) => {
    if (!snapshot) {
      return null;
    }

    const elementFrames: Record<string, VisualElementFrame> = {};
    Object.entries(snapshot.elementFrames ?? {}).forEach(
      ([elementId, frame]) => {
        elementFrames[elementId] = sanitizeElementFrame(frame);
      },
    );

    const elementRules: Record<string, VisualElementRule> = {};
    Object.entries(snapshot.elementRules ?? {}).forEach(([elementId, rule]) => {
      elementRules[elementId] = sanitizeElementRule(rule);
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
          ? snapshot.capturedAt
          : '',
      viewport: sanitizeViewport(snapshot.viewport),
      referenceViewport: sanitizeViewport(snapshot.referenceViewport),
      elementFrames,
      elementRules,
    };
  };

  const result: Partial<
    Record<
      VisualScreenId,
      {
        assetKey: string | null;
        capturedAt: string;
        viewport: VisualViewport;
        referenceViewport: VisualViewport;
        elementFrames: Record<string, VisualElementFrame>;
        elementRules: Record<string, VisualElementRule>;
      }
    >
  > = {};
  const legacyRaidSnapshot = (value as Record<string, any> | undefined)?.raid;

  (Object.keys(VISUAL_SCREEN_LABELS) as VisualScreenId[]).forEach(screenId => {
    const snapshot = value?.[screenId];
    if (!snapshot) {
      return;
    }
    const sanitizedSnapshot = sanitizeSnapshot(snapshot);
    if (sanitizedSnapshot) {
      result[screenId] = sanitizedSnapshot;
    }
  });

  if (legacyRaidSnapshot) {
    const sanitizedLegacySnapshot = sanitizeSnapshot(legacyRaidSnapshot);
    if (sanitizedLegacySnapshot) {
      result.raidNormal = result.raidNormal ?? sanitizedLegacySnapshot;
      result.raidBoss = result.raidBoss ?? sanitizedLegacySnapshot;
    }
  }

  return result;
}

function sanitizeBackgroundOverride(
  value?: Partial<VisualBackgroundOverride> | null,
): VisualBackgroundOverride {
  const merged = {
    ...DEFAULT_VISUAL_BACKGROUND_OVERRIDE,
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
        : DEFAULT_VISUAL_BACKGROUND_OVERRIDE.tintColor,
    tintOpacity: clamp(Number(merged.tintOpacity) || 0, 0, 1),
    removeImage: merged.removeImage === true,
  };
}

function sanitizeElementMap<T extends string>(
  defaults: Record<T, VisualElementRule>,
  values?: Partial<Record<T, Partial<VisualElementRule>>> | null,
): Record<T, VisualElementRule> {
  const result = {} as Record<T, VisualElementRule>;
  (Object.keys(defaults) as T[]).forEach(key => {
    result[key] = sanitizeElementRule(values?.[key]);
  });
  return result;
}

function sanitizeCharacterElementMap<T extends string>(
  defaults: Record<T, VisualElementRule>,
  values?: VisualCharacterElementOverrides<T> | null,
): VisualCharacterElementOverrides<T> {
  const result: VisualCharacterElementOverrides<T> = {};

  VISUAL_CHARACTER_IDS.forEach(characterId => {
    const source = values?.[characterId];
    if (!source) {
      return;
    }

    const entries = {} as Partial<Record<T, VisualElementRule>>;
    (Object.keys(source) as T[]).forEach(key => {
      if (!Object.prototype.hasOwnProperty.call(defaults, key)) {
        return;
      }
      entries[key] = sanitizeElementRule(source[key]);
    });

    if (Object.keys(entries).length > 0) {
      result[characterId] = entries;
    }
  });

  return result;
}

function sanitizeBackgroundMap(
  values?: Record<string, Partial<VisualBackgroundOverride>> | null,
) {
  const result: Record<string, VisualBackgroundOverride> = {};
  Object.entries(values ?? {}).forEach(([key, value]) => {
    if (!key) {
      return;
    }
    result[key] = sanitizeBackgroundOverride(value);
  });
  return result;
}

export function sanitizeVisualConfigManifest(
  value?: Partial<VisualConfigManifest> | null,
): VisualConfigManifest {
  const legacyRaidScreen = (value?.screens as Record<string, any> | undefined)
    ?.raid;

  return {
    version: Math.max(0, Math.round(Number(value?.version) || 0)),
    referenceViewport: sanitizeViewport(value?.referenceViewport),
    gameplay: sanitizeGameplayVisualConfig(value?.gameplay),
    studioSnapshots: sanitizeStudioSnapshots(value?.studioSnapshots),
    screens: {
      level: {
        elements: sanitizeElementMap(
          DEFAULT_VISUAL_CONFIG_MANIFEST.screens.level.elements,
          value?.screens?.level?.elements as
            | Partial<Record<LevelElementId, Partial<VisualElementRule>>>
            | undefined,
        ),
        characterElements: sanitizeCharacterElementMap(
          DEFAULT_VISUAL_CONFIG_MANIFEST.screens.level.elements,
          value?.screens?.level?.characterElements as
            | VisualCharacterElementOverrides<LevelElementId>
            | undefined,
        ),
        backgrounds: {
          byWorld: sanitizeBackgroundMap(
            value?.screens?.level?.backgrounds?.byWorld,
          ),
          byLevel: sanitizeBackgroundMap(
            value?.screens?.level?.backgrounds?.byLevel,
          ),
        },
      },
      endless: {
        elements: sanitizeElementMap(
          DEFAULT_VISUAL_CONFIG_MANIFEST.screens.endless.elements,
          value?.screens?.endless?.elements as
            | Partial<Record<EndlessElementId, Partial<VisualElementRule>>>
            | undefined,
        ),
        characterElements: sanitizeCharacterElementMap(
          DEFAULT_VISUAL_CONFIG_MANIFEST.screens.endless.elements,
          value?.screens?.endless?.characterElements as
            | VisualCharacterElementOverrides<EndlessElementId>
            | undefined,
        ),
      },
      battle: {
        elements: sanitizeElementMap(
          DEFAULT_VISUAL_CONFIG_MANIFEST.screens.battle.elements,
          value?.screens?.battle?.elements as
            | Partial<Record<BattleElementId, Partial<VisualElementRule>>>
            | undefined,
        ),
        characterElements: sanitizeCharacterElementMap(
          DEFAULT_VISUAL_CONFIG_MANIFEST.screens.battle.elements,
          value?.screens?.battle?.characterElements as
            | VisualCharacterElementOverrides<BattleElementId>
            | undefined,
        ),
      },
      raidNormal: {
        elements: sanitizeElementMap(
          DEFAULT_VISUAL_CONFIG_MANIFEST.screens.raidNormal.elements,
          (value?.screens?.raidNormal?.elements ??
            legacyRaidScreen?.elements) as
            | Partial<Record<RaidElementId, Partial<VisualElementRule>>>
            | undefined,
        ),
        characterElements: sanitizeCharacterElementMap(
          DEFAULT_VISUAL_CONFIG_MANIFEST.screens.raidNormal.elements,
          (value?.screens?.raidNormal?.characterElements ??
            legacyRaidScreen?.characterElements) as
            | VisualCharacterElementOverrides<RaidElementId>
            | undefined,
        ),
        backgrounds: {
          byBossStage: sanitizeBackgroundMap(
            value?.screens?.raidNormal?.backgrounds?.byBossStage ??
              legacyRaidScreen?.backgrounds?.byBossStage,
          ),
        },
      },
      raidBoss: {
        elements: sanitizeElementMap(
          DEFAULT_VISUAL_CONFIG_MANIFEST.screens.raidBoss.elements,
          (value?.screens?.raidBoss?.elements ?? legacyRaidScreen?.elements) as
            | Partial<Record<RaidElementId, Partial<VisualElementRule>>>
            | undefined,
        ),
        characterElements: sanitizeCharacterElementMap(
          DEFAULT_VISUAL_CONFIG_MANIFEST.screens.raidBoss.elements,
          (value?.screens?.raidBoss?.characterElements ??
            legacyRaidScreen?.characterElements) as
            | VisualCharacterElementOverrides<RaidElementId>
            | undefined,
        ),
        backgrounds: {
          byBossStage: sanitizeBackgroundMap(
            value?.screens?.raidBoss?.backgrounds?.byBossStage ??
              legacyRaidScreen?.backgrounds?.byBossStage,
          ),
        },
      },
    },
  };
}

export function cloneVisualConfigManifest(manifest: VisualConfigManifest) {
  return JSON.parse(JSON.stringify(manifest)) as VisualConfigManifest;
}

export function getGameplayDragTuning(
  manifest?: Partial<VisualConfigManifest> | null,
): GameplayDragTuning {
  return sanitizeGameplayDragTuning(manifest?.gameplay?.dragTuning);
}

export function getGameplayAudioConfig(
  manifest?: Partial<VisualConfigManifest> | null,
): GameplayAudioConfig {
  return sanitizeGameplayAudioConfig(manifest?.gameplay?.audio);
}

export function getLevelBackgroundOverride(
  manifest: VisualConfigManifest,
  levelId: number,
  world: number,
) {
  const levelKey = String(levelId);
  const worldKey = String(world);
  return (
    manifest.screens.level.backgrounds.byLevel[levelKey] ??
    manifest.screens.level.backgrounds.byWorld[worldKey] ??
    null
  );
}

export function getRaidBackgroundOverride(
  manifest: VisualConfigManifest,
  bossStage: number,
  isNormalRaid = false,
) {
  const raidScreen = isNormalRaid
    ? manifest.screens.raidNormal
    : manifest.screens.raidBoss;
  return raidScreen.backgrounds.byBossStage[String(bossStage)] ?? null;
}

export function collectReferencedVisualAssetKeys(
  manifest: VisualConfigManifest,
) {
  const keys = new Set<string>();
  Object.values(manifest.screens.level.backgrounds.byWorld).forEach(rule => {
    if (rule.assetKey) {
      keys.add(rule.assetKey);
    }
  });
  Object.values(manifest.screens.level.backgrounds.byLevel).forEach(rule => {
    if (rule.assetKey) {
      keys.add(rule.assetKey);
    }
  });
  Object.values(manifest.screens.raidNormal.backgrounds.byBossStage).forEach(
    rule => {
      if (rule.assetKey) {
        keys.add(rule.assetKey);
      }
    },
  );
  Object.values(manifest.screens.raidBoss.backgrounds.byBossStage).forEach(
    rule => {
      if (rule.assetKey) {
        keys.add(rule.assetKey);
      }
    },
  );
  Object.values(manifest.studioSnapshots ?? {}).forEach(snapshot => {
    if (snapshot?.assetKey) {
      keys.add(snapshot.assetKey);
    }
  });
  const audio = getGameplayAudioConfig(manifest);
  Object.values(audio.sfx).forEach(rule => {
    if (rule.assetKey) {
      keys.add(rule.assetKey);
    }
  });
  Object.values(audio.bgm).forEach(rule => {
    if (rule.assetKey) {
      keys.add(rule.assetKey);
    }
  });
  return Array.from(keys);
}

export function normalizeVisualCharacterId(
  value?: string | null,
): VisualCharacterId | null {
  if (!value) {
    return null;
  }
  return VISUAL_CHARACTER_IDS.includes(value as VisualCharacterId)
    ? (value as VisualCharacterId)
    : null;
}

export function getVisualElementRule(
  manifest: VisualConfigManifest,
  screenId: VisualScreenId,
  elementId: VisualElementId,
  characterId?: string | null,
): VisualElementRule {
  const screen = manifest.screens[screenId] as {
    elements: Record<string, VisualElementRule>;
    characterElements?: Partial<
      Record<string, Partial<Record<string, VisualElementRule>>>
    >;
  };
  const normalizedCharacterId = normalizeVisualCharacterId(characterId);
  if (normalizedCharacterId) {
    const overrideRule =
      screen?.characterElements?.[normalizedCharacterId]?.[elementId];
    if (overrideRule) {
      return overrideRule;
    }
  }
  return screen?.elements?.[elementId] ?? DEFAULT_VISUAL_ELEMENT_RULE;
}

export function hasVisualElementCharacterOverride(
  manifest: VisualConfigManifest,
  screenId: VisualScreenId,
  elementId: VisualElementId,
  characterId?: string | null,
) {
  const normalizedCharacterId = normalizeVisualCharacterId(characterId);
  if (!normalizedCharacterId) {
    return false;
  }
  const screen = manifest.screens[screenId] as {
    characterElements?: Partial<
      Record<string, Partial<Record<string, VisualElementRule>>>
    >;
  };
  return Boolean(
    screen?.characterElements?.[normalizedCharacterId]?.[elementId],
  );
}

export function buildVisualTintColor(color: string, opacity: number) {
  const normalized = color.trim();
  if (normalized.startsWith('rgba(') || normalized.startsWith('rgb(')) {
    return normalized;
  }

  const hex = normalized.replace('#', '');
  const safeOpacity = Math.max(0, Math.min(1, opacity));
  if (hex.length === 6) {
    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${safeOpacity})`;
  }

  return normalized;
}

export function resolveVisualOffset(
  offsetX: number,
  offsetY: number,
  currentViewport: VisualViewport,
  referenceViewport: VisualViewport,
  safeAreaAware = false,
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

export function getVisualDeviceProfile(profileId: string) {
  return (
    VISUAL_DEVICE_PROFILES.find(profile => profile.id === profileId) ?? null
  );
}
