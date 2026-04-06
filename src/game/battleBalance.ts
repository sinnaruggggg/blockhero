export type EnemyTier = 'normal' | 'elite' | 'boss';

export interface EnemyAttackStats {
  attack: number;
  attackIntervalMs: number;
  tier: EnemyTier;
}

const ENEMY_ATTACK_BUFF_MULTIPLIER = 1.1;

export function getLevelEnemyStats(levelId: number, world: number): EnemyAttackStats {
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
    attack: Math.round(
      (12 +
        world * 5 +
        chapterIndex * 4 +
        stageNumberInChapter * (tier === 'boss' ? 2 : 1)) *
        ENEMY_ATTACK_BUFF_MULTIPLIER,
    ),
    attackIntervalMs: (tier === 'boss' ? 3 : tier === 'elite' ? 4 : 5) * 1000,
    tier,
  };
}

export function getRaidBossAttackStats(stage: number): EnemyAttackStats {
  const normalizedStage = Math.max(1, stage);

  return {
    attack: Math.round((12 + normalizedStage * 2.5) * ENEMY_ATTACK_BUFF_MULTIPLIER),
    attackIntervalMs: 3000,
    tier: 'boss',
  };
}
