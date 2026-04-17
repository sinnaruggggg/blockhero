import {
  createBoard,
  countBlocks,
  generatePieceWithEffects,
  generatePlaceablePieces,
  getFillFriendlyGenerationPool,
  getGenerationPoolForDifficulty,
  getShapeSpawnWeight,
  resetPieceGenerationHistory,
  type Piece,
} from '../src/game/engine';

function shapeKey(piece: Piece): string {
  return piece.shape.map(row => row.join('')).join('|');
}

function rotateShape(shape: number[][]): number[][] {
  return Array.from({ length: shape[0].length }, (_, colIndex) =>
    Array.from(
      { length: shape.length },
      (_, rowIndex) => shape[shape.length - 1 - rowIndex][colIndex],
    ),
  );
}

function mirrorShape(shape: number[][]): number[][] {
  return shape.map(row => [...row].reverse());
}

function normalizedFamilyKey(piece: Piece): string {
  if (piece.shape.length === 1 || piece.shape[0].length === 1) {
    return `line:${countBlocks(piece.shape)}`;
  }

  const variants: string[] = [];
  let current = piece.shape;
  for (let step = 0; step < 4; step += 1) {
    variants.push(current.map(row => row.join('')).join('|'));
    variants.push(
      mirrorShape(current)
        .map(row => row.join(''))
        .join('|'),
    );
    current = rotateShape(current);
  }

  return variants.sort()[0];
}

function expectNoImmediateRepeat(sequence: Piece[]) {
  for (let index = 1; index < sequence.length; index += 1) {
    const previous = sequence[index - 1];
    const current = sequence[index];
    expect(shapeKey(current)).not.toBe(shapeKey(previous));
    expect(countBlocks(current.shape)).not.toBe(countBlocks(previous.shape));
  }
}

function getShapeProbability(shapeIndex: number, pool: number[]): number {
  const totalWeight = pool.reduce(
    (sum, entry) => sum + getShapeSpawnWeight(entry, pool),
    0,
  );
  const shapeWeight =
    pool.filter(entry => entry === shapeIndex).length *
    getShapeSpawnWeight(shapeIndex, pool);
  return shapeWeight / totalWeight;
}

describe('engine piece generation balance', () => {
  beforeEach(() => {
    resetPieceGenerationHistory();
  });

  it('avoids consecutive identical shapes and block counts for normal pieces', () => {
    const sequence: Piece[] = [];

    for (let index = 0; index < 18; index += 1) {
      sequence.push(generatePieceWithEffects('easy'));
    }

    expectNoImmediateRepeat(sequence);
  });

  it('avoids consecutive identical shapes and block counts for placeable packs', () => {
    const board = createBoard();
    const sequence: Piece[] = [];

    for (let index = 0; index < 6; index += 1) {
      sequence.push(...generatePlaceablePieces(board, 'easy'));
    }

    expect(sequence).toHaveLength(18);
    expectNoImmediateRepeat(sequence);
  });

  it('keeps strong piece-family diversity within short recent windows', () => {
    const board = createBoard();
    const sequence: Piece[] = [];

    for (let index = 0; index < 10; index += 1) {
      sequence.push(...generatePlaceablePieces(board, 'easy'));
    }

    for (let index = 0; index <= sequence.length - 5; index += 1) {
      const recentWindow = sequence.slice(index, index + 5);
      const uniqueFamilyCount = new Set(recentWindow.map(normalizedFamilyKey))
        .size;
      expect(uniqueFamilyCount).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps the one-cell block out of the default generation pools', () => {
    expect(getGenerationPoolForDifficulty('easy')).not.toContain(0);
    expect(getGenerationPoolForDifficulty('medium')).not.toContain(0);
    expect(getGenerationPoolForDifficulty('hard')).not.toContain(0);
    expect(getFillFriendlyGenerationPool()).not.toContain(0);
  });

  it('adds purchased special shapes back into the generation pools', () => {
    const options = { unlockedSpecialShapeIndices: [0, 20, 23, 26] };

    expect(getGenerationPoolForDifficulty('easy', options)).toEqual(
      expect.arrayContaining([0, 20, 23, 26]),
    );
    expect(getFillFriendlyGenerationPool(options)).toContain(0);
  });

  it('halves 2-cell spawn probability in default and fill-friendly pools', () => {
    const easyPool = getGenerationPoolForDifficulty('easy');
    const fillFriendlyPool = getFillFriendlyGenerationPool();

    for (const pool of [easyPool, fillFriendlyPool]) {
      for (const shapeIndex of [1, 2]) {
        const originalProbability =
          pool.filter(entry => entry === shapeIndex).length / pool.length;
        expect(getShapeProbability(shapeIndex, pool)).toBeCloseTo(
          originalProbability / 2,
          10,
        );
      }
    }
  });
});
