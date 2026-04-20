import {LEVELS, WORLDS} from '../constants';
import type {LevelProgress} from '../stores/gameStore';

const LEVEL_CHARACTER_XP_MULTIPLIER = 8;
const ADMIN_CHARACTER_XP_MULTIPLIER = 1000;
const CHARACTER_XP_GLOBAL_MULTIPLIER = 1 / 6;

export function adjustCharacterXpReward(baseXp: number): number {
  return Math.max(1, Math.round(baseXp * CHARACTER_XP_GLOBAL_MULTIPLIER));
}

export function getNextUnlockedLevel(progress: LevelProgress): number {
  for (let levelId = 1; levelId <= LEVELS.length; levelId += 1) {
    if (!progress[levelId]?.cleared) {
      return levelId;
    }
  }

  return LEVELS.length + 1;
}

export function getWorldProgressSummary(progress: LevelProgress, worldId: number) {
  const worldLevels = LEVELS.filter(level => level.world === worldId);
  const cleared = worldLevels.filter(level => progress[level.id]?.cleared).length;

  return {
    cleared,
    total: worldLevels.length,
    completed: cleared === worldLevels.length,
  };
}

export function getUnlockedBossRaidStages(progress: LevelProgress): number[] {
  return WORLDS.filter(world => getWorldProgressSummary(progress, world.id).completed)
    .map(world => world.id);
}

export function getLevelClearRewards(
  world: number,
  levelId: number,
  alreadyCleared: boolean,
  options?: {
    isAdmin?: boolean;
  },
) {
  const stageInWorld = ((levelId - 1) % 30) + 1;
  const baseXp = 20 * world + levelId;
  const repeatGold = 12 + 8 * world + Math.floor(stageInWorld * 1.5);
  const firstClearBonus = 18 + 7 * world;
  const xpMultiplier =
    LEVEL_CHARACTER_XP_MULTIPLIER *
    (options?.isAdmin ? ADMIN_CHARACTER_XP_MULTIPLIER : 1);

  return {
    gold: repeatGold + (alreadyCleared ? 0 : firstClearBonus),
    xp: adjustCharacterXpReward(baseXp * xpMultiplier),
  };
}
