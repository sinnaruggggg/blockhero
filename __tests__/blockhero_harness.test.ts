import {calculateActionDamage} from '../combat_rules';
import {appReducer, createInitialState} from '../blockhero_state';
import {applyPiecePlacement, createEmptyBoard} from '../puzzle_engine';

describe('blockhero harness scenarios', () => {
  it('uses different damage formulas for standard and raid modes', () => {
    const standard = calculateActionDamage({
      mode: 'level',
      placedCells: 4,
      effectiveAttack: 10,
      clearedLinesThisAction: 2,
      comboCount: 1,
      feverActive: false,
    });

    const raid = calculateActionDamage({
      mode: 'boss_raid',
      placedCells: 4,
      effectiveAttack: 10,
      clearedLinesThisAction: 2,
      comboCount: 1,
      feverActive: false,
    });

    expect(standard.baseDamage).toBe(40);
    expect(raid.baseDamage).toBe(48);
  });

  it('keeps endless obstacle blocks on the board until durability is exhausted', () => {
    const board = createEmptyBoard();

    for (let column = 0; column < 7; column += 1) {
      board[0][column] = {
        color: '#64748b',
      };
    }

    board[0][0] = {
      color: '#1f2937',
      obstacleDurability: 3,
      obstacleMaxDurability: 3,
    };
    board[0][7] = null;

    const placement = applyPiecePlacement(
      board,
      {id: 1, color: '#22c55e', shape: [[1]]},
      {row: 0, col: 7},
    );

    expect(placement).not.toBeNull();
    expect(placement?.clearedRows).toEqual([0]);
    expect(placement?.board[0][0]).toMatchObject({
      obstacleDurability: 2,
      obstacleMaxDurability: 3,
    });
  });

  it('spends a heart, clears a stage, and unlocks the next level on claim', () => {
    const initial = createInitialState();
    const started = appReducer(initial, {type: 'start_level_run', stageId: 1});

    expect(started.player.hearts).toBe(initial.player.hearts - 1);
    expect(started.activeRun).not.toBeNull();

    started.activeRun!.pieces = [{id: 9001, color: '#f97316', shape: [[1]]}];
    started.activeRun!.selectedPieceId = 9001;
    started.activeRun!.enemyHp = 1;

    const finished = appReducer(started, {type: 'tap_board', row: 0, col: 0});

    expect(finished.activeRun?.ended).toBe(true);
    expect(finished.activeRun?.victory).toBe(true);

    const claimed = appReducer(finished, {type: 'claim_run'});

    expect(claimed.player.unlockedStageId).toBeGreaterThanOrEqual(2);
    expect(claimed.player.clearedStageIds).toContain(1);
    expect(claimed.player.characters.knight.exp).toBeGreaterThan(0);
  });

  it('awards endless gold immediately when a score threshold is crossed', () => {
    const initial = createInitialState();
    const started = appReducer(initial, {type: 'start_endless_run'});

    expect(started.activeRun).not.toBeNull();

    started.activeRun!.score = 995;
    started.activeRun!.pieces = [{id: 77, color: '#38bdf8', shape: [[1]]}];
    started.activeRun!.selectedPieceId = 77;

    const progressed = appReducer(started, {type: 'tap_board', row: 0, col: 0});

    expect(progressed.activeRun?.score).toBeGreaterThanOrEqual(1005);
    expect(progressed.activeRun?.earnedGold).toBe(50);
    expect(progressed.activeRun?.nextEndlessRewardScore).toBe(3000);
  });
});
