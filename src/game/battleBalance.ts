export type EnemyTier = 'normal' | 'elite' | 'boss';

export interface EnemyAttackStats {
  attack: number;
  attackIntervalMs: number;
  tier: EnemyTier;
}

const ENEMY_ATTACK_BUFF_MULTIPLIER = 1.1;
const LEVEL_ENEMY_ATTACK_MULTIPLIER = 0.5;
const ENEMY_ATTACK_GLOBAL_MULTIPLIER = 0.5;
const ENEMY_HP_GLOBAL_MULTIPLIER = 2;
const LEVEL_ENEMY_EXTRA_MULTIPLIER = 1.5;

export function adjustEnemyAttackValue(baseAttack: number): number {
  return Math.max(
    1,
    Math.round(baseAttack * ENEMY_ATTACK_GLOBAL_MULTIPLIER),
  );
}

export function adjustEnemyHpValue(baseHp: number): number {
  return Math.max(1, Math.round(baseHp * ENEMY_HP_GLOBAL_MULTIPLIER));
}

function getBaseRaidAttack(stage: number): number {
  return adjustEnemyAttackValue(
    Math.round((12 + Math.max(1, stage) * 2.5) * ENEMY_ATTACK_BUFF_MULTIPLIER),
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
    attack: adjustEnemyAttackValue(
      Math.round(
        (12 +
          world * 5 +
          chapterIndex * 4 +
          stageNumberInChapter * (tier === 'boss' ? 2 : 1)) *
          ENEMY_ATTACK_BUFF_MULTIPLIER *
          LEVEL_ENEMY_ATTACK_MULTIPLIER *
          LEVEL_ENEMY_EXTRA_MULTIPLIER,
      ),
    ),
    attackIntervalMs: (tier === 'boss' ? 1500 : tier === 'elite' ? 2000 : 2500),
    tier,
  };
}

export function getAdjustedLevelMonsterHp(baseHp: number): number {
  return adjustEnemyHpValue(
    Math.max(1, Math.round(baseHp * 2 * LEVEL_ENEMY_EXTRA_MULTIPLIER)),
  );
}

export function getNormalRaidAttackStats(stage: number): EnemyAttackStats {
  return {
    attack: getBaseRaidAttack(stage),
    attackIntervalMs: 1500,
    tier: 'boss',
  };
}

export function getRaidBossAttackStats(stage: number): EnemyAttackStats {
  return {
    attack: getNormalRaidAttackStats(stage).attack * 2,
    attackIntervalMs: 1500,
    tier: 'boss',
  };
}
