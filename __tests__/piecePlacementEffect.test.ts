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
    expect(cells.map(cell => [cell.col, cell.row])).toEqual([
      [3, 2],
      [3, 3],
      [4, 3],
    ]);
    expect(cells.every(cell => cell.width > 0 && cell.height > 0)).toBe(true);
  });

  it('shrinks positions when compact mode is enabled', () => {
    const normal = buildPiecePlacementEffectCells({x: 0, y: 0}, piece, 0, 0, false);
    const compact = buildPiecePlacementEffectCells({x: 0, y: 0}, piece, 0, 0, true);
    expect(compact[0].x).toBeLessThan(normal[0].x);
    expect(compact[0].y).toBeLessThan(normal[0].y);
  });

  it('uses board-local coordinates for placed block effects', () => {
    const origin = buildPiecePlacementEffectCells({x: 0, y: 0}, piece, 1, 2);
    const offset = buildPiecePlacementEffectCells({x: 100, y: 200}, piece, 1, 2);
    const transformed = buildPiecePlacementEffectCells(
      {x: 100, y: 200, width: 500, height: 500},
      piece,
      1,
      2,
    );
    expect(offset.map(cell => [cell.x, cell.y])).toEqual(
      origin.map(cell => [cell.x, cell.y]),
    );
    expect(transformed.map(cell => [cell.x, cell.y, cell.width, cell.height])).toEqual(
      origin.map(cell => [cell.x, cell.y, cell.width, cell.height]),
    );
  });

  it('preserves reward marker metadata for the cloned placed block', () => {
    const gemPiece = {
      ...piece,
      isGem: true,
    } as Piece;
    const cells = buildPiecePlacementEffectCells({x: 0, y: 0}, gemPiece, 0, 0);
    expect(cells.some(cell => cell.isGem)).toBe(true);
    expect(cells.filter(cell => cell.isGem)).toHaveLength(1);
  });
});
