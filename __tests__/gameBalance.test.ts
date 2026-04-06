import {formatComboMultiplier, getComboMultiplier} from '../src/data/gameBalance';

describe('getComboMultiplier', () => {
  it('matches the cumulative combo scaling table', () => {
    expect(getComboMultiplier(0)).toBe(1);
    expect(getComboMultiplier(1)).toBeCloseTo(1.1, 8);
    expect(getComboMultiplier(2)).toBeCloseTo(1.32, 8);
    expect(getComboMultiplier(3)).toBeCloseTo(1.716, 8);
    expect(getComboMultiplier(5)).toBeCloseTo(3.6036, 8);
    expect(getComboMultiplier(10)).toBeCloseTo(67.04425728, 8);
    expect(getComboMultiplier(11)).toBeCloseTo(134.08851456, 8);
  });

  it('formats combo multipliers with two decimals for UI', () => {
    expect(formatComboMultiplier(0)).toBe('x1.00');
    expect(formatComboMultiplier(3)).toBe('x1.72');
    expect(formatComboMultiplier(10)).toBe('x67.04');
  });
});
