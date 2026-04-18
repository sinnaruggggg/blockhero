import {
  ROWS,
  COLS,
  COLORS,
  PIECE_SHAPES,
  PIECES_EASY,
  PIECES_MEDIUM,
  PIECES_HARD,
} from '../constants';
import {
  GEM_BLOCK_SPAWN_RATE,
  ITEM_BLOCK_SPAWN_RATE,
  getItemDropPool,
  type GameModeRewardItemKey,
} from '../constants/itemCatalog';

// Types
// 'hard' obstacles have a hit counter: needs `hits` more line-clears to be destroyed
export type CellValue = null | {
  color: string;
  type?: 'stone' | 'ice' | 'hard';
  hits?: number;
  isGem?: boolean;
  isItem?: boolean;
  itemType?: string;
};
export type Board = CellValue[][];
export type PieceShape = number[][];

export interface PieceGenerationOptions {
  smallPieceChanceBonus?: number;
  gemChanceBonus?: number;
  itemChanceBonus?: number;
  unlockedSpecialShapeIndices?: number[];
  rewardMode?: GameModeRewardItemKey;
}

export interface Piece {
  shape: PieceShape;
  color: string;
  id: number;
  isGem?: boolean; // 보석 블록 (1-2% 확률)
  isItem?: boolean; // 아이템 블록 (2% 확률)
  itemType?: string; // 아이템 종류
}

export function getPieceRewardMarkerCell(
  shape: PieceShape,
): { row: number; col: number } | null {
  for (let row = 0; row < shape.length; row += 1) {
    for (let col = 0; col < shape[row].length; col += 1) {
      if (shape[row][col] === 1) {
        return { row, col };
      }
    }
  }

  return null;
}

export interface PlaceResult {
  board: Board;
  linesCleared: number;
  scoreGained: number;
  damageDealt: number; // blocks × attackPower
  combo: number;
  clearedRows: number[];
  clearedCols: number[];
  stonesDestroyed: number;
  iceDestroyed: number;
  hardBlocksHit: number; // hard obstacles that took a hit
  gemsFound: number; // gem cells cleared
  itemsFound: string[]; // item cells cleared
}

// ─── Damage calculation ────────────────────────────────────────
// Level mode / all modes: damage = blocks × attackPower
// Raid mode bonus: damage = blocks × (attackPower + roundsCleared)
export function calculateDamage(
  blockCount: number,
  attackPower: number,
  feverActive: boolean = false,
  comboMultiplier: number = 1,
  raidBonus: number = 0,
): number {
  let dmg = blockCount * (attackPower + raidBonus);
  dmg = Math.round(dmg * comboMultiplier);
  if (feverActive) dmg *= 2;
  return dmg;
}

// Create empty board
export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

// Generate random color (supports skin colors)
export function randomColor(colors?: string[]): string {
  const c = colors || COLORS;
  return c[Math.floor(Math.random() * c.length)];
}

// Fill-friendly pieces: simple shapes that cleanly fill gaps.
// The 1x1 block is no longer part of the default pool and is only added when unlocked.
const DEFAULT_FILL_FRIENDLY = [1, 2, 3, 4, 9];
const REDUCED_SMALL_PIECE_PROBABILITY = 0.5;
const SPECIAL_HALF_WEIGHT_SHAPE_INDICES = new Set([0, 20, 21, 23, 24]);
const SAME_DIRECTION_REPEAT_PENALTY = 24;
const DIRECTION_SATURATION_PENALTY = 18;
const SAME_LINE_DIRECTION_REPEAT_PENALTY = 14;
const PIECE_HISTORY_LIMIT = 8;
let recentGeneratedPieces: Piece[] = [];

function getPieceShapeKey(shape: PieceShape): string {
  return shape.map(row => row.join('')).join('|');
}

function rotateShape(shape: PieceShape): PieceShape {
  return Array.from({ length: shape[0].length }, (_, colIndex) =>
    Array.from(
      { length: shape.length },
      (_, rowIndex) => shape[shape.length - 1 - rowIndex][colIndex],
    ),
  );
}

function mirrorShape(shape: PieceShape): PieceShape {
  return shape.map(row => [...row].reverse());
}

function getNormalizedPiecePatternKey(shape: PieceShape): string {
  const variants: string[] = [];
  let current = shape;

  for (let step = 0; step < 4; step += 1) {
    variants.push(getPieceShapeKey(current));
    variants.push(getPieceShapeKey(mirrorShape(current)));
    current = rotateShape(current);
  }

  return variants.sort()[0];
}

function isLineShape(shape: PieceShape): boolean {
  return shape.length === 1 || shape[0].length === 1;
}

type PieceDirection = 'horizontal' | 'vertical' | 'balanced';

function getOccupiedShapeBounds(shape: PieceShape): {
  width: number;
  height: number;
} {
  let minRow = Infinity;
  let maxRow = -1;
  let minCol = Infinity;
  let maxCol = -1;

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] !== 1) {
        continue;
      }
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
    }
  }

  if (maxRow < 0 || maxCol < 0) {
    return { width: shape[0]?.length ?? 0, height: shape.length };
  }

  return {
    width: maxCol - minCol + 1,
    height: maxRow - minRow + 1,
  };
}

function getPieceDirection(shape: PieceShape): PieceDirection {
  if (shape.length === 1 && shape[0].length > 1) {
    return 'horizontal';
  }

  if (shape[0].length === 1 && shape.length > 1) {
    return 'vertical';
  }

  const { width, height } = getOccupiedShapeBounds(shape);
  if (width > height) {
    return 'horizontal';
  }
  if (height > width) {
    return 'vertical';
  }
  return 'balanced';
}

function getPieceFamilyKey(shape: PieceShape): string {
  if (isLineShape(shape)) {
    return `line:${countBlocks(shape)}`;
  }

  return getNormalizedPiecePatternKey(shape);
}

function rememberGeneratedPiece(piece: Piece) {
  recentGeneratedPieces = [...recentGeneratedPieces, piece].slice(
    -PIECE_HISTORY_LIMIT,
  );
}

export function resetPieceGenerationHistory() {
  recentGeneratedPieces = [];
}

function normalizeUnlockedSpecialShapeIndices(
  options: PieceGenerationOptions = {},
): number[] {
  return Array.from(
    new Set(
      (options.unlockedSpecialShapeIndices ?? []).filter(
        shapeIndex =>
          Number.isInteger(shapeIndex) &&
          shapeIndex >= 0 &&
          shapeIndex < PIECE_SHAPES.length,
      ),
    ),
  );
}

export function getFillFriendlyGenerationPool(
  options: PieceGenerationOptions = {},
): number[] {
  const unlockedSpecialShapeIndices =
    normalizeUnlockedSpecialShapeIndices(options);
  const fillFriendlyPool = [...DEFAULT_FILL_FRIENDLY];

  if (unlockedSpecialShapeIndices.includes(0)) {
    fillFriendlyPool.unshift(0);
  }

  return fillFriendlyPool;
}

export function getGenerationPoolForDifficulty(
  difficulty: 'easy' | 'medium' | 'hard',
  options: PieceGenerationOptions = {},
): number[] {
  const basePool =
    difficulty === 'hard'
      ? PIECES_HARD
      : difficulty === 'medium'
      ? PIECES_MEDIUM
      : PIECES_EASY;
  const filteredBasePool = basePool.filter(shapeIndex => shapeIndex !== 0);
  const unlockedSpecialShapeIndices = normalizeUnlockedSpecialShapeIndices(
    options,
  ).filter(shapeIndex => !filteredBasePool.includes(shapeIndex));

  return [...filteredBasePool, ...unlockedSpecialShapeIndices];
}

function isReducedSmallPieceShapeIndex(shapeIndex: number): boolean {
  return countBlocks(PIECE_SHAPES[shapeIndex]) <= 2;
}

function getReducedSmallPieceWeightMultiplier(
  pool: number[],
  reducedProbability: number = REDUCED_SMALL_PIECE_PROBABILITY,
): number {
  if (reducedProbability >= 1) {
    return 1;
  }
  if (reducedProbability <= 0) {
    return 0;
  }

  let reducedEntryCount = 0;
  let regularEntryCount = 0;

  for (const shapeIndex of pool) {
    if (isReducedSmallPieceShapeIndex(shapeIndex)) {
      reducedEntryCount += 1;
    } else {
      regularEntryCount += 1;
    }
  }

  if (reducedEntryCount === 0 || regularEntryCount === 0) {
    return 1;
  }

  return (
    (reducedProbability * regularEntryCount) /
    (regularEntryCount + reducedEntryCount * (1 - reducedProbability))
  );
}

function getSpecialShapeWeightMultiplier(shapeIndex: number): number {
  return SPECIAL_HALF_WEIGHT_SHAPE_INDICES.has(shapeIndex) ? 0.5 : 1;
}

export function getShapeSpawnWeight(
  shapeIndex: number,
  pool: number[],
): number {
  let weight = 1;

  if (isReducedSmallPieceShapeIndex(shapeIndex)) {
    weight *= getReducedSmallPieceWeightMultiplier(pool);
  }

  return weight * getSpecialShapeWeightMultiplier(shapeIndex);
}

function pickWeightedShapeIndex(
  pool: number[],
  randomFn: () => number = Math.random,
): number {
  const totalWeight = pool.reduce(
    (sum, shapeIndex) => sum + getShapeSpawnWeight(shapeIndex, pool),
    0,
  );

  if (totalWeight <= 0) {
    return pool[Math.floor(randomFn() * pool.length)];
  }

  let cursor = randomFn() * totalWeight;
  for (const shapeIndex of pool) {
    cursor -= getShapeSpawnWeight(shapeIndex, pool);
    if (cursor < 0) {
      return shapeIndex;
    }
  }

  return pool[pool.length - 1];
}

function createPieceFromShapeIndex(idx: number, colors?: string[]): Piece {
  return {
    shape: PIECE_SHAPES[idx],
    color: randomColor(colors),
    id: ++pieceIdCounter,
  };
}

function isImmediateRepeat(candidate: Piece, previous: Piece | null): boolean {
  if (!previous) {
    return false;
  }

  return (
    getPieceFamilyKey(candidate.shape) === getPieceFamilyKey(previous.shape) ||
    countBlocks(candidate.shape) === countBlocks(previous.shape)
  );
}

function getBalanceScore(candidate: Piece, history: Piece[]): number {
  const recent = history.slice(-6);
  const candidateCount = countBlocks(candidate.shape);
  const candidateFamilyKey = getPieceFamilyKey(candidate.shape);
  const candidateDirection = getPieceDirection(candidate.shape);
  const recentFamilyMatches = recent.filter(
    previous => getPieceFamilyKey(previous.shape) === candidateFamilyKey,
  ).length;
  const recentCountMatches = recent.filter(
    previous => countBlocks(previous.shape) === candidateCount,
  ).length;
  const recentDirectionalMatches =
    candidateDirection === 'balanced'
      ? 0
      : recent
          .slice(-3)
          .filter(
            previous => getPieceDirection(previous.shape) === candidateDirection,
          ).length;
  const previous = recent.length > 0 ? recent[recent.length - 1] : null;

  let score = recent.reduce((scoreValue, previous, index) => {
    const weight = recent.length - index;
    let nextScore = scoreValue;
    if (countBlocks(previous.shape) === candidateCount) {
      nextScore += 5 * weight;
    }
    if (getPieceFamilyKey(previous.shape) === candidateFamilyKey) {
      nextScore += 14 * weight;
    }
    return nextScore;
  }, 0);

  if (recentCountMatches >= 2) {
    score += 60;
  }

  if (recentFamilyMatches >= 1) {
    score += 45;
  }

  if (recentFamilyMatches >= 2) {
    score += 200;
  }

  if (
    previous &&
    candidateDirection !== 'balanced' &&
    getPieceDirection(previous.shape) === candidateDirection
  ) {
    score += SAME_DIRECTION_REPEAT_PENALTY;
    if (isLineShape(candidate.shape) && isLineShape(previous.shape)) {
      score += SAME_LINE_DIRECTION_REPEAT_PENALTY;
    }
  }

  if (recentDirectionalMatches >= 2) {
    score += DIRECTION_SATURATION_PENALTY;
  }

  return score;
}

function hasRecentFamilySaturation(
  candidate: Piece,
  history: Piece[],
): boolean {
  const recentWindow = history.slice(-5);
  const candidateFamilyKey = getPieceFamilyKey(candidate.shape);
  const repeatedFamilyCount = recentWindow.filter(
    previous => getPieceFamilyKey(previous.shape) === candidateFamilyKey,
  ).length;

  return repeatedFamilyCount >= 2;
}

function canPlaceShapeAnywhere(board: Board, shape: PieceShape): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (canPlacePiece(board, shape, r, c)) {
        return true;
      }
    }
  }
  return false;
}

function getRankedShapeCandidates(
  sourcePool: number[],
  history: Piece[],
  board?: Board,
): { shapeIndex: number; score: number; immediateRepeat: boolean }[] {
  const previous = history.length > 0 ? history[history.length - 1] : null;
  const uniquePool = [...new Set(sourcePool)];

  return uniquePool
    .filter(
      shapeIndex =>
        !board || canPlaceShapeAnywhere(board, PIECE_SHAPES[shapeIndex]),
    )
    .map(shapeIndex => {
      const candidate: Piece = {
        shape: PIECE_SHAPES[shapeIndex],
        color: '#000000',
        id: 0,
      };

      return {
        shapeIndex,
        score: getBalanceScore(candidate, history),
        immediateRepeat:
          isImmediateRepeat(candidate, previous) ||
          hasRecentFamilySaturation(candidate, history),
      };
    })
    .sort((left, right) => left.score - right.score);
}

function pickFromRankedCandidates(
  candidates: { shapeIndex: number; score: number }[],
  sourcePool: number[],
): number | null {
  if (candidates.length === 0) {
    return null;
  }

  const bestScore = candidates[0].score;
  const preferredCandidates = candidates.filter(
    candidate => candidate.score <= bestScore + 8,
  );
  const weightedCandidates = preferredCandidates.map(candidate => {
    const duplicateCount = sourcePool.filter(
      entry => entry === candidate.shapeIndex,
    ).length;
    return {
      shapeIndex: candidate.shapeIndex,
      weight:
        Math.max(1, duplicateCount) *
        getShapeSpawnWeight(candidate.shapeIndex, sourcePool),
    };
  });
  const totalWeight = weightedCandidates.reduce(
    (sum, candidate) => sum + candidate.weight,
    0,
  );

  if (totalWeight <= 0) {
    return preferredCandidates[0].shapeIndex;
  }

  let cursor = Math.random() * totalWeight;
  for (const candidate of weightedCandidates) {
    cursor -= candidate.weight;
    if (cursor < 0) {
      return candidate.shapeIndex;
    }
  }

  return weightedCandidates[weightedCandidates.length - 1].shapeIndex;
}

function getPreferredSourcePool(
  difficulty: 'easy' | 'medium' | 'hard',
  options: PieceGenerationOptions = {},
): number[] {
  const pool = getGenerationPoolForDifficulty(difficulty, options);
  const preferSmall =
    (options.smallPieceChanceBonus ?? 0) > 0 &&
    Math.random() < (options.smallPieceChanceBonus ?? 0);

  return preferSmall ? getFillFriendlyGenerationPool(options) : pool;
}

function pickBalancedShapeIndex(
  difficulty: 'easy' | 'medium' | 'hard',
  history: Piece[],
  options: PieceGenerationOptions = {},
  board?: Board,
): number {
  const pool = getGenerationPoolForDifficulty(difficulty, options);
  const sourcePool = getPreferredSourcePool(difficulty, options);
  const rankedPreferredCandidates = getRankedShapeCandidates(
    sourcePool,
    history,
    board,
  );
  const rankedPreferredNonRepeat = rankedPreferredCandidates.filter(
    candidate => !candidate.immediateRepeat,
  );
  const chosenPreferredIndex = pickFromRankedCandidates(
    rankedPreferredNonRepeat.length > 0
      ? rankedPreferredNonRepeat
      : rankedPreferredCandidates,
    sourcePool,
  );

  if (chosenPreferredIndex !== null) {
    return chosenPreferredIndex;
  }

  const fallbackPool = [
    ...new Set([...getFillFriendlyGenerationPool(options), ...pool]),
  ];
  const rankedFallbackCandidates = getRankedShapeCandidates(
    fallbackPool,
    history,
    board,
  );
  const rankedFallbackNonRepeat = rankedFallbackCandidates.filter(
    candidate => !candidate.immediateRepeat,
  );
  const chosenFallbackIndex = pickFromRankedCandidates(
    rankedFallbackNonRepeat.length > 0
      ? rankedFallbackNonRepeat
      : rankedFallbackCandidates,
    fallbackPool,
  );

  if (chosenFallbackIndex !== null) {
    return chosenFallbackIndex;
  }

  return pickWeightedShapeIndex(pool);
}

// Generate a random piece
let pieceIdCounter = 0;
export function generatePiece(
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  colors?: string[],
  options: PieceGenerationOptions = {},
): Piece {
  const idx = pickBalancedShapeIndex(
    difficulty,
    recentGeneratedPieces,
    options,
  );
  const piece = createPieceFromShapeIndex(idx, colors);
  rememberGeneratedPiece(piece);
  return piece;
}

// Generate a piece from specific shape indices (for special piece items)
export function generateSpecificPiece(
  shapeIndices: number[],
  colors?: string[],
): Piece {
  const idx = shapeIndices[Math.floor(Math.random() * shapeIndices.length)];
  const piece = createPieceFromShapeIndex(idx, colors);
  rememberGeneratedPiece(piece);
  return piece;
}

// Generate 3 pieces
export function generatePieces(
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  colors?: string[],
  options: PieceGenerationOptions = {},
): Piece[] {
  return [
    generatePiece(difficulty, colors, options),
    generatePiece(difficulty, colors, options),
    generatePiece(difficulty, colors, options),
  ];
}

function applyPieceRewardRolls(
  piece: Piece,
  options: PieceGenerationOptions = {},
): Piece {
  let nextPiece = applyGemChance(piece, options.gemChanceBonus ?? 0);
  if (!nextPiece.isGem) {
    nextPiece = applyItemChance(
      nextPiece,
      options.itemChanceBonus ?? 0,
      options.rewardMode,
    );
  }
  return nextPiece;
}

// Generate 3 pieces guaranteed placeable on the given board.
// 1-2 pieces are "fill-friendly" (small shapes that fit gaps), rest random.
// All pieces are validated to be placeable somewhere on the board.
export function generatePlaceablePieces(
  board: Board,
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  colors?: string[],
  options: PieceGenerationOptions = {},
): Piece[] {
  const result: Piece[] = [];
  const fillCount = 1 + (Math.random() < 0.5 ? 1 : 0); // 1 or 2 fill-friendly

  // Generate fill-friendly pieces first
  for (let i = 0; i < fillCount; i++) {
    const history = [...recentGeneratedPieces, ...result];
    const piece = generateFillPiece(board, colors, history, options);
    if (piece) {
      result.push(applyPieceRewardRolls(piece, options));
    } else {
      const fallbackIdx = pickBalancedShapeIndex(
        difficulty,
        history,
        options,
        board,
      );
      result.push(
        applyPieceRewardRolls(
          createPieceFromShapeIndex(fallbackIdx, colors),
          options,
        ),
      );
    }
  }

  // Fill remaining with random but placeable pieces
  const remaining = 3 - result.length;
  for (let i = 0; i < remaining; i++) {
    let piece: Piece | null = null;
    const history = [...recentGeneratedPieces, ...result];
    for (let attempt = 0; attempt < 20; attempt++) {
      const shapeIdx = pickBalancedShapeIndex(
        difficulty,
        history,
        options,
        board,
      );
      const candidate = createPieceFromShapeIndex(shapeIdx, colors);
      if (canPlaceShapeAnywhere(board, candidate.shape)) {
        piece = applyPieceRewardRolls(candidate, options);
        break;
      }
    }
    // Fallback: if no placeable random piece found, use fill-friendly
    if (!piece) {
      const fallbackPiece =
        generateFillPiece(board, colors, history, options) ||
        createPieceFromShapeIndex(
          pickBalancedShapeIndex('easy', history, options, board),
          colors,
        );
      piece = applyPieceRewardRolls(fallbackPiece, options);
    }
    result.push(piece);
  }

  result.forEach(rememberGeneratedPiece);
  return result;
}

// Generate a small fill-friendly piece that fits somewhere on the board
function generateFillPiece(
  board: Board,
  colors?: string[],
  history: Piece[] = recentGeneratedPieces,
  options: PieceGenerationOptions = {},
): Piece | null {
  const previous = history.length > 0 ? history[history.length - 1] : null;
  const placeableIndices: number[] = [];

  for (const idx of getFillFriendlyGenerationPool(options)) {
    const shape = PIECE_SHAPES[idx];
    const candidate: Piece = {
      shape,
      color: '#000000',
      id: 0,
    };
    if (isImmediateRepeat(candidate, previous)) {
      continue;
    }

    if (canPlaceShapeAnywhere(board, shape)) {
      placeableIndices.push(idx);
    }
  }

  if (placeableIndices.length === 0) {
    return null;
  }

  return createPieceFromShapeIndex(
    pickWeightedShapeIndex(placeableIndices),
    colors,
  );
}

// Check if piece can be placed at position
export function canPlacePiece(
  board: Board,
  shape: PieceShape,
  row: number,
  col: number,
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] === 1) {
        const br = row + r;
        const bc = col + c;
        if (br < 0 || br >= ROWS || bc < 0 || bc >= COLS) return false;
        if (board[br][bc] !== null) return false;
      }
    }
  }
  return true;
}

// Check if any piece can be placed anywhere on the board
export function canPlaceAnyPiece(board: Board, pieces: Piece[]): boolean {
  for (const piece of pieces) {
    if (!piece) continue;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (canPlacePiece(board, piece.shape, r, c)) return true;
      }
    }
  }
  return false;
}

// Place a piece on the board (returns new board)
export function placePiece(
  board: Board,
  piece: Piece,
  row: number,
  col: number,
): Board {
  const newBoard = board.map(r => [...r]);
  const rewardMarker =
    piece.isGem || piece.isItem
      ? getPieceRewardMarkerCell(piece.shape)
      : null;
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c] === 1) {
        const isRewardMarker =
          rewardMarker !== null &&
          rewardMarker.row === r &&
          rewardMarker.col === c;
        newBoard[row + r][col + c] = {
          color: piece.color,
          isGem: isRewardMarker ? piece.isGem : undefined,
          isItem: isRewardMarker ? piece.isItem : undefined,
          itemType: isRewardMarker ? piece.itemType : undefined,
        };
      }
    }
  }
  return newBoard;
}

// Count blocks in a piece
export function countBlocks(shape: PieceShape): number {
  let count = 0;
  for (const row of shape) {
    for (const cell of row) {
      if (cell === 1) count++;
    }
  }
  return count;
}

// Find and clear complete lines.
// 'hard' obstacle blocks: count as "full" for line completion check,
// but remain on board until their hit counter reaches 0.
export function checkAndClearLines(board: Board): {
  newBoard: Board;
  clearedRows: number[];
  clearedCols: number[];
  stonesDestroyed: number;
  iceDestroyed: number;
  hardBlocksHit: number;
  gemsFound: number;
  itemsFound: string[];
} {
  const newBoard = board.map(r => [...r]);
  const clearedRows: number[] = [];
  const clearedCols: number[] = [];
  let stonesDestroyed = 0;
  let iceDestroyed = 0;
  let hardBlocksHit = 0;
  let gemsFound = 0;
  const itemsFound: string[] = [];

  // Check rows — stone blocks prevent clearing; hard blocks count as filled
  for (let r = 0; r < ROWS; r++) {
    let full = true;
    for (let c = 0; c < COLS; c++) {
      const cell = newBoard[r][c];
      if (cell === null) {
        full = false;
        break;
      }
      if (cell.type === 'stone') {
        full = false;
        break;
      }
    }
    if (full) clearedRows.push(r);
  }

  // Check columns
  for (let c = 0; c < COLS; c++) {
    let full = true;
    for (let r = 0; r < ROWS; r++) {
      const cell = newBoard[r][c];
      if (cell === null) {
        full = false;
        break;
      }
      if (cell.type === 'stone') {
        full = false;
        break;
      }
    }
    if (full) clearedCols.push(c);
  }

  // Helper: process clearing one cell
  const processCell = (r: number, c: number) => {
    const cell = newBoard[r][c];
    if (cell === null) return;

    if (cell.type === 'ice') {
      if ((cell.hits || 0) >= 1) {
        newBoard[r][c] = null;
        iceDestroyed++;
      } else {
        newBoard[r][c] = { ...cell, hits: (cell.hits || 0) + 1 };
      }
    } else if (cell.type === 'hard') {
      // hard block: reduce hit counter; disappears when hits reach 0
      const remaining = (cell.hits ?? 1) - 1;
      hardBlocksHit++;
      if (remaining <= 0) {
        newBoard[r][c] = null;
      } else {
        newBoard[r][c] = { ...cell, hits: remaining };
      }
    } else {
      // Normal cell — collect gem/item info before clearing
      if ((cell as any).isGem) gemsFound++;
      if ((cell as any).isItem && (cell as any).itemType) {
        itemsFound.push((cell as any).itemType);
      }
      newBoard[r][c] = null;
    }
  };

  // Clear rows
  for (const r of clearedRows) {
    for (let c = 0; c < COLS; c++) {
      processCell(r, c);
    }
  }

  // Clear columns (skip already-null cells)
  for (const c of clearedCols) {
    for (let r = 0; r < ROWS; r++) {
      if (newBoard[r][c] === null) continue;
      processCell(r, c);
    }
  }

  // Damage adjacent stones near cleared lines
  const damagedPositions = new Set<string>();
  for (const r of clearedRows) {
    for (let c = 0; c < COLS; c++) {
      damagedPositions.add(`${r - 1},${c}`);
      damagedPositions.add(`${r + 1},${c}`);
    }
  }
  for (const c of clearedCols) {
    for (let r = 0; r < ROWS; r++) {
      damagedPositions.add(`${r},${c - 1}`);
      damagedPositions.add(`${r},${c + 1}`);
    }
  }
  for (const pos of damagedPositions) {
    const [r, c] = pos.split(',').map(Number);
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      const cell = newBoard[r][c];
      if (cell?.type === 'stone') {
        newBoard[r][c] = null;
        stonesDestroyed++;
      }
    }
  }

  return {
    newBoard,
    clearedRows,
    clearedCols,
    stonesDestroyed,
    iceDestroyed,
    hardBlocksHit,
    gemsFound,
    itemsFound,
  };
}

export function clearLineTargets(
  board: Board,
  rows: number[],
  cols: number[],
): {
  newBoard: Board;
  clearedRows: number[];
  clearedCols: number[];
  stonesDestroyed: number;
  iceDestroyed: number;
  hardBlocksHit: number;
  gemsFound: number;
  itemsFound: string[];
} {
  const newBoard = board.map(r => [...r]);
  const safeRows = Array.from(
    new Set(rows.filter(row => row >= 0 && row < ROWS)),
  );
  const safeCols = Array.from(
    new Set(cols.filter(col => col >= 0 && col < COLS)),
  );
  let stonesDestroyed = 0;
  let iceDestroyed = 0;
  let hardBlocksHit = 0;
  let gemsFound = 0;
  const itemsFound: string[] = [];

  const processCell = (r: number, c: number) => {
    const cell = newBoard[r][c];
    if (cell === null) {
      return;
    }

    if (cell.type === 'ice') {
      if ((cell.hits || 0) >= 1) {
        newBoard[r][c] = null;
        iceDestroyed++;
      } else {
        newBoard[r][c] = { ...cell, hits: (cell.hits || 0) + 1 };
      }
      return;
    }

    if (cell.type === 'hard') {
      const remaining = (cell.hits ?? 1) - 1;
      hardBlocksHit++;
      if (remaining <= 0) {
        newBoard[r][c] = null;
      } else {
        newBoard[r][c] = { ...cell, hits: remaining };
      }
      return;
    }

    if ((cell as any).isGem) {
      gemsFound++;
    }
    if ((cell as any).isItem && (cell as any).itemType) {
      itemsFound.push((cell as any).itemType);
    }
    newBoard[r][c] = null;
  };

  for (const row of safeRows) {
    for (let c = 0; c < COLS; c++) {
      processCell(row, c);
    }
  }

  for (const col of safeCols) {
    for (let r = 0; r < ROWS; r++) {
      if (newBoard[r][col] === null) {
        continue;
      }
      processCell(r, col);
    }
  }

  const damagedPositions = new Set<string>();
  for (const row of safeRows) {
    for (let c = 0; c < COLS; c++) {
      damagedPositions.add(`${row - 1},${c}`);
      damagedPositions.add(`${row + 1},${c}`);
    }
  }
  for (const col of safeCols) {
    for (let r = 0; r < ROWS; r++) {
      damagedPositions.add(`${r},${col - 1}`);
      damagedPositions.add(`${r},${col + 1}`);
    }
  }

  for (const pos of damagedPositions) {
    const [r, c] = pos.split(',').map(Number);
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      const cell = newBoard[r][c];
      if (cell?.type === 'stone') {
        newBoard[r][c] = null;
        stonesDestroyed++;
      }
    }
  }

  return {
    newBoard,
    clearedRows: safeRows,
    clearedCols: safeCols,
    stonesDestroyed,
    iceDestroyed,
    hardBlocksHit,
    gemsFound,
    itemsFound,
  };
}

export function clearRandomLines(
  board: Board,
  count: number,
): {
  newBoard: Board;
  clearedRows: number[];
  clearedCols: number[];
  stonesDestroyed: number;
  iceDestroyed: number;
  hardBlocksHit: number;
  gemsFound: number;
  itemsFound: string[];
} {
  const rowCandidates = Array.from({ length: ROWS }, (_, row) => row).filter(
    row => board[row].some(cell => cell !== null),
  );
  const colCandidates = Array.from({ length: COLS }, (_, col) => col).filter(
    col => board.some(row => row[col] !== null),
  );
  const lineCandidates = [
    ...rowCandidates.map(row => ({ kind: 'row' as const, index: row })),
    ...colCandidates.map(col => ({ kind: 'col' as const, index: col })),
  ];

  if (lineCandidates.length === 0 || count <= 0) {
    return clearLineTargets(board, [], []);
  }

  const selectedRows: number[] = [];
  const selectedCols: number[] = [];
  const remaining = [...lineCandidates];
  const selectionCount = Math.min(count, remaining.length);

  for (let pick = 0; pick < selectionCount; pick += 1) {
    const nextIndex = Math.floor(Math.random() * remaining.length);
    const [next] = remaining.splice(nextIndex, 1);
    if (!next) {
      break;
    }

    if (next.kind === 'row') {
      selectedRows.push(next.index);
    } else {
      selectedCols.push(next.index);
    }
  }

  return clearLineTargets(board, selectedRows, selectedCols);
}

export function fillRandomEmptyCells(
  board: Board,
  count: number,
  colors?: string[],
): Board {
  if (count <= 0) {
    return board;
  }

  const newBoard = board.map(r => [...r]);
  const empties: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (newBoard[row][col] === null) {
        empties.push({ row, col });
      }
    }
  }

  let remaining = Math.min(count, empties.length);
  while (remaining > 0 && empties.length > 0) {
    const nextIndex = Math.floor(Math.random() * empties.length);
    const [nextCell] = empties.splice(nextIndex, 1);
    if (!nextCell) {
      break;
    }
    newBoard[nextCell.row][nextCell.col] = { color: randomColor(colors) };
    remaining -= 1;
  }

  return newBoard;
}

// Predict which rows/cols will clear if a piece is placed at (row, col)
export function predictClearLines(
  board: Board,
  shape: PieceShape,
  row: number,
  col: number,
): { rows: number[]; cols: number[] } {
  // Simulate placement
  const simBoard = board.map(r => [...r]);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] === 1) {
        simBoard[row + r][col + c] = { color: '#fff' };
      }
    }
  }
  const rows: number[] = [];
  const cols: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    let full = true;
    for (let c = 0; c < COLS; c++) {
      if (simBoard[r][c] === null || simBoard[r][c]?.type === 'stone') {
        full = false;
        break;
      }
    }
    if (full) rows.push(r);
  }
  for (let c = 0; c < COLS; c++) {
    let full = true;
    for (let r = 0; r < ROWS; r++) {
      if (simBoard[r][c] === null || simBoard[r][c]?.type === 'stone') {
        full = false;
        break;
      }
    }
    if (full) cols.push(c);
  }
  return { rows, cols };
}

// Calculate score for a placement
export function calculateScore(
  blockCount: number,
  linesCleared: number,
  combo: number,
  feverActive: boolean = false,
): number {
  let score = blockCount * 10;
  score += linesCleared * 100;
  if (combo > 1) score += combo * 50;
  if (feverActive) score *= 2;
  return score;
}

// Calculate stars earned for a score
export function calculateStars(
  score: number,
  thresholds: [number, number, number],
): number {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}

// Add obstacles to board
// 'hard' obstacles require `hits` line-clears to destroy (x-block system)
export function addObstacles(
  board: Board,
  obstacles: { type: 'stone' | 'ice' | 'hard'; count: number; hits?: number }[],
): Board {
  const newBoard = board.map(r => [...r]);
  for (const obs of obstacles) {
    let placed = 0;
    let attempts = 0;
    while (placed < obs.count && attempts < 100) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (newBoard[r][c] === null) {
        let color = '#9ca3af';
        if (obs.type === 'ice') color = '#93c5fd';
        if (obs.type === 'hard') color = '#7c3aed';
        newBoard[r][c] = {
          color,
          type: obs.type,
          hits: obs.type === 'hard' ? obs.hits ?? 2 : 0,
        };
        placed++;
      }
      attempts++;
    }
  }
  return newBoard;
}

// Add hard (x-hit) obstacles during endless mode based on score level
// score-based: higher score → more hard blocks with higher hit counts
export function addEndlessHardObstacles(board: Board, level: number): Board {
  if (level < 3) return board; // no obstacles in early levels
  const newBoard = board.map(r => [...r]);
  const count = Math.min(Math.floor((level - 2) / 2), 6); // max 6 obstacles
  const hitCount = Math.min(Math.ceil(level / 3), 5); // max x5
  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < 200) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (newBoard[r][c] === null) {
      newBoard[r][c] = { color: '#7c3aed', type: 'hard', hits: hitCount };
      placed++;
    }
    attempts++;
  }
  return newBoard;
}

// Apply random gem block chance (1-2%) to a generated piece
export function applyGemChance(piece: Piece, chanceBonus: number = 0): Piece {
  if (Math.random() < GEM_BLOCK_SPAWN_RATE + chanceBonus) {
    return { ...piece, isGem: true, color: '#f59e0b' }; // gold color for gems
  }
  return piece;
}

// Apply random item block chance to a generated piece
export function applyItemChance(
  piece: Piece,
  chanceBonus: number = 0,
  rewardMode?: GameModeRewardItemKey,
): Piece {
  const itemPool = getItemDropPool(rewardMode);
  if (itemPool.length === 0) {
    return piece;
  }

  if (Math.random() < ITEM_BLOCK_SPAWN_RATE + chanceBonus) {
    const itemType = itemPool[Math.floor(Math.random() * itemPool.length)];
    return { ...piece, isItem: true, itemType, color: '#ec4899' };
  }
  return piece;
}

// Generate piece with optional gem/item rolls
export function generatePieceWithEffects(
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  colors?: string[],
  options: PieceGenerationOptions = {},
): Piece {
  let piece = generatePiece(difficulty, colors, options);
  piece = applyGemChance(piece, options.gemChanceBonus ?? 0);
  if (!piece.isGem)
    piece = applyItemChance(
      piece,
      options.itemChanceBonus ?? 0,
      options.rewardMode,
    );
  return piece;
}

// Generate 3 pieces with effects
export function generatePiecesWithEffects(
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  colors?: string[],
  options: PieceGenerationOptions = {},
): Piece[] {
  return [
    generatePieceWithEffects(difficulty, colors, options),
    generatePieceWithEffects(difficulty, colors, options),
    generatePieceWithEffects(difficulty, colors, options),
  ];
}

// Use hammer on a cell
export function useHammer(
  board: Board,
  row: number,
  col: number,
): Board | null {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
  if (board[row][col] === null) return null;
  const newBoard = board.map(r => [...r]);
  newBoard[row][col] = null;
  return newBoard;
}

// Use bomb on a cell (3x3 area)
export function useBomb(
  board: Board,
  row: number,
  col: number,
): { board: Board; destroyed: number } {
  const newBoard = board.map(r => [...r]);
  let destroyed = 0;
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && newBoard[r][c] !== null) {
        newBoard[r][c] = null;
        destroyed++;
      }
    }
  }
  return { board: newBoard, destroyed };
}

// Seeded random for battle mode
export function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate pieces with seed (for battle mode sync)
// Guarantees 1 of 3 pieces is always a fill-friendly shape
export function generateSeededPieces(seed: number, round: number): Piece[] {
  const rng = mulberry32(seed + round * 12345);
  const pieces: Piece[] = [];
  const fillFriendlyPool = getFillFriendlyGenerationPool();
  const generationPool = getGenerationPoolForDifficulty('hard');

  // First piece: always fill-friendly
  const fillIdx = pickWeightedShapeIndex(fillFriendlyPool, rng);
  const fillColorIdx = Math.floor(rng() * COLORS.length);
  pieces.push({
    shape: PIECE_SHAPES[fillIdx],
    color: COLORS[fillColorIdx],
    id: ++pieceIdCounter,
  });

  // Remaining 2 pieces: random
  for (let i = 0; i < 2; i++) {
    const idx = generationPool[Math.floor(rng() * generationPool.length)];
    const colorIdx = Math.floor(rng() * COLORS.length);
    pieces.push({
      shape: PIECE_SHAPES[idx],
      color: COLORS[colorIdx],
      id: ++pieceIdCounter,
    });
  }
  return pieces;
}

// Generate attack lines (random filled rows for battle)
export function generateAttackLines(board: Board, lineCount: number): Board {
  const newBoard = board.map(r => [...r]);
  // Shift existing rows up
  for (let i = 0; i < ROWS - lineCount; i++) {
    newBoard[i] = [...newBoard[i + lineCount]];
  }
  // Add attack lines at bottom with one random gap
  for (let i = ROWS - lineCount; i < ROWS; i++) {
    const gap = Math.floor(Math.random() * COLS);
    for (let c = 0; c < COLS; c++) {
      newBoard[i][c] = c === gap ? null : { color: '#6b7280' };
    }
  }
  return newBoard;
}

// Get difficulty for endless mode based on level
export function getDifficulty(level: number): 'easy' | 'medium' | 'hard' {
  if (level <= 3) return 'easy';
  if (level <= 6) return 'medium';
  return 'hard';
}

// Get endless mode level from score
export function getEndlessLevel(score: number, thresholds: number[]): number {
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (score >= thresholds[i]) return i + 1;
  }
  return 1;
}
