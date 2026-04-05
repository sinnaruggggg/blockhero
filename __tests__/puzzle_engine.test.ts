import {countPieceCells, createPiecePack} from '../puzzle_engine';

describe('puzzle_engine piece generation', () => {
  it('forces small pieces when the bonus rate is set to 1', () => {
    const pack = createPiecePack({smallPieceRateBonus: 1});

    expect(pack).toHaveLength(3);
    expect(pack.every(piece => countPieceCells(piece.shape) <= 2)).toBe(true);
  });
});
