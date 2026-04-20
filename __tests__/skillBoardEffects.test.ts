import { COLS } from '../src/constants';
import type { CharacterSkillEffects } from '../src/game/characterSkillEffects';
import { createBoard, type Piece } from '../src/game/engine';
import { applySkillBoardEffects } from '../src/game/skillBoardEffects';

const TEST_PIECE: Piece = {
  id: 1,
  color: '#ffffff',
  shape: [[1]],
};

function createEffects(
  overrides: Partial<CharacterSkillEffects>,
): CharacterSkillEffects {
  return {
    baseAttackMultiplier: 1,
    maxHpMultiplier: 1,
    damageTakenReduction: 0,
    raidSkillChargeGainMultiplier: 1,
    comboDamageBonus: 0,
    comboWindowBonusMs: 0,
    feverRequirementMultiplier: 1,
    feverGaugeGainMultiplier: 1,
    feverDurationBonusMs: 0,
    feverDamageBonus: 0,
    raidDamageMultiplier: 1,
    lineClearDamageBonus: 0,
    smallPieceChanceBonus: 0,
    diamondChanceBonus: 0,
    extraDiamondChance: 0,
    itemBlockChanceBonus: 0,
    endlessDifficultySlowRate: 0,
    endlessObstacleSpawnMultiplier: 1,
    jackpotDoubleChance: 0,
    dodgeChance: 0,
    reviveOnce: false,
    heartCapacityBonus: 0,
    heartRegenMultiplier: 1,
    healPerLineClearPercent: 0,
    healEveryTwoLinesPercent: 0,
    healEveryFiveClearsPercent: 0,
    autoHealIntervalMs: 0,
    autoHealPercent: 0,
    placeHealChance: 0,
    placeHealPercent: 0,
    itemPreserveChance: 0,
    shopGoldDiscount: 0,
    shopRefreshDiscount: 0,
    rewardGoldMultiplier: 1,
    rewardDiamondMultiplier: 1,
    raidTimeBonusMs: 0,
    doubleAttackChance: 0,
    previewCountBonus: 0,
    itemCapacityPerTypeBonus: 0,
    adjacentLineClearChance: 0,
    extraLineClearChance: 0,
    blockSummonChance: 0,
    blockSummonMaxCells: 0,
    magicTransformChance: 0,
    magicTransformCellCount: 0,
    randomLineClearChance: 0,
    randomLineClearComboThreshold: 0,
    fastPlacementDamageBonus: 0,
    fastPlacementWindowMs: 0,
    multiLineDamageBonus: 0,
    placementDamageReduction: 0,
    placementDamageReductionWindowMs: 0,
    rewardJackpotChance: 0,
    rewardJackpotMultiplier: 1,
    raidActiveSkillDamageBonus: 0,
    battleExtraAttackLineChance: 0,
    battleCounterAttackChance: 0,
    levelModeBreakthroughAttackPerClear: 0,
    ...overrides,
  };
}

describe('skillBoardEffects', () => {
  const originalRandom = Math.random;

  afterEach(() => {
    Math.random = originalRandom;
  });

  it('fills a single adjacent cell for block summon and clears the line', () => {
    const board = createBoard();
    for (let col = 0; col < COLS; col += 1) {
      if (col === 1 || col === 2) {
        continue;
      }
      board[0][col] = { color: '#22c55e' };
    }
    board[0][1] = { color: '#ffffff' };
    board[1][0] = { color: '#ef4444' };
    board[1][1] = { color: '#ef4444' };

    const rolls = [0.01];
    Math.random = jest.fn(() => rolls.shift() ?? 0);

    const result = applySkillBoardEffects({
      board,
      piece: TEST_PIECE,
      row: 0,
      col: 1,
      didClear: false,
      combo: 0,
      effects: createEffects({
        blockSummonChance: 1,
        blockSummonMaxCells: 1,
      }),
      colors: ['#38bdf8'],
    });

    expect(result.extraLinesCleared).toBe(1);
    expect(result.animations).toHaveLength(1);
    expect(result.animations[0]?.type).toBe('block_summon');
    expect(result.animations[0]?.cells).toEqual([
      { row: 0, col: 2, color: '#38bdf8' },
    ]);
  });

  it('fills up to four clear-making cells for magic transform and adds combo bonus', () => {
    const board = createBoard();
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        if (col === row) {
          continue;
        }
        board[row][col] = { color: '#a855f7' };
      }
    }

    Math.random = jest.fn(() => 0);

    const result = applySkillBoardEffects({
      board,
      piece: TEST_PIECE,
      row: 7,
      col: 7,
      didClear: false,
      combo: 0,
      effects: createEffects({
        magicTransformChance: 1,
        magicTransformCellCount: 4,
      }),
      colors: ['#c084fc'],
    });

    expect(result.extraLinesCleared).toBe(4);
    expect(result.comboChainBonus).toBe(3);
    expect(result.animations).toHaveLength(1);
    expect(result.animations[0]?.type).toBe('magic_transform');
    expect(result.animations[0]?.cells).toHaveLength(4);
  });
});
