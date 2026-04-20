import { getBoardMetrics } from '../components/Board';
import type { Piece } from './engine';
import type { VisualViewport } from './visualConfig';
import {
  resolveBoardScreenMetrics,
  type MeasuredBoardLayout,
} from './boardScreenMetrics';

export interface PiecePlacementEffectCell {
  id: string;
  x: number;
  y: number;
  color: string;
}

export interface BoardEffectTargetCell {
  row: number;
  col: number;
  color?: string;
}

export function buildPiecePlacementEffectCells(
  boardLayout: MeasuredBoardLayout,
  piece: Piece,
  row: number,
  col: number,
  compact = false,
  viewport?: Partial<VisualViewport>,
): PiecePlacementEffectCell[] {
  const baseMetrics = getBoardMetrics(viewport, { compact });
  const metrics = resolveBoardScreenMetrics(baseMetrics, boardLayout);

  return piece.shape.flatMap((shapeRow, rowIndex) =>
    shapeRow.flatMap((occupied, colIndex) => {
      if (!occupied) {
        return [];
      }

      const targetCol = col + colIndex;
      const targetRow = row + rowIndex;
      return [
        {
          id: `${targetRow}-${targetCol}`,
          x:
            boardLayout.x +
            metrics.paddingX +
            targetCol * (metrics.cellWidth + metrics.gapX) +
            metrics.cellWidth / 2,
          y:
            boardLayout.y +
            metrics.paddingY +
            targetRow * (metrics.cellHeight + metrics.gapY) +
            metrics.cellHeight / 2,
          color: piece.color,
        },
      ];
    }),
  );
}

export function buildBoardCellEffectCells(
  boardLayout: MeasuredBoardLayout,
  cells: BoardEffectTargetCell[],
  compact = false,
  viewport?: Partial<VisualViewport>,
): PiecePlacementEffectCell[] {
  const baseMetrics = getBoardMetrics(viewport, { compact });
  const metrics = resolveBoardScreenMetrics(baseMetrics, boardLayout);

  return cells.map(cell => ({
    id: `${cell.row}-${cell.col}`,
    x:
      boardLayout.x +
      metrics.paddingX +
      cell.col * (metrics.cellWidth + metrics.gapX) +
      metrics.cellWidth / 2,
    y:
      boardLayout.y +
      metrics.paddingY +
      cell.row * (metrics.cellHeight + metrics.gapY) +
      metrics.cellHeight / 2,
    color: cell.color ?? '#c084fc',
  }));
}
