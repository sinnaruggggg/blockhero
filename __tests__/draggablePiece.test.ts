import {getPickupCenteredOffset} from '../src/components/DraggablePiece';

describe('getPickupCenteredOffset', () => {
  it('moves a left-slot inner touch toward the screen center instead of farther left', () => {
    expect(getPickupCenteredOffset(100, 70)).toBe(20);
  });

  it('moves a right-slot inner touch toward the screen center instead of farther right', () => {
    expect(getPickupCenteredOffset(100, 30)).toBe(-20);
  });

  it('keeps a centered pickup stable', () => {
    expect(getPickupCenteredOffset(100, 50)).toBe(0);
  });
});
