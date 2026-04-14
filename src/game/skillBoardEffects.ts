import type { CharacterSkillEffects } from './characterSkillEffects';
import {
  checkAndClearLines,
  clearLineTargets,
  clearRandomLines,
  fillRandomEmptyCells,
  type Board,
  type Piece,
} from './engine';

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

interface ApplySkillBoardEffectsResult {
  board: Board;
  extraLinesCleared: number;
  gemsFound: number;
  itemsFound: string[];
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
    board: clearResult.newBoard,
    extraLinesCleared:
      result.extraLinesCleared +
      clearResult.clearedRows.length +
      clearResult.clearedCols.length,
    gemsFound: result.gemsFound + clearResult.gemsFound,
    itemsFound: [...result.itemsFound, ...clearResult.itemsFound],
  };
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

  if (
    effects.fillerCellChance > 0 &&
    effects.fillerCellCount > 0 &&
    Math.random() < effects.fillerCellChance
  ) {
    result.board = fillRandomEmptyCells(
      result.board,
      effects.fillerCellCount,
      colors,
    );

    while (true) {
      const cascade = checkAndClearLines(result.board);
      const clearedCount =
        cascade.clearedRows.length + cascade.clearedCols.length;
      if (clearedCount === 0) {
        break;
      }
      result = mergeClearResult(result, cascade);
    }
  }

  return result;
}
