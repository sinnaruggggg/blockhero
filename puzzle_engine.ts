import {rollSpecialCell} from './combat_rules';
import type {DefaultItemId} from './combat_rules';

export const BOARD_ROWS = 10;
export const BOARD_COLS = 8;

export interface BoardCell {
  color: string;
  obstacleDurability?: number;
  obstacleMaxDurability?: number;
  specialKind?: 'item' | 'gem';
  specialItemId?: DefaultItemId;
}

export type BoardState = Array<Array<BoardCell | null>>;

export type PieceShape = number[][];

export interface PieceDefinition {
  id: number;
  color: string;
  shape: PieceShape;
}

export interface PieceGenerationOptions {
  smallPieceRateBonus?: number;
}

export interface PlacementOrigin {
  row: number;
  col: number;
}

export interface ClearedSpecialReward {
  kind: 'item' | 'gem';
  itemId?: DefaultItemId;
}

export interface PlacementResult {
  board: BoardState;
  placedCells: number;
  clearedRows: number[];
  clearedCols: number[];
  clearedLines: number;
  rewards: ClearedSpecialReward[];
}

const COLORS = [
  '#f97316',
  '#22c55e',
  '#38bdf8',
  '#e879f9',
  '#facc15',
  '#fb7185',
  '#34d399',
  '#a78bfa',
];

const PIECE_SHAPES: PieceShape[] = [
  [[1]],
  [[1, 1]],
  [[1], [1]],
  [[1, 1, 1]],
  [[1], [1], [1]],
  [[1, 1], [1, 1]],
  [[1, 1], [1, 0]],
  [[1, 1], [0, 1]],
  [[1, 0], [1, 1]],
  [[0, 1], [1, 1]],
  [[1, 1, 1, 1]],
  [[1], [1], [1], [1]],
  [[1, 1, 1], [0, 1, 0]],
  [[1, 1, 1], [1, 0, 0]],
  [[1, 1, 1], [0, 0, 1]],
  [[1, 0], [1, 0], [1, 1]],
  [[0, 1], [0, 1], [1, 1]],
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
];

let pieceIdCounter = 1;

function createEmptyRow(): Array<BoardCell | null> {
  return Array.from({length: BOARD_COLS}, () => null);
}

export function createEmptyBoard(): BoardState {
  return Array.from({length: BOARD_ROWS}, () => createEmptyRow());
}

export function cloneBoard(board: BoardState): BoardState {
  return board.map(row =>
    row.map(cell =>
      cell
        ? {
            ...cell,
          }
        : null,
    ),
  );
}

export function countPieceCells(shape: PieceShape): number {
  return shape.reduce(
    (total, row) => total + row.reduce((sum, cell) => sum + (cell === 1 ? 1 : 0), 0),
    0,
  );
}

const SMALL_PIECE_SHAPES = PIECE_SHAPES.filter(shape => countPieceCells(shape) <= 2);

function pickRandomShape(pool: PieceShape[]): PieceShape {
  return pool[Math.floor(Math.random() * pool.length)];
}

export function createRandomPiece(
  options: PieceGenerationOptions = {},
): PieceDefinition {
  const smallPieceRateBonus = Math.max(0, Math.min(1, options.smallPieceRateBonus ?? 0));
  const shape =
    Math.random() < smallPieceRateBonus
      ? pickRandomShape(SMALL_PIECE_SHAPES)
      : pickRandomShape(PIECE_SHAPES);
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];

  return {
    id: pieceIdCounter++,
    color,
    shape,
  };
}

export function createPiecePack(
  options: PieceGenerationOptions = {},
): PieceDefinition[] {
  return [
    createRandomPiece(options),
    createRandomPiece(options),
    createRandomPiece(options),
  ];
}

export function createPieceQueue(
  count: number,
  options: PieceGenerationOptions = {},
): PieceDefinition[] {
  return Array.from({length: Math.max(0, count)}, () => createRandomPiece(options));
}

export function getCenteredOrigin(
  shape: PieceShape,
  targetRow: number,
  targetCol: number,
): PlacementOrigin {
  return {
    row: targetRow - Math.floor(shape.length / 2),
    col: targetCol - Math.floor(shape[0].length / 2),
  };
}

export function canPlacePiece(
  board: BoardState,
  shape: PieceShape,
  origin: PlacementOrigin,
): boolean {
  for (let row = 0; row < shape.length; row += 1) {
    for (let col = 0; col < shape[row].length; col += 1) {
      if (shape[row][col] !== 1) {
        continue;
      }

      const boardRow = origin.row + row;
      const boardCol = origin.col + col;

      if (
        boardRow < 0 ||
        boardRow >= BOARD_ROWS ||
        boardCol < 0 ||
        boardCol >= BOARD_COLS
      ) {
        return false;
      }

      if (board[boardRow][boardCol] !== null) {
        return false;
      }
    }
  }

  return true;
}

function isLineFilled(cells: Array<BoardCell | null>): boolean {
  return cells.every(Boolean);
}

function collectReward(cell: BoardCell | null, rewards: ClearedSpecialReward[]): void {
  if (!cell?.specialKind) {
    return;
  }

  if (cell.specialKind === 'gem') {
    rewards.push({kind: 'gem'});
    return;
  }

  rewards.push({
    kind: 'item',
    itemId: cell.specialItemId,
  });
}

function clearCell(
  board: BoardState,
  row: number,
  col: number,
  rewards: ClearedSpecialReward[],
): void {
  const cell = board[row][col];
  if (!cell) {
    return;
  }

  collectReward(cell, rewards);

  if (cell.obstacleDurability && cell.obstacleDurability > 1) {
    board[row][col] = {
      ...cell,
      obstacleDurability: cell.obstacleDurability - 1,
      specialKind: undefined,
      specialItemId: undefined,
    };
    return;
  }

  board[row][col] = null;
}

export function applyPiecePlacement(
  board: BoardState,
  piece: PieceDefinition,
  origin: PlacementOrigin,
  rareItemRateBonus: number = 0,
  diamondCellRateBonus: number = 0,
): PlacementResult | null {
  if (!canPlacePiece(board, piece.shape, origin)) {
    return null;
  }

  const nextBoard = cloneBoard(board);
  const placedPositions: Array<{row: number; col: number}> = [];

  for (let row = 0; row < piece.shape.length; row += 1) {
    for (let col = 0; col < piece.shape[row].length; col += 1) {
      if (piece.shape[row][col] !== 1) {
        continue;
      }

      const boardRow = origin.row + row;
      const boardCol = origin.col + col;
      const special = rollSpecialCell(Math.random(), Math.random(), {
        attackRateBonus: 0,
        maxHpRateBonus: 0,
        comboWindowMsBonus: 0,
        feverRequirementRate: 1,
        feverDurationMsBonus: 0,
        feverDamageRateBonus: 0,
        incomingDamageReductionRate: 0,
        endlessObstacleSpawnReductionRate: 0,
        lineClearDamageRateBonus: 0,
        baseAttackRatePartyBonus: 0,
        raidDamageRatePartyBonus: 0,
        skillDamageRatePartyBonus: 0,
        currencyRewardRateBonus: 0,
        diamondCellRateBonus,
        bonusDiamondChance: 0,
        rareItemRateBonus,
        heartMaxBonus: 0,
        heartRegenReductionRate: 0,
      });

      nextBoard[boardRow][boardCol] = {
        color: piece.color,
        specialKind: special.kind === 'none' ? undefined : special.kind,
        specialItemId: special.itemId,
      };

      placedPositions.push({row: boardRow, col: boardCol});
    }
  }

  const clearedRows: number[] = [];
  const clearedCols: number[] = [];

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    if (isLineFilled(nextBoard[row])) {
      clearedRows.push(row);
    }
  }

  for (let col = 0; col < BOARD_COLS; col += 1) {
    const columnCells = Array.from({length: BOARD_ROWS}, (_, row) => nextBoard[row][col]);
    if (isLineFilled(columnCells)) {
      clearedCols.push(col);
    }
  }

  const rewards: ClearedSpecialReward[] = [];

  for (const row of clearedRows) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      clearCell(nextBoard, row, col, rewards);
    }
  }

  for (const col of clearedCols) {
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      clearCell(nextBoard, row, col, rewards);
    }
  }

  return {
    board: nextBoard,
    placedCells: placedPositions.length,
    clearedRows,
    clearedCols,
    clearedLines: clearedRows.length + clearedCols.length,
    rewards,
  };
}

export function canPlaceAnyPiece(
  board: BoardState,
  pieces: PieceDefinition[],
): boolean {
  for (const piece of pieces) {
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        if (canPlacePiece(board, piece.shape, getCenteredOrigin(piece.shape, row, col))) {
          return true;
        }
      }
    }
  }

  return false;
}

export function addRandomObstacle(board: BoardState, durability: number): BoardState {
  const nextBoard = cloneBoard(board);
  const emptyPositions: Array<{row: number; col: number}> = [];

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      if (nextBoard[row][col] === null) {
        emptyPositions.push({row, col});
      }
    }
  }

  if (emptyPositions.length === 0) {
    return nextBoard;
  }

  const position = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
  nextBoard[position.row][position.col] = {
    color: '#6b7280',
    obstacleDurability: durability,
    obstacleMaxDurability: durability,
  };

  return nextBoard;
}

export function getPieceText(piece: PieceDefinition): string {
  return piece.shape
    .map(row => row.map(cell => (cell === 1 ? '[]' : '..')).join(' '))
    .join('\n');
}
