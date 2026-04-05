import {resolveCombatTurn} from '../src/game/combatFlow';

describe('resolveCombatTurn', () => {
  it('applies combo and line-clear multipliers in level mode', () => {
    const result = resolveCombatTurn({
      mode: 'level',
      blockCount: 4,
      attackPower: 13,
      clearedLines: 2,
      combo: 1,
      feverActive: false,
      feverGauge: 15,
    });

    expect(result.damage).toBe(81);
    expect(result.score).toBe(0);
    expect(result.nextCombo).toBe(2);
    expect(result.nextFeverGauge).toBe(25);
    expect(result.feverTriggered).toBe(false);
  });

  it('stacks raid bonus with combo and line-clear multipliers in raid mode', () => {
    const result = resolveCombatTurn({
      mode: 'raid',
      blockCount: 5,
      attackPower: 14,
      clearedLines: 3,
      combo: 0,
      feverActive: false,
      feverGauge: 0,
    });

    expect(result.damage).toBe(136);
    expect(result.score).toBe(0);
    expect(result.nextCombo).toBe(1);
    expect(result.nextFeverGauge).toBe(15);
  });

  it('mirrors combat damage into score for endless mode', () => {
    const result = resolveCombatTurn({
      mode: 'endless',
      blockCount: 3,
      attackPower: 10,
      clearedLines: 0,
      combo: 2,
      feverActive: false,
      feverGauge: 40,
    });

    expect(result.damage).toBe(36);
    expect(result.score).toBe(36);
    expect(result.nextCombo).toBe(2);
    expect(result.nextFeverGauge).toBe(40);
  });

  it('keeps combo alive when a placed block does not clear a line', () => {
    const result = resolveCombatTurn({
      mode: 'level',
      blockCount: 5,
      attackPower: 12,
      clearedLines: 0,
      combo: 4,
      feverActive: false,
      feverGauge: 65,
    });

    expect(result.damage).toBe(84);
    expect(result.nextCombo).toBe(4);
    expect(result.nextFeverGauge).toBe(65);
    expect(result.feverTriggered).toBe(false);
  });

  it('doubles damage during fever and triggers fever at 20 cleared lines', () => {
    const feverDamage = resolveCombatTurn({
      mode: 'level',
      blockCount: 2,
      attackPower: 15,
      clearedLines: 1,
      combo: 0,
      feverActive: true,
      feverGauge: 100,
    });

    expect(feverDamage.damage).toBe(76);

    const triggerResult = resolveCombatTurn({
      mode: 'raid',
      blockCount: 4,
      attackPower: 10,
      clearedLines: 1,
      combo: 3,
      feverActive: false,
      feverGauge: 95,
    });

    expect(triggerResult.nextFeverGauge).toBe(100);
    expect(triggerResult.feverTriggered).toBe(true);
    expect(triggerResult.nextCombo).toBe(4);
    expect(triggerResult.damage).toBe(71);
  });
});
