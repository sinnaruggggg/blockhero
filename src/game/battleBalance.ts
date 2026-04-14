export type EnemyTier = 'normal' | 'elite' | 'boss';

export interface EnemyAttackStats {
  attack: number;
  attackIntervalMs: number;
  tier: EnemyTier;
}

const ENEMY_ATTACK_BUFF_MULTIPLIER = 1.1;
const LEVEL_ENEMY_ATTACK_MULTIPLIER = 0.5;

function getBaseRaidAttack(stage: number): number {
  return Math.round(
    (12 + Math.max(1, stage) * 2.5) * ENEMY_ATTACK_BUFF_MULTIPLIER,
  );
}

export function getLevelEnemyStats(
  levelId: number,
  world: number,
): EnemyAttackStats {
  const stageNumberInWorld = ((Math.max(1, levelId) - 1) % 30) + 1;
  const chapterIndex = Math.ceil(stageNumberInWorld / 10);
  const stageNumberInChapter = ((stageNumberInWorld - 1) % 10) + 1;

  let tier: EnemyTier = 'normal';
  if (chapterIndex === 3 && stageNumberInChapter === 10) {
    tier = 'boss';
  } else if (stageNumberInChapter === 5 || stageNumberInChapter === 9) {
    tier = 'elite';
  }

  return {
    attack: Math.max(
      1,
      Math.round(
        (12 +
          world * 5 +
          chapterIndex * 4 +
          stageNumberInChapter * (tier === 'boss' ? 2 : 1)) *
          ENEMY_ATTACK_BUFF_MULTIPLIER *
          LEVEL_ENEMY_ATTACK_MULTIPLIER,
      ),
    ),
    attackIntervalMs: (tier === 'boss' ? 3 : tier === 'elite' ? 4 : 5) * 1000,
    tier,
  };
}

export function getAdjustedLevelMonsterHp(baseHp: number): number {
  return Math.max(1, Math.round(baseHp * 2));
}

export function getNormalRaidAttackStats(stage: number): EnemyAttackStats {
  return {
    attack: getBaseRaidAttack(stage),
    attackIntervalMs: 3000,
    tier: 'boss',
  };
}

export function getRaidBossAttackStats(stage: number): EnemyAttackStats {
  return {
    attack: getNormalRaidAttackStats(stage).attack * 2,
    attackIntervalMs: 3000,
    tier: 'boss',
  };
}
