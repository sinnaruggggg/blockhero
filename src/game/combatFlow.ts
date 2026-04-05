import {FEVER_LINES_REQUIRED, FEVER_MAX} from '../constants';
import {calculateDamage} from './engine';

export type CombatMode = 'level' | 'endless' | 'raid';

export interface CombatTurnInput {
  mode: CombatMode;
  blockCount: number;
  attackPower: number;
  clearedLines: number;
  combo: number;
  feverActive: boolean;
  feverGauge: number;
  feverLinesRequired?: number;
  feverGaugeGainMultiplier?: number;
}

export interface CombatTurnResult {
  damage: number;
  score: number;
  nextCombo: number;
  nextFeverGauge: number;
  feverTriggered: boolean;
  didClear: boolean;
}

export function resolveCombatTurn({
  mode,
  blockCount,
  attackPower,
  clearedLines,
  combo,
  feverActive,
  feverGauge,
  feverLinesRequired = FEVER_LINES_REQUIRED,
  feverGaugeGainMultiplier = 1,
}: CombatTurnInput): CombatTurnResult {
  const didClear = clearedLines > 0;
  const nextCombo = didClear ? combo + 1 : combo;
  const raidBonus = mode === 'raid' ? clearedLines : 0;
  const comboMultiplier = Math.min(2, 1 + nextCombo * 0.1);
  const clearMultiplier = 1 + Math.min(clearedLines, 4) * 0.15;
  const damage = calculateDamage(
    blockCount,
    attackPower,
    feverActive,
    comboMultiplier * clearMultiplier,
    raidBonus,
  );

  let nextFeverGauge = feverGauge;
  let feverTriggered = false;

  if (!feverActive && didClear) {
    const gaugeGain = Math.round(
      (clearedLines / Math.max(1, feverLinesRequired)) * FEVER_MAX * feverGaugeGainMultiplier,
    );
    nextFeverGauge = Math.min(FEVER_MAX, feverGauge + gaugeGain);
    feverTriggered = nextFeverGauge >= FEVER_MAX;
  }

  return {
    damage,
    score: mode === 'endless' ? damage : 0,
    nextCombo,
    nextFeverGauge,
    feverTriggered,
    didClear,
  };
}
