export type VisualScreenId = 'level' | 'endless' | 'battle' | 'raid';

export type LevelElementId =
  | 'header'
  | 'battle_lane'
  | 'board'
  | 'piece_tray'
  | 'item_bar'
  | 'combo_gauge';

export type EndlessElementId =
  | 'header'
  | 'status_bar'
  | 'summon_panel'
  | 'next_preview'
  | 'board'
  | 'piece_tray'
  | 'item_bar'
  | 'combo_gauge';

export type BattleElementId =
  | 'back_button'
  | 'opponent_panel'
  | 'attack_bar'
  | 'board'
  | 'piece_tray';

export type RaidElementId =
  | 'top_panel'
  | 'skill_bar'
  | 'info_bar'
  | 'board'
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
  opacity: number;
  visible: boolean;
  zIndex: number;
};

export type VisualBackgroundOverride = {
  assetKey: string | null;
  tintColor: string;
  tintOpacity: number;
  removeImage: boolean;
};

export type LevelScreenVisualConfig = {
  elements: Record<LevelElementId, VisualElementRule>;
  backgrounds: {
    byWorld: Record<string, VisualBackgroundOverride>;
    byLevel: Record<string, VisualBackgroundOverride>;
  };
};

export type EndlessScreenVisualConfig = {
  elements: Record<EndlessElementId, VisualElementRule>;
};

export type BattleScreenVisualConfig = {
  elements: Record<BattleElementId, VisualElementRule>;
};

export type RaidScreenVisualConfig = {
  elements: Record<RaidElementId, VisualElementRule>;
  backgrounds: {
    byBossStage: Record<string, VisualBackgroundOverride>;
  };
};

export type VisualConfigManifest = {
  version: number;
  screens: {
    level: LevelScreenVisualConfig;
    endless: EndlessScreenVisualConfig;
    battle: BattleScreenVisualConfig;
    raid: RaidScreenVisualConfig;
  };
};

export const VISUAL_SCREEN_LABELS: Record<VisualScreenId, string> = {
  level: '레벨 모드',
  endless: '무한 모드',
  battle: '대전 모드',
  raid: '레이드 모드',
};

export const VISUAL_ELEMENT_LABELS: Record<VisualScreenId, {id: string; label: string}[]> =
  {
    level: [
      {id: 'header', label: '상단 헤더'},
      {id: 'battle_lane', label: '전투 HUD'},
      {id: 'board', label: '보드'},
      {id: 'piece_tray', label: '하단 블록 트레이'},
      {id: 'item_bar', label: '아이템 바'},
      {id: 'combo_gauge', label: '콤보 게이지'},
    ],
    endless: [
      {id: 'header', label: '상단 헤더'},
      {id: 'status_bar', label: '상태 바'},
      {id: 'summon_panel', label: '소환 패널'},
      {id: 'next_preview', label: '다음 블록'},
      {id: 'board', label: '보드'},
      {id: 'piece_tray', label: '하단 블록 트레이'},
      {id: 'item_bar', label: '아이템 바'},
      {id: 'combo_gauge', label: '콤보 게이지'},
    ],
    battle: [
      {id: 'back_button', label: '뒤로가기 버튼'},
      {id: 'opponent_panel', label: '상대 패널'},
      {id: 'attack_bar', label: '공격 바'},
      {id: 'board', label: '보드'},
      {id: 'piece_tray', label: '하단 블록 트레이'},
    ],
    raid: [
      {id: 'top_panel', label: '상단 보스 영역'},
      {id: 'skill_bar', label: '스킬 바'},
      {id: 'info_bar', label: '정보 바'},
      {id: 'board', label: '보드'},
      {id: 'piece_tray', label: '하단 블록 트레이'},
      {id: 'combo_gauge', label: '콤보 게이지'},
    ],
  };

export const DEFAULT_VISUAL_ELEMENT_RULE: VisualElementRule = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  opacity: 1,
  visible: true,
  zIndex: 0,
};

export const DEFAULT_VISUAL_BACKGROUND_OVERRIDE: VisualBackgroundOverride = {
  assetKey: null,
  tintColor: '#000000',
  tintOpacity: 0,
  removeImage: false,
};

function cloneRule(): VisualElementRule {
  return {...DEFAULT_VISUAL_ELEMENT_RULE};
}

function createRules<T extends string>(ids: T[]): Record<T, VisualElementRule> {
  return ids.reduce((acc, id) => {
    acc[id] = cloneRule();
    return acc;
  }, {} as Record<T, VisualElementRule>);
}

export const DEFAULT_VISUAL_CONFIG_MANIFEST: VisualConfigManifest = {
  version: 0,
  screens: {
    level: {
      elements: createRules<LevelElementId>([
        'header',
        'battle_lane',
        'board',
        'piece_tray',
        'item_bar',
        'combo_gauge',
      ]),
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
        'piece_tray',
        'item_bar',
        'combo_gauge',
      ]),
    },
    battle: {
      elements: createRules<BattleElementId>([
        'back_button',
        'opponent_panel',
        'attack_bar',
        'board',
        'piece_tray',
      ]),
    },
    raid: {
      elements: createRules<RaidElementId>([
        'top_panel',
        'skill_bar',
        'info_bar',
        'board',
        'piece_tray',
        'combo_gauge',
      ]),
      backgrounds: {
        byBossStage: {},
      },
    },
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
    opacity: clamp(Number(merged.opacity) || 1, 0, 1),
    visible: merged.visible !== false,
    zIndex: Math.round(clamp(Number(merged.zIndex) || 0, -20, 60)),
  };
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
  return {
    version: Math.max(0, Math.round(Number(value?.version) || 0)),
    screens: {
      level: {
        elements: sanitizeElementMap(
          DEFAULT_VISUAL_CONFIG_MANIFEST.screens.level.elements,
          value?.screens?.level?.elements as
            | Partial<Record<LevelElementId, Partial<VisualElementRule>>>
            | undefined,
        ),
        backgrounds: {
          byWorld: sanitizeBackgroundMap(value?.screens?.level?.backgrounds?.byWorld),
          byLevel: sanitizeBackgroundMap(value?.screens?.level?.backgrounds?.byLevel),
        },
      },
      endless: {
        elements: sanitizeElementMap(
          DEFAULT_VISUAL_CONFIG_MANIFEST.screens.endless.elements,
          value?.screens?.endless?.elements as
            | Partial<Record<EndlessElementId, Partial<VisualElementRule>>>
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
      },
      raid: {
        elements: sanitizeElementMap(
          DEFAULT_VISUAL_CONFIG_MANIFEST.screens.raid.elements,
          value?.screens?.raid?.elements as
            | Partial<Record<RaidElementId, Partial<VisualElementRule>>>
            | undefined,
        ),
        backgrounds: {
          byBossStage: sanitizeBackgroundMap(
            value?.screens?.raid?.backgrounds?.byBossStage,
          ),
        },
      },
    },
  };
}

export function cloneVisualConfigManifest(manifest: VisualConfigManifest) {
  return JSON.parse(JSON.stringify(manifest)) as VisualConfigManifest;
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
) {
  return manifest.screens.raid.backgrounds.byBossStage[String(bossStage)] ?? null;
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
  Object.values(manifest.screens.raid.backgrounds.byBossStage).forEach(rule => {
    if (rule.assetKey) {
      keys.add(rule.assetKey);
    }
  });
  return Array.from(keys);
}

export function getVisualElementRule(
  manifest: VisualConfigManifest,
  screenId: VisualScreenId,
  elementId: VisualElementId,
): VisualElementRule {
  const screen = manifest.screens[screenId] as {
    elements: Record<string, VisualElementRule>;
  };
  return (
    screen?.elements?.[elementId] ?? DEFAULT_VISUAL_ELEMENT_RULE
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
