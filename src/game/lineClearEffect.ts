import type {Board, CellValue} from './engine';

export interface LineClearEffectCell {
  id: string;
  row: number;
  col: number;
  color: string;
  type?: NonNullable<CellValue>['type'];
  isGem?: boolean;
  isItem?: boolean;
  itemType?: string;
}

export function buildLineClearEffectCells(
  previousBoard: Board,
  nextBoard: Board,
): LineClearEffectCell[] {
  const cells: LineClearEffectCell[] = [];

  for (let row = 0; row < previousBoard.length; row += 1) {
    for (let col = 0; col < previousBoard[row].length; col += 1) {
      const previousCell = previousBoard[row][col];
      const nextCell = nextBoard[row]?.[col] ?? null;
      if (!previousCell || nextCell !== null) {
        continue;
      }

      cells.push({
        id: `${row}-${col}`,
        row,
        col,
        color: previousCell.color,
        type: previousCell.type,
        isGem: previousCell.isGem,
        isItem: previousCell.isItem,
        itemType: previousCell.itemType,
      });
    }
  }

  return cells;
}
