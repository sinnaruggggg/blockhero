import { BOSS_RAID_HP } from './index';
import { adjustEnemyHpValue } from '../game/battleBalance';

export interface RaidBossDef {
  stage: number;
  nameKey: string;
  maxHp: number;
  color: string;
  emoji: string;
}

export function getNormalRaidMaxHp(stage: number): number {
  const normalizedStage = Math.max(1, Math.min(BOSS_RAID_HP.length, stage));
  return adjustEnemyHpValue(BOSS_RAID_HP[normalizedStage - 1]);
}

export function getBossRaidMaxHp(stage: number): number {
  return getNormalRaidMaxHp(stage) * 20;
}

export const RAID_BOSSES: RaidBossDef[] = [
  {
    stage: 1,
    nameKey: 'raid.boss1',
    maxHp: getBossRaidMaxHp(1),
    color: '#4ade80',
    emoji: '🟢',
  },
  {
    stage: 2,
    nameKey: 'raid.boss2',
    maxHp: getBossRaidMaxHp(2),
    color: '#f59e0b',
    emoji: '🦂',
  },
  {
    stage: 3,
    nameKey: 'raid.boss3',
    maxHp: getBossRaidMaxHp(3),
    color: '#93c5fd',
    emoji: '❄️',
  },
  {
    stage: 4,
    nameKey: 'raid.boss4',
    maxHp: getBossRaidMaxHp(4),
    color: '#06b6d4',
    emoji: '🐙',
  },
  {
    stage: 5,
    nameKey: 'raid.boss5',
    maxHp: getBossRaidMaxHp(5),
    color: '#84cc16',
    emoji: '🐍',
  },
  {
    stage: 6,
    nameKey: 'raid.boss6',
    maxHp: getBossRaidMaxHp(6),
    color: '#d97706',
    emoji: '🪨',
  },
  {
    stage: 7,
    nameKey: 'raid.boss7',
    maxHp: getBossRaidMaxHp(7),
    color: '#7c3aed',
    emoji: '💀',
  },
  {
    stage: 8,
    nameKey: 'raid.boss8',
    maxHp: getBossRaidMaxHp(8),
    color: '#38bdf8',
    emoji: '🦅',
  },
  {
    stage: 9,
    nameKey: 'raid.boss9',
    maxHp: getBossRaidMaxHp(9),
    color: '#334155',
    emoji: '🕳️',
  },
  {
    stage: 10,
    nameKey: 'raid.boss10',
    maxHp: getBossRaidMaxHp(10),
    color: '#ef4444',
    emoji: '🐉',
  },
];
