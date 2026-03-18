import {ROWS, COLS, COLORS, PIECE_SHAPES, PIECES_EASY, PIECES_MEDIUM, PIECES_HARD} from '../constants';

// Types
export type CellValue = null | {color: string; type?: 'stone' | 'ice'; hits?: number};
export type Board = CellValue[][];
export type PieceShape = number[][];

export interface Piece {
  shape: PieceShape;
  color: string;
  id: number;
}

export interface PlaceResult {
  board: Board;
  linesCleared: number;
  scoreGained: number;
  combo: number;
  clearedRows: number[];
  clearedCols: number[];
  stonesDestroyed: number;
  iceDestroyed: number;
}

// Create empty board
export function createBoard(): Board {
  return Array.from({length: ROWS}, () => Array(COLS).fill(null));
}

// Generate random color
export function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// Generate a random piece
let pieceIdCounter = 0;
export function generatePiece(difficulty: 'easy' | 'medium' | 'hard' = 'easy'): Piece {
  const pool =
    difficulty === 'hard' ? PIECES_HARD :
    difficulty === 'medium' ? PIECES_MEDIUM :
    PIECES_EASY;
  const idx = pool[Math.floor(Math.random() * pool.length)];
  return {
    shape: PIECE_SHAPES[idx],
    color: randomColor(),
    id: ++pieceIdCounter,
  };
}

// Generate 3 pieces
export function generatePieces(difficulty: 'easy' | 'medium' | 'hard' = 'easy'): Piece[] {
  return [generatePiece(difficulty), generatePiece(difficulty), generatePiece(difficulty)];
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
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c] === 1) {
        newBoard[row + r][col + c] = {color: piece.color};
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

// Find and clear complete lines
export function checkAndClearLines(board: Board): {
  newBoard: Board;
  clearedRows: number[];
  clearedCols: number[];
  stonesDestroyed: number;
  iceDestroyed: number;
} {
  const newBoard = board.map(r => [...r]);
  const clearedRows: number[] = [];
  const clearedCols: number[] = [];
  let stonesDestroyed = 0;
  let iceDestroyed = 0;

  // Check rows
  for (let r = 0; r < ROWS; r++) {
    let full = true;
    for (let c = 0; c < COLS; c++) {
      if (newBoard[r][c] === null) {
        full = false;
        break;
      }
      if (newBoard[r][c]?.type === 'stone') {
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
      if (newBoard[r][c] === null) {
        full = false;
        break;
      }
      if (newBoard[r][c]?.type === 'stone') {
        full = false;
        break;
      }
    }
    if (full) clearedCols.push(c);
  }

  // Clear rows
  for (const r of clearedRows) {
    for (let c = 0; c < COLS; c++) {
      const cell = newBoard[r][c];
      if (cell?.type === 'ice') {
        if ((cell.hits || 0) >= 1) {
          newBoard[r][c] = null;
          iceDestroyed++;
        } else {
          newBoard[r][c] = {...cell, hits: (cell.hits || 0) + 1};
        }
      } else {
        newBoard[r][c] = null;
      }
    }
  }

  // Clear columns
  for (const c of clearedCols) {
    for (let r = 0; r < ROWS; r++) {
      const cell = newBoard[r][c];
      if (cell === null) continue; // already cleared
      if (cell?.type === 'ice') {
        if ((cell.hits || 0) >= 1) {
          newBoard[r][c] = null;
          iceDestroyed++;
        } else {
          newBoard[r][c] = {...cell, hits: (cell.hits || 0) + 1};
        }
      } else {
        newBoard[r][c] = null;
      }
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

  return {newBoard, clearedRows, clearedCols, stonesDestroyed, iceDestroyed};
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
export function addObstacles(
  board: Board,
  obstacles: {type: 'stone' | 'ice'; count: number}[],
): Board {
  const newBoard = board.map(r => [...r]);
  for (const obs of obstacles) {
    let placed = 0;
    let attempts = 0;
    while (placed < obs.count && attempts < 100) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (newBoard[r][c] === null) {
        newBoard[r][c] = {
          color: obs.type === 'stone' ? '#9ca3af' : '#93c5fd',
          type: obs.type,
          hits: 0,
        };
        placed++;
      }
      attempts++;
    }
  }
  return newBoard;
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

// Fill-friendly pieces: simple shapes that cleanly fill gaps
// 0=1x1, 1=1x2, 2=2x1, 3=1x3, 4=3x1, 9=2x2
const FILL_FRIENDLY = [0, 1, 2, 3, 4, 9];

// Generate pieces with seed (for battle mode sync)
// Guarantees 1 of 3 pieces is always a fill-friendly shape
export function generateSeededPieces(seed: number, round: number): Piece[] {
  const rng = mulberry32(seed + round * 12345);
  const pieces: Piece[] = [];

  // First piece: always fill-friendly
  const fillIdx = FILL_FRIENDLY[Math.floor(rng() * FILL_FRIENDLY.length)];
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
