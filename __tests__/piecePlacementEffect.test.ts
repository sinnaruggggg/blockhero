import {buildPiecePlacementEffectCells} from '../src/game/piecePlacementEffect';
import type {Piece} from '../src/game/engine';

describe('piecePlacementEffect', () => {
  const piece = {
    id: 99,
    name: 'Test',
    color: '#ff0000',
    shape: [
      [1, 0],
      [1, 1],
    ],
  } as Piece;

  it('builds an effect cell for each occupied tile', () => {
    const cells = buildPiecePlacementEffectCells({x: 100, y: 200}, piece, 2, 3);
    expect(cells).toHaveLength(3);
    expect(cells.map(cell => cell.id)).toEqual(['2-3', '3-3', '3-4']);
  });

  it('shrinks positions when compact mode is enabled', () => {
    const normal = buildPiecePlacementEffectCells({x: 0, y: 0}, piece, 0, 0, false);
    const compact = buildPiecePlacementEffectCells({x: 0, y: 0}, piece, 0, 0, true);
    expect(compact[0].x).toBeLessThan(normal[0].x);
    expect(compact[0].y).toBeLessThan(normal[0].y);
  });
});
