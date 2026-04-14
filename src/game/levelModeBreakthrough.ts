export interface LevelModeBreakthroughState {
  consecutiveClears: number;
  nextLevelId: number | null;
  lastClearedLevelId: number | null;
}

function toPositiveInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function toNullablePositiveInteger(value: unknown): number | null {
  const normalized = toPositiveInteger(value);
  return normalized > 0 ? normalized : null;
}

export function normalizeLevelModeBreakthroughState(
  state: unknown,
): LevelModeBreakthroughState | null {
  if (!state || typeof state !== 'object') {
    return null;
  }

  const consecutiveClears = toPositiveInteger(
    (state as LevelModeBreakthroughState).consecutiveClears,
  );
  if (consecutiveClears <= 0) {
    return null;
  }

  return {
    consecutiveClears,
    nextLevelId: toNullablePositiveInteger(
      (state as LevelModeBreakthroughState).nextLevelId,
    ),
    lastClearedLevelId: toNullablePositiveInteger(
      (state as LevelModeBreakthroughState).lastClearedLevelId,
    ),
  };
}

export function getLevelModeBreakthroughCount(
  state: LevelModeBreakthroughState | null | undefined,
): number {
  return normalizeLevelModeBreakthroughState(state)?.consecutiveClears ?? 0;
}

export function getLevelModeBreakthroughBonusRate(
  state: LevelModeBreakthroughState | null | undefined,
  attackPerClear: number,
): number {
  const count = getLevelModeBreakthroughCount(state);
  if (count <= 0 || attackPerClear <= 0) {
    return 0;
  }

  return count * attackPerClear;
}

export function shouldResetLevelModeBreakthroughOnChallenge(
  state: LevelModeBreakthroughState | null | undefined,
  levelId: number,
): boolean {
  const normalized = normalizeLevelModeBreakthroughState(state);
  if (!normalized) {
    return false;
  }

  return normalized.nextLevelId !== levelId;
}

export function advanceLevelModeBreakthroughState(
  state: LevelModeBreakthroughState | null | undefined,
  levelId: number,
  totalLevels: number,
): LevelModeBreakthroughState {
  const normalized = normalizeLevelModeBreakthroughState(state);
  const consecutiveClears =
    normalized && normalized.nextLevelId === levelId
      ? normalized.consecutiveClears + 1
      : 1;

  return {
    consecutiveClears,
    lastClearedLevelId: levelId,
    nextLevelId: levelId < totalLevels ? levelId + 1 : null,
  };
}
