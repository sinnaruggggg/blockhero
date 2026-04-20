import type { CharacterSkillEffects } from './characterSkillEffects';
import {
  checkAndClearLines,
  clearLineTargets,
  clearRandomLines,
  randomColor,
  type Board,
  type CellValue,
  type Piece,
} from './engine';
import { COLS, ROWS } from '../constants';

interface ApplySkillBoardEffectsInput {
  board: Board;
  piece: Piece;
  row: number;
  col: number;
  didClear: boolean;
  combo: number;
  effects: CharacterSkillEffects;
  colors?: string[];
}

export interface SkillBoardEffectAnimationCell {
  row: number;
  col: number;
  color: string;
}

export interface SkillBoardEffectAnimation {
  type: 'block_summon' | 'magic_transform';
  cells: SkillBoardEffectAnimationCell[];
}

interface ApplySkillBoardEffectsResult {
  board: Board;
  extraLinesCleared: number;
  gemsFound: number;
  itemsFound: string[];
  comboChainBonus: number;
  animations: SkillBoardEffectAnimation[];
}

type CascadeResult = {
  board: Board;
  extraLinesCleared: number;
  gemsFound: number;
  itemsFound: string[];
};

type MagicTransformCandidate = {
  row: number;
  col: number;
  lineKeys: string[];
};

function blocksLineClear(cell: CellValue): boolean {
  return cell?.type === 'stone' || cell?.lockClears === true;
}

function mergeClearResult(
  result: ApplySkillBoardEffectsResult,
  clearResult: {
    newBoard: Board;
    clearedRows: number[];
    clearedCols: number[];
    gemsFound: number;
    itemsFound: string[];
  },
): ApplySkillBoardEffectsResult {
  return {
    ...result,
    board: clearResult.newBoard,
    extraLinesCleared:
      result.extraLinesCleared +
      clearResult.clearedRows.length +
      clearResult.clearedCols.length,
    gemsFound: result.gemsFound + clearResult.gemsFound,
    itemsFound: [...result.itemsFound, ...clearResult.itemsFound],
  };
}

function applyCascadeClears(board: Board): CascadeResult {
  let nextBoard = board;
  let extraLinesCleared = 0;
  let gemsFound = 0;
  const itemsFound: string[] = [];

  while (true) {
    const cascade = checkAndClearLines(nextBoard);
    const clearedCount = cascade.clearedRows.length + cascade.clearedCols.length;
    if (clearedCount === 0) {
      break;
    }

    nextBoard = cascade.newBoard;
    extraLinesCleared += clearedCount;
    gemsFound += cascade.gemsFound;
    itemsFound.push(...cascade.itemsFound);
  }

  return {
    board: nextBoard,
    extraLinesCleared,
    gemsFound,
    itemsFound,
  };
}

function getPlacedCells(
  piece: Piece,
  row: number,
  col: number,
): Array<{ row: number; col: number }> {
  const cells: Array<{ row: number; col: number }> = [];

  for (let pieceRow = 0; pieceRow < piece.shape.length; pieceRow += 1) {
    for (let pieceCol = 0; pieceCol < piece.shape[pieceRow].length; pieceCol += 1) {
      if (piece.shape[pieceRow][pieceCol] !== 1) {
        continue;
      }

      cells.push({
        row: row + pieceRow,
        col: col + pieceCol,
      });
    }
  }

  return cells;
}

function getDirectionalSummonCells(
  board: Board,
  placedCells: Array<{ row: number; col: number }>,
) {
  const directions = {
    north: new Map<string, { row: number; col: number }>(),
    south: new Map<string, { row: number; col: number }>(),
    west: new Map<string, { row: number; col: number }>(),
    east: new Map<string, { row: number; col: number }>(),
  };

  placedCells.forEach(cell => {
    const candidates = [
      { key: 'north' as const, row: cell.row - 1, col: cell.col },
      { key: 'south' as const, row: cell.row + 1, col: cell.col },
      { key: 'west' as const, row: cell.row, col: cell.col - 1 },
      { key: 'east' as const, row: cell.row, col: cell.col + 1 },
    ];

    candidates.forEach(candidate => {
      if (
        candidate.row < 0 ||
        candidate.row >= ROWS ||
        candidate.col < 0 ||
        candidate.col >= COLS
      ) {
        return;
      }

      if (board[candidate.row][candidate.col] !== null) {
        return;
      }

      directions[candidate.key].set(`${candidate.row}:${candidate.col}`, {
        row: candidate.row,
        col: candidate.col,
      });
    });
  });

  return Object.entries(directions)
    .map(([direction, cells]) => ({
      direction,
      cells: Array.from(cells.values()).sort((left, right) =>
        left.row === right.row ? left.col - right.col : left.row - right.row,
      ),
    }))
    .filter(entry => entry.cells.length > 0);
}

function pickBlockSummonCells(
  board: Board,
  piece: Piece,
  row: number,
  col: number,
  effects: CharacterSkillEffects,
): Array<{ row: number; col: number }> {
  if (
    effects.blockSummonChance <= 0 ||
    effects.blockSummonMaxCells <= 0 ||
    Math.random() >= effects.blockSummonChance
  ) {
    return [];
  }

  const directionalCells = getDirectionalSummonCells(
    board,
    getPlacedCells(piece, row, col),
  );
  if (directionalCells.length === 0) {
    return [];
  }

  const selectedDirection =
    directionalCells[Math.floor(Math.random() * directionalCells.length)];
  if (!selectedDirection) {
    return [];
  }

  const desiredCount =
    effects.blockSummonMaxCells >= 2 && Math.random() < 0.5 ? 2 : 1;

  return selectedDirection.cells.slice(0, desiredCount);
}

function getLineCompletionKeys(
  board: Board,
  row: number,
  col: number,
): string[] {
  if (board[row][col] !== null) {
    return [];
  }

  let rowCanClear = true;
  for (let nextCol = 0; nextCol < COLS; nextCol += 1) {
    if (nextCol === col) {
      continue;
    }
    const cell = board[row][nextCol];
    if (cell === null || blocksLineClear(cell)) {
      rowCanClear = false;
      break;
    }
  }

  let colCanClear = true;
  for (let nextRow = 0; nextRow < ROWS; nextRow += 1) {
    if (nextRow === row) {
      continue;
    }
    const cell = board[nextRow][col];
    if (cell === null || blocksLineClear(cell)) {
      colCanClear = false;
      break;
    }
  }

  const keys: string[] = [];
  if (rowCanClear) {
    keys.push(`row:${row}`);
  }
  if (colCanClear) {
    keys.push(`col:${col}`);
  }
  return keys;
}

function findMagicTransformCandidates(board: Board): MagicTransformCandidate[] {
  const candidates: MagicTransformCandidate[] = [];

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const lineKeys = getLineCompletionKeys(board, row, col);
      if (lineKeys.length === 0) {
        continue;
      }

      candidates.push({ row, col, lineKeys });
    }
  }

  return candidates.sort((left, right) => {
    if (right.lineKeys.length !== left.lineKeys.length) {
      return right.lineKeys.length - left.lineKeys.length;
    }

    return left.row === right.row ? left.col - right.col : left.row - right.row;
  });
}

function pickMagicTransformCells(
  board: Board,
  effects: CharacterSkillEffects,
): Array<{ row: number; col: number }> {
  if (
    effects.magicTransformChance <= 0 ||
    effects.magicTransformCellCount <= 0 ||
    Math.random() >= effects.magicTransformChance
  ) {
    return [];
  }

  const candidates = findMagicTransformCandidates(board);
  if (candidates.length === 0) {
    return [];
  }

  const targetCount = Math.min(
    effects.magicTransformCellCount,
    candidates.length,
  );
  const picked: Array<{ row: number; col: number }> = [];
  const usedLineKeys = new Set<string>();
  const remaining = [...candidates];

  while (picked.length < targetCount && remaining.length > 0) {
    let nextIndex = remaining.findIndex(candidate =>
      candidate.lineKeys.some(lineKey => !usedLineKeys.has(lineKey)),
    );

    if (nextIndex < 0) {
      nextIndex = 0;
    }

    const [selected] = remaining.splice(nextIndex, 1);
    if (!selected) {
      break;
    }

    picked.push({ row: selected.row, col: selected.col });
    selected.lineKeys.forEach(lineKey => usedLineKeys.add(lineKey));
  }

  return picked;
}

function applyFilledCells(
  board: Board,
  cells: Array<{ row: number; col: number }>,
  colors?: string[],
): { board: Board; animationCells: SkillBoardEffectAnimationCell[] } {
  const nextBoard = board.map(boardRow => [...boardRow]);
  const animationCells = cells.map(cell => {
    const color = randomColor(colors);
    nextBoard[cell.row][cell.col] = { color };
    return {
      row: cell.row,
      col: cell.col,
      color,
    };
  });

  return { board: nextBoard, animationCells };
}

export function applySkillBoardEffects({
  board,
  piece,
  row,
  col,
  didClear,
  combo,
  effects,
  colors,
}: ApplySkillBoardEffectsInput): ApplySkillBoardEffectsResult {
  let result: ApplySkillBoardEffectsResult = {
    board,
    extraLinesCleared: 0,
    gemsFound: 0,
    itemsFound: [],
    comboChainBonus: 0,
    animations: [],
  };

  if (
    effects.adjacentLineClearChance > 0 &&
    Math.random() < effects.adjacentLineClearChance
  ) {
    const adjacentRows = [row - 1, row + piece.shape.length].filter(
      nextRow => nextRow >= 0,
    );
    const adjacentCols = [col - 1, col + piece.shape[0].length].filter(
      nextCol => nextCol >= 0,
    );
    result = mergeClearResult(
      result,
      clearLineTargets(result.board, adjacentRows, adjacentCols),
    );
  }

  if (
    didClear &&
    effects.extraLineClearChance > 0 &&
    Math.random() < effects.extraLineClearChance
  ) {
    result = mergeClearResult(result, clearRandomLines(result.board, 1));
  }

  if (
    effects.randomLineClearChance > 0 &&
    combo >= effects.randomLineClearComboThreshold &&
    Math.random() < effects.randomLineClearChance
  ) {
    result = mergeClearResult(result, clearRandomLines(result.board, 1));
  }

  const summonCells = pickBlockSummonCells(result.board, piece, row, col, effects);
  if (summonCells.length > 0) {
    const filled = applyFilledCells(result.board, summonCells, colors);
    const cascade = applyCascadeClears(filled.board);
    result = {
      ...result,
      board: cascade.board,
      extraLinesCleared: result.extraLinesCleared + cascade.extraLinesCleared,
      gemsFound: result.gemsFound + cascade.gemsFound,
      itemsFound: [...result.itemsFound, ...cascade.itemsFound],
      animations: [
        ...result.animations,
        { type: 'block_summon', cells: filled.animationCells },
      ],
    };
  }

  const transformCells = pickMagicTransformCells(result.board, effects);
  if (transformCells.length > 0) {
    const filled = applyFilledCells(result.board, transformCells, colors);
    const cascade = applyCascadeClears(filled.board);
    result = {
      ...result,
      board: cascade.board,
      extraLinesCleared: result.extraLinesCleared + cascade.extraLinesCleared,
      gemsFound: result.gemsFound + cascade.gemsFound,
      itemsFound: [...result.itemsFound, ...cascade.itemsFound],
      comboChainBonus:
        result.comboChainBonus + Math.max(0, transformCells.length - 1),
      animations: [
        ...result.animations,
        { type: 'magic_transform', cells: filled.animationCells },
      ],
    };
  }

  return result;
}
