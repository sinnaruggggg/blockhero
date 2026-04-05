import {SKIN_DEFINITIONS} from './game_catalog';

export interface SummonDefinition {
  id: string;
  skinId: string;
  name: string;
  baseAttack: number;
  attackGrowthPerLevel: number;
  gaugeRequired: number;
  activeDurationMs: number;
}

function titleize(value: string): string {
  return value
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export const SUMMON_DEFINITIONS: SummonDefinition[] = SKIN_DEFINITIONS.map((skin, index) => ({
  id: skin.summonId,
  skinId: skin.id,
  name: titleize(skin.summonId.replace(/^summon_/, '')),
  baseAttack: 24 + index * 10,
  attackGrowthPerLevel: 4 + index,
  gaugeRequired: 100,
  activeDurationMs: 5 * 60 * 1000,
}));

export function getSkinDefinition(skinId: string) {
  return SKIN_DEFINITIONS.find(skin => skin.id === skinId) ?? null;
}

export function getSummonDefinitionBySkinId(skinId: string) {
  return SUMMON_DEFINITIONS.find(summon => summon.skinId === skinId) ?? null;
}

export function getSummonDefinition(summonId: string) {
  return SUMMON_DEFINITIONS.find(summon => summon.id === summonId) ?? null;
}

export function getSummonAttack(summonId: string, level: number): number {
  const summon = getSummonDefinition(summonId);
  if (!summon) {
    return 0;
  }

  return summon.baseAttack + Math.max(0, level - 1) * summon.attackGrowthPerLevel;
}

export function getSummonExpRequired(level: number): number {
  return 120 + Math.max(0, level - 1) * 45;
}
