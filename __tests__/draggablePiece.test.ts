import {getFixedPickupAnchorPage} from '../src/components/DraggablePiece';

describe('getFixedPickupAnchorPage', () => {
  it('returns the same lifted anchor for any touch point inside the left slot', () => {
    expect(getFixedPickupAnchorPage(100, 120, 20)).toBe(150);
    expect(getFixedPickupAnchorPage(100, 150, 50)).toBe(150);
    expect(getFixedPickupAnchorPage(100, 180, 80)).toBe(150);
  });

  it('returns the same lifted anchor for any touch point inside the right slot', () => {
    expect(getFixedPickupAnchorPage(100, 320, 20)).toBe(350);
    expect(getFixedPickupAnchorPage(100, 350, 50)).toBe(350);
    expect(getFixedPickupAnchorPage(100, 380, 80)).toBe(350);
  });

  it('keeps a centered touch unchanged', () => {
    expect(getFixedPickupAnchorPage(100, 250, 50)).toBe(250);
  });
});
