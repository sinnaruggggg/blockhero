import {BOSS_RAID_HP} from './index';

export interface RaidBossDef {
  stage: number;
  nameKey: string;
  maxHp: number;
  color: string;
  emoji: string;
}

export const RAID_BOSSES: RaidBossDef[] = [
  {stage: 1, nameKey: 'raid.boss1', maxHp: BOSS_RAID_HP[0], color: '#4ade80', emoji: '🟢'},
  {stage: 2, nameKey: 'raid.boss2', maxHp: BOSS_RAID_HP[1], color: '#f59e0b', emoji: '🦂'},
  {stage: 3, nameKey: 'raid.boss3', maxHp: BOSS_RAID_HP[2], color: '#93c5fd', emoji: '❄️'},
  {stage: 4, nameKey: 'raid.boss4', maxHp: BOSS_RAID_HP[3], color: '#06b6d4', emoji: '🐙'},
  {stage: 5, nameKey: 'raid.boss5', maxHp: BOSS_RAID_HP[4], color: '#84cc16', emoji: '🐍'},
  {stage: 6, nameKey: 'raid.boss6', maxHp: BOSS_RAID_HP[5], color: '#d97706', emoji: '🪨'},
  {stage: 7, nameKey: 'raid.boss7', maxHp: BOSS_RAID_HP[6], color: '#7c3aed', emoji: '💀'},
  {stage: 8, nameKey: 'raid.boss8', maxHp: BOSS_RAID_HP[7], color: '#38bdf8', emoji: '🦅'},
  {stage: 9, nameKey: 'raid.boss9', maxHp: BOSS_RAID_HP[8], color: '#334155', emoji: '🕳️'},
  {stage: 10, nameKey: 'raid.boss10', maxHp: BOSS_RAID_HP[9], color: '#ef4444', emoji: '🐉'},
];
