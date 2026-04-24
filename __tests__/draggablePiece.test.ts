import {
  getFixedPickupAnchorFromFrame,
  getFixedPickupAnchorPage,
} from '../src/components/DraggablePiece';

describe('getFixedPickupAnchorFromFrame', () => {
  it('returns the actual slot center from measured frame coordinates', () => {
    expect(
      getFixedPickupAnchorFromFrame({
        x: 280,
        y: 1440,
        width: 108,
        height: 108,
      }),
    ).toEqual({
      x: 334,
      y: 1494,
    });
  });
});

describe('getFixedPickupAnchorPage', () => {
  it('keeps the old event-based fallback centered when frame measurement is unavailable', () => {
    expect(getFixedPickupAnchorPage(100, 120, 20)).toBe(150);
    expect(getFixedPickupAnchorPage(100, 150, 50)).toBe(150);
    expect(getFixedPickupAnchorPage(100, 180, 80)).toBe(150);
  });
});
