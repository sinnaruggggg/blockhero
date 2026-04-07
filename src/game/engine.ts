import {ROWS, COLS, COLORS, PIECE_SHAPES, PIECES_EASY, PIECES_MEDIUM, PIECES_HARD} from '../constants';

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
}

export interface Piece {
  shape: PieceShape;
  color: string;
  id: number;
  isGem?: boolean;   // 보석 블록 (1-2% 확률)
  isItem?: boolean;  // 아이템 블록 (2% 확률)
  itemType?: string; // 아이템 종류
}

export interface PlaceResult {
  board: Board;
  linesCleared: number;
  scoreGained: number;
  damageDealt: number;  // blocks × attackPower
  combo: number;
  clearedRows: number[];
  clearedCols: number[];
  stonesDestroyed: number;
  iceDestroyed: number;
  hardBlocksHit: number; // hard obstacles that took a hit
  gemsFound: number;     // gem cells cleared
  itemsFound: string[];  // item cells cleared
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
  return Array.from({length: ROWS}, () => Array(COLS).fill(null));
}

// Generate random color (supports skin colors)
export function randomColor(colors?: string[]): string {
  const c = colors || COLORS;
  return c[Math.floor(Math.random() * c.length)];
}

// Fill-friendly pieces: simple shapes that cleanly fill gaps
// 0=1x1, 1=1x2, 2=2x1, 3=1x3, 4=3x1, 9=2x2
const FILL_FRIENDLY = [0, 1, 2, 3, 4, 9];
const REDUCED_SMALL_PIECE_PROBABILITY = 0.5;
const PIECE_HISTORY_LIMIT = 8;
let recentGeneratedPieces: Piece[] = [];

function getPieceShapeKey(shape: PieceShape): string {
  return shape.map(row => row.join('')).join('|');
}

function rotateShape(shape: PieceShape): PieceShape {
  return Array.from({length: shape[0].length}, (_, colIndex) =>
    Array.from({length: shape.length}, (_, rowIndex) =>
      shape[shape.length - 1 - rowIndex][colIndex],
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

function getPieceFamilyKey(shape: PieceShape): string {
  if (isLineShape(shape)) {
    return `line:${countBlocks(shape)}`;
  }

  return getNormalizedPiecePatternKey(shape);
}

function rememberGeneratedPiece(piece: Piece) {
  recentGeneratedPieces = [...recentGeneratedPieces, piece].slice(-PIECE_HISTORY_LIMIT);
}

export function resetPieceGenerationHistory() {
  recentGeneratedPieces = [];
}

function getPoolForDifficulty(
  difficulty: 'easy' | 'medium' | 'hard',
): number[] {
  if (difficulty === 'hard') {
    return PIECES_HARD;
  }
  if (difficulty === 'medium') {
    return PIECES_MEDIUM;
  }
  return PIECES_EASY;
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

export function getShapeSpawnWeight(shapeIndex: number, pool: number[]): number {
  if (!isReducedSmallPieceShapeIndex(shapeIndex)) {
    return 1;
  }

  return getReducedSmallPieceWeightMultiplier(pool);
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
  const recentFamilyMatches = recent.filter(
    previous => getPieceFamilyKey(previous.shape) === candidateFamilyKey,
  ).length;
  const recentCountMatches = recent.filter(
    previous => countBlocks(previous.shape) === candidateCount,
  ).length;

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

  return score;
}

function hasRecentFamilySaturation(candidate: Piece, history: Piece[]): boolean {
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
): {shapeIndex: number; score: number; immediateRepeat: boolean}[] {
  const previous = history.length > 0 ? history[history.length - 1] : null;
  const uniquePool = [...new Set(sourcePool)];

  return uniquePool
    .filter(shapeIndex => !board || canPlaceShapeAnywhere(board, PIECE_SHAPES[shapeIndex]))
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
  candidates: {shapeIndex: number; score: number}[],
  sourcePool: number[],
): number | null {
  if (candidates.length === 0) {
    return null;
  }

  const bestScore = candidates[0].score;
  const preferredCandidates = candidates.filter(candidate => candidate.score <= bestScore + 8);
  const weightedPool = preferredCandidates.flatMap(candidate => {
    const duplicateCount = sourcePool.filter(entry => entry === candidate.shapeIndex).length;
    return Array.from({length: Math.max(1, duplicateCount)}, () => candidate.shapeIndex);
  });

  if (weightedPool.length === 0) {
    return preferredCandidates[0].shapeIndex;
  }

  return weightedPool[Math.floor(Math.random() * weightedPool.length)];
}

function getPreferredSourcePool(
  difficulty: 'easy' | 'medium' | 'hard',
  options: PieceGenerationOptions = {},
): number[] {
  const pool = getPoolForDifficulty(difficulty);
  const preferSmall =
    (options.smallPieceChanceBonus ?? 0) > 0 &&
    Math.random() < (options.smallPieceChanceBonus ?? 0);

  return preferSmall ? FILL_FRIENDLY : pool;
}

function pickBalancedShapeIndex(
  difficulty: 'easy' | 'medium' | 'hard',
  history: Piece[],
  options: PieceGenerationOptions = {},
  board?: Board,
): number {
  const pool = getPoolForDifficulty(difficulty);
  const sourcePool = getPreferredSourcePool(difficulty, options);
  const rankedPreferredCandidates = getRankedShapeCandidates(sourcePool, history, board);
  const rankedPreferredNonRepeat = rankedPreferredCandidates.filter(
    candidate => !candidate.immediateRepeat,
  );
  const chosenPreferredIndex = pickFromRankedCandidates(
    rankedPreferredNonRepeat.length > 0 ? rankedPreferredNonRepeat : rankedPreferredCandidates,
    sourcePool,
  );

  if (chosenPreferredIndex !== null) {
    return chosenPreferredIndex;
  }

  const fallbackPool = [...new Set([...FILL_FRIENDLY, ...pool])];
  const rankedFallbackCandidates = getRankedShapeCandidates(fallbackPool, history, board);
  const rankedFallbackNonRepeat = rankedFallbackCandidates.filter(
    candidate => !candidate.immediateRepeat,
  );
  const chosenFallbackIndex = pickFromRankedCandidates(
    rankedFallbackNonRepeat.length > 0 ? rankedFallbackNonRepeat : rankedFallbackCandidates,
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
export function generateSpecificPiece(shapeIndices: number[], colors?: string[]): Piece {
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

function applyPieceRewardRolls(piece: Piece, options: PieceGenerationOptions = {}): Piece {
  let nextPiece = applyGemChance(piece, options.gemChanceBonus ?? 0);
  if (!nextPiece.isGem) {
    nextPiece = applyItemChance(nextPiece, options.itemChanceBonus ?? 0);
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
    const piece = generateFillPiece(board, colors, history);
    if (piece) {
      result.push(applyPieceRewardRolls(piece, options));
    } else {
      const fallbackIdx = pickBalancedShapeIndex(difficulty, history, options, board);
      result.push(
        applyPieceRewardRolls(createPieceFromShapeIndex(fallbackIdx, colors), options),
      );
    }
  }

  // Fill remaining with random but placeable pieces
  const remaining = 3 - result.length;
  for (let i = 0; i < remaining; i++) {
    let piece: Piece | null = null;
    const history = [...recentGeneratedPieces, ...result];
    for (let attempt = 0; attempt < 20; attempt++) {
      const shapeIdx = pickBalancedShapeIndex(difficulty, history, options, board);
      const candidate = createPieceFromShapeIndex(shapeIdx, colors);
      if (canPlaceShapeAnywhere(board, candidate.shape)) {
        piece = applyPieceRewardRolls(candidate, options);
        break;
      }
    }
    // Fallback: if no placeable random piece found, use fill-friendly
    if (!piece) {
      const fallbackPiece =
        generateFillPiece(board, colors, history) ||
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
): Piece | null {
  const previous = history.length > 0 ? history[history.length - 1] : null;
  const placeableIndices: number[] = [];

  for (const idx of FILL_FRIENDLY) {
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

  return createPieceFromShapeIndex(pickWeightedShapeIndex(placeableIndices), colors);
}

// Check if piece can be placed at position
export function canPlacePiece(board: Board, shape: PieceShape, row: number, col: number): boolean {
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
export function placePiece(board: Board, piece: Piece, row: number, col: number): Board {
  const newBoard = board.map(r => [...r]);
  let rewardMarkerPlaced = false;
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c] === 1) {
        newBoard[row + r][col + c] = {
          color: piece.color,
          isGem: !rewardMarkerPlaced && piece.isGem,
          isItem: !rewardMarkerPlaced && piece.isItem,
          itemType: !rewardMarkerPlaced ? piece.itemType : undefined,
        };
        rewardMarkerPlaced = rewardMarkerPlaced || piece.isGem === true || piece.isItem === true;
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
      if (cell === null) { full = false; break; }
      if (cell.type === 'stone') { full = false; break; }
    }
    if (full) clearedRows.push(r);
  }

  // Check columns
  for (let c = 0; c < COLS; c++) {
    let full = true;
    for (let r = 0; r < ROWS; r++) {
      const cell = newBoard[r][c];
      if (cell === null) { full = false; break; }
      if (cell.type === 'stone') { full = false; break; }
    }
    if (full) clearedCols.push(c);
  }

  // Helper: process clearing one cell
  const processCell = (r: number, c: number) => {
    const cell = newBoard[r][c];
    if (cell === null) return;

    if (cell.type === 'ice') {
      if ((cell.hits || 0) >= 1) { newBoard[r][c] = null; iceDestroyed++; }
      else { newBoard[r][c] = {...cell, hits: (cell.hits || 0) + 1}; }
    } else if (cell.type === 'hard') {
      // hard block: reduce hit counter; disappears when hits reach 0
      const remaining = (cell.hits ?? 1) - 1;
      hardBlocksHit++;
      if (remaining <= 0) { newBoard[r][c] = null; }
      else { newBoard[r][c] = {...cell, hits: remaining}; }
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
      if (cell?.type === 'stone') { newBoard[r][c] = null; stonesDestroyed++; }
    }
  }

  return {newBoard, clearedRows, clearedCols, stonesDestroyed, iceDestroyed, hardBlocksHit, gemsFound, itemsFound};
}

// Predict which rows/cols will clear if a piece is placed at (row, col)
export function predictClearLines(
  board: Board,
  shape: PieceShape,
  row: number,
  col: number,
): {rows: number[]; cols: number[]} {
  // Simulate placement
  const simBoard = board.map(r => [...r]);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] === 1) {
        simBoard[row + r][col + c] = {color: '#fff'};
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
  return {rows, cols};
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
export function calculateStars(score: number, thresholds: [number, number, number]): number {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}

// Add obstacles to board
// 'hard' obstacles require `hits` line-clears to destroy (x-block system)
export function addObstacles(
  board: Board,
  obstacles: {type: 'stone' | 'ice' | 'hard'; count: number; hits?: number}[],
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
          hits: obs.type === 'hard' ? (obs.hits ?? 2) : 0,
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
  const hitCount = Math.min(Math.ceil(level / 3), 5);      // max x5
  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < 200) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (newBoard[r][c] === null) {
      newBoard[r][c] = {color: '#7c3aed', type: 'hard', hits: hitCount};
      placed++;
    }
    attempts++;
  }
  return newBoard;
}

// Apply random gem block chance (1-2%) to a generated piece
export function applyGemChance(piece: Piece, chanceBonus: number = 0): Piece {
  if (Math.random() < 0.015 + chanceBonus) { // 1.5% chance
    return {...piece, isGem: true, color: '#f59e0b'}; // gold color for gems
  }
  return piece;
}

// Apply random item block chance (2%) to a generated piece
const ITEM_TYPES = ['hammer', 'bomb', 'refresh'];
export function applyItemChance(piece: Piece, chanceBonus: number = 0): Piece {
  if (Math.random() < 0.02 + chanceBonus) {
    const itemType = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    return {...piece, isItem: true, itemType, color: '#ec4899'};
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
  if (!piece.isGem) piece = applyItemChance(piece, options.itemChanceBonus ?? 0);
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
export function useHammer(board: Board, row: number, col: number): Board | null {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
  if (board[row][col] === null) return null;
  const newBoard = board.map(r => [...r]);
  newBoard[row][col] = null;
  return newBoard;
}

// Use bomb on a cell (3x3 area)
export function useBomb(board: Board, row: number, col: number): {board: Board; destroyed: number} {
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
  return {board: newBoard, destroyed};
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

  // First piece: always fill-friendly
  const fillIdx = pickWeightedShapeIndex(FILL_FRIENDLY, rng);
  const fillColorIdx = Math.floor(rng() * COLORS.length);
  pieces.push({
    shape: PIECE_SHAPES[fillIdx],
    color: COLORS[fillColorIdx],
    id: ++pieceIdCounter,
  });

  // Remaining 2 pieces: random
  for (let i = 0; i < 2; i++) {
    const idx = Math.floor(rng() * PIECE_SHAPES.length);
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
      newBoard[i][c] = c === gap ? null : {color: '#6b7280'};
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
