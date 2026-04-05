import {LEVELS, WORLDS} from '../constants';
import type {LevelProgress} from '../stores/gameStore';

const LEVEL_CHARACTER_XP_MULTIPLIER = 12;
const LEVEL_CHARACTER_XP_TEST_MULTIPLIER = 100;

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
) {
  const stageInWorld = ((levelId - 1) % 30) + 1;
  const baseXp = 20 * world + levelId;
  const repeatGold = 12 + 8 * world + Math.floor(stageInWorld * 1.5);
  const firstClearBonus = 18 + 7 * world;

  return {
    gold: repeatGold + (alreadyCleared ? 0 : firstClearBonus),
    xp:
      baseXp *
      LEVEL_CHARACTER_XP_MULTIPLIER *
      LEVEL_CHARACTER_XP_TEST_MULTIPLIER,
  };
}
