import AsyncStorage from '@react-native-async-storage/async-storage';

export type CharacterId = 'knight' | 'mage' | 'archer' | 'rogue' | 'healer';

export type BaseCharacterVisualTuning = {
  showcaseScaleMultiplier: number;
  showcaseOffsetX: number;
  showcaseOffsetY: number;
  battleScaleMultiplier: number;
  battleOffsetX: number;
  battleOffsetY: number;
  attackScaleMultiplier: number;
  attackOffsetX: number;
  attackOffsetY: number;
};

export type KnightAttackTuning = {
  attackScaleMultiplier: number;
  attackOffsetX: number;
  attackOffsetY: number;
  attackFrameCols: number;
  attackFrameRows: number;
  attackTotalFrames: number;
  attackFrameWidth: number;
  attackFrameHeight: number;
  attackFrameMs: number;
};

export type KnightVisualTuning = BaseCharacterVisualTuning & KnightAttackTuning;
export type CharacterVisualTuning = BaseCharacterVisualTuning &
  Partial<KnightAttackTuning>;

export type CharacterVisualTuningMap = {
  knight: KnightVisualTuning;
  mage: BaseCharacterVisualTuning;
  archer: BaseCharacterVisualTuning;
  rogue: BaseCharacterVisualTuning;
  healer: BaseCharacterVisualTuning;
};

type MigratedCharacterId = 'archer' | 'rogue' | 'healer';

const STORAGE_KEY = 'character_visual_tuning_v1';

const BASE_DEFAULTS: BaseCharacterVisualTuning = {
  showcaseScaleMultiplier: 1,
  showcaseOffsetX: 0,
  showcaseOffsetY: 0,
  battleScaleMultiplier: 1,
  battleOffsetX: 0,
  battleOffsetY: 0,
  attackScaleMultiplier: 1,
  attackOffsetX: 0,
  attackOffsetY: 0,
};

const LEGACY_BASE_DEFAULTS: BaseCharacterVisualTuning = {
  ...BASE_DEFAULTS,
};

const PREVIOUS_HEALER_BASE_DEFAULTS: BaseCharacterVisualTuning = {
  ...BASE_DEFAULTS,
  showcaseScaleMultiplier: 1.32,
  battleScaleMultiplier: 1.32,
};

const CHARACTER_BASE_DEFAULTS: Record<CharacterId, BaseCharacterVisualTuning> = {
  knight: {...BASE_DEFAULTS},
  mage: {...BASE_DEFAULTS},
  archer: {
    ...BASE_DEFAULTS,
    showcaseScaleMultiplier: 1.32,
    battleScaleMultiplier: 1.32,
  },
  rogue: {
    ...BASE_DEFAULTS,
    showcaseScaleMultiplier: 1.24,
    battleScaleMultiplier: 1.24,
  },
  healer: {
    ...BASE_DEFAULTS,
    showcaseScaleMultiplier: 1.16,
    battleScaleMultiplier: 1.16,
  },
};

export const DEFAULT_CHARACTER_VISUAL_TUNINGS: CharacterVisualTuningMap = {
  knight: {
    ...CHARACTER_BASE_DEFAULTS.knight,
    attackScaleMultiplier: 1,
    attackOffsetX: 0,
    attackOffsetY: 0,
    attackFrameCols: 8,
    attackFrameRows: 4,
    attackTotalFrames: 28,
    attackFrameWidth: 1181,
    attackFrameHeight: 720,
    attackFrameMs: 52,
  },
  mage: {...CHARACTER_BASE_DEFAULTS.mage},
  archer: {...CHARACTER_BASE_DEFAULTS.archer},
  rogue: {...CHARACTER_BASE_DEFAULTS.rogue},
  healer: {...CHARACTER_BASE_DEFAULTS.healer},
};

let cachedTunings: CharacterVisualTuningMap = DEFAULT_CHARACTER_VISUAL_TUNINGS;
let loaded = false;
const listeners = new Set<(tunings: CharacterVisualTuningMap) => void>();

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundMaybe(value?: number) {
  return Number.isFinite(value) ? (value as number) : 0;
}

function coerceFinite(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

function sanitizeBaseTuning(
  tuning?: Partial<BaseCharacterVisualTuning> | null,
): BaseCharacterVisualTuning {
  const merged = {
    ...BASE_DEFAULTS,
    ...(tuning ?? {}),
  };

  return {
    showcaseScaleMultiplier: clamp(
      Number.isFinite(merged.showcaseScaleMultiplier)
        ? merged.showcaseScaleMultiplier
        : BASE_DEFAULTS.showcaseScaleMultiplier,
      0.4,
      3,
    ),
    showcaseOffsetX: Math.round(
      clamp(roundMaybe(merged.showcaseOffsetX), -240, 240),
    ),
    showcaseOffsetY: Math.round(
      clamp(roundMaybe(merged.showcaseOffsetY), -240, 240),
    ),
    battleScaleMultiplier: clamp(
      Number.isFinite(merged.battleScaleMultiplier)
        ? merged.battleScaleMultiplier
        : BASE_DEFAULTS.battleScaleMultiplier,
      0.4,
      3,
    ),
    battleOffsetX: Math.round(clamp(roundMaybe(merged.battleOffsetX), -240, 240)),
    battleOffsetY: Math.round(clamp(roundMaybe(merged.battleOffsetY), -240, 240)),
    attackScaleMultiplier: clamp(
      Number.isFinite(merged.attackScaleMultiplier)
        ? merged.attackScaleMultiplier
        : BASE_DEFAULTS.attackScaleMultiplier,
      0.4,
      3,
    ),
    attackOffsetX: Math.round(
      clamp(roundMaybe(merged.attackOffsetX), -240, 240),
    ),
    attackOffsetY: Math.round(
      clamp(roundMaybe(merged.attackOffsetY), -240, 240),
    ),
  };
}

function matchesBaseDefaults(
  tuning: BaseCharacterVisualTuning,
  defaults: BaseCharacterVisualTuning,
) {
  return (
    tuning.showcaseScaleMultiplier === defaults.showcaseScaleMultiplier &&
    tuning.showcaseOffsetX === defaults.showcaseOffsetX &&
    tuning.showcaseOffsetY === defaults.showcaseOffsetY &&
    tuning.battleScaleMultiplier === defaults.battleScaleMultiplier &&
    tuning.battleOffsetX === defaults.battleOffsetX &&
    tuning.battleOffsetY === defaults.battleOffsetY &&
    tuning.attackScaleMultiplier === defaults.attackScaleMultiplier &&
    tuning.attackOffsetX === defaults.attackOffsetX &&
    tuning.attackOffsetY === defaults.attackOffsetY
  );
}

function hasLegacyBaseDefaults(tuning: BaseCharacterVisualTuning) {
  return matchesBaseDefaults(tuning, LEGACY_BASE_DEFAULTS);
}

export function migrateCharacterVisualTuningDefaults(
  tunings: CharacterVisualTuningMap,
): CharacterVisualTuningMap {
  let changed = false;
  const nextTunings: CharacterVisualTuningMap = {
    ...tunings,
  };

  (['archer', 'rogue', 'healer'] as MigratedCharacterId[]).forEach(
    characterId => {
    const currentTuning = nextTunings[characterId];
    const normalizedDefault = DEFAULT_CHARACTER_VISUAL_TUNINGS[characterId];
    if (
      characterId === 'healer' &&
      matchesBaseDefaults(currentTuning, PREVIOUS_HEALER_BASE_DEFAULTS)
    ) {
      nextTunings[characterId] = normalizedDefault;
      changed = true;
      return;
    }
    if (
      hasLegacyBaseDefaults(currentTuning) &&
      !hasLegacyBaseDefaults(normalizedDefault)
    ) {
      nextTunings[characterId] = normalizedDefault;
      changed = true;
    }
    },
  );

  return changed ? nextTunings : tunings;
}

export function sanitizeCharacterVisualTuning(
  characterId: CharacterId,
  tuning?: Partial<CharacterVisualTuning> | null,
): CharacterVisualTuning {
  const defaults = DEFAULT_CHARACTER_VISUAL_TUNINGS[characterId];
  const base = sanitizeBaseTuning({
    ...defaults,
    ...(tuning ?? {}),
  });

  if (characterId !== 'knight') {
    return base;
  }

  const knightDefaults = DEFAULT_CHARACTER_VISUAL_TUNINGS.knight;
  const merged: Partial<KnightVisualTuning> = {
    ...knightDefaults,
    ...(tuning ?? {}),
  };

  return {
    ...base,
    attackScaleMultiplier: clamp(
      coerceFinite(
        merged.attackScaleMultiplier,
        knightDefaults.attackScaleMultiplier,
      ),
      0.4,
      3,
    ),
    attackOffsetX: Math.round(
      clamp(roundMaybe(merged.attackOffsetX), -240, 240),
    ),
    attackOffsetY: Math.round(
      clamp(roundMaybe(merged.attackOffsetY), -240, 240),
    ),
    attackFrameCols: Math.max(
      1,
      Math.round(
        coerceFinite(merged.attackFrameCols, knightDefaults.attackFrameCols),
      ),
    ),
    attackFrameRows: Math.max(
      1,
      Math.round(
        coerceFinite(merged.attackFrameRows, knightDefaults.attackFrameRows),
      ),
    ),
    attackTotalFrames: Math.max(
      1,
      Math.round(
        coerceFinite(
          merged.attackTotalFrames,
          knightDefaults.attackTotalFrames,
        ),
      ),
    ),
    attackFrameWidth: Math.max(
      1,
      Math.round(
        coerceFinite(merged.attackFrameWidth, knightDefaults.attackFrameWidth),
      ),
    ),
    attackFrameHeight: Math.max(
      1,
      Math.round(
        coerceFinite(
          merged.attackFrameHeight,
          knightDefaults.attackFrameHeight,
        ),
      ),
    ),
    attackFrameMs: Math.max(
      16,
      Math.round(
        coerceFinite(merged.attackFrameMs, knightDefaults.attackFrameMs),
      ),
    ),
  };
}

export function sanitizeCharacterVisualTuningMap(
  tunings?: Partial<Record<CharacterId, Partial<CharacterVisualTuning>>> | null,
): CharacterVisualTuningMap {
  return {
    knight: sanitizeCharacterVisualTuning(
      'knight',
      tunings?.knight,
    ) as KnightVisualTuning,
    mage: sanitizeCharacterVisualTuning('mage', tunings?.mage),
    archer: sanitizeCharacterVisualTuning('archer', tunings?.archer),
    rogue: sanitizeCharacterVisualTuning('rogue', tunings?.rogue),
    healer: sanitizeCharacterVisualTuning('healer', tunings?.healer),
  };
}

function publish(nextTunings: CharacterVisualTuningMap) {
  cachedTunings = nextTunings;
  loaded = true;
  listeners.forEach(listener => listener(nextTunings));
}

export function getCachedCharacterVisualTunings() {
  return cachedTunings;
}

export async function loadCharacterVisualTunings() {
  if (loaded) {
    return cachedTunings;
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const sanitizedTunings = sanitizeCharacterVisualTuningMap(JSON.parse(raw));
      const migratedTunings = migrateCharacterVisualTuningDefaults(
        sanitizedTunings,
      );
      if (migratedTunings !== sanitizedTunings) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migratedTunings));
      }
      publish(migratedTunings);
      return cachedTunings;
    }
  } catch {}

  publish(DEFAULT_CHARACTER_VISUAL_TUNINGS);
  return cachedTunings;
}

export async function saveCharacterVisualTuning(
  characterId: CharacterId,
  tuning: Partial<CharacterVisualTuning>,
) {
  const nextTunings = {
    ...cachedTunings,
    [characterId]: sanitizeCharacterVisualTuning(characterId, {
      ...cachedTunings[characterId],
      ...tuning,
    }),
  } as CharacterVisualTuningMap;

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextTunings));
  publish(nextTunings);
  return nextTunings;
}

export async function resetCharacterVisualTuning(characterId?: CharacterId) {
  if (!characterId) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    publish(DEFAULT_CHARACTER_VISUAL_TUNINGS);
    return cachedTunings;
  }

  const nextTunings = {
    ...cachedTunings,
    [characterId]: DEFAULT_CHARACTER_VISUAL_TUNINGS[characterId],
  } as CharacterVisualTuningMap;

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextTunings));
  publish(nextTunings);
  return nextTunings;
}

export function subscribeCharacterVisualTunings(
  listener: (tunings: CharacterVisualTuningMap) => void,
) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
