import { getBoardMetrics } from '../components/Board';
import { getPieceRewardMarkerCell, type Piece } from './engine';
import type { VisualViewport } from './visualConfig';
import {
  resolveBoardScreenMetrics,
  type MeasuredBoardLayout,
} from './boardScreenMetrics';

export interface PiecePlacementEffectCell {
  id: string;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isGem?: boolean;
  isItem?: boolean;
  itemType?: string;
}

export interface BoardEffectTargetCell {
  row: number;
  col: number;
  color?: string;
}

export function buildPiecePlacementEffectCells(
  _boardLayout: MeasuredBoardLayout,
  piece: Piece,
  row: number,
  col: number,
  compact = false,
  viewport?: Partial<VisualViewport>,
): PiecePlacementEffectCell[] {
  // Placement VFX is rendered as an absolute child of the Board surface.
  // Use the same local board metrics that Board.tsx uses for its cells, and
  // do not reuse measureInWindow dimensions here. The measured screen size can
  // include visual-editor transforms, which would double-scale this overlay.
  const metrics = getBoardMetrics(viewport, { compact });
  const rewardMarker =
    piece.isGem || piece.isItem ? getPieceRewardMarkerCell(piece.shape) : null;

  return piece.shape.flatMap((shapeRow, rowIndex) =>
    shapeRow.flatMap((occupied, colIndex) => {
      if (!occupied) {
        return [];
      }

      const targetCol = col + colIndex;
      const targetRow = row + rowIndex;
      const isRewardMarker =
        rewardMarker !== null &&
        rewardMarker.row === rowIndex &&
        rewardMarker.col === colIndex;
      return [
        {
          id: `${targetRow}-${targetCol}`,
          row: targetRow,
          col: targetCol,
          x:
            metrics.padding +
            targetCol * (metrics.cellSize + metrics.gap) +
            metrics.cellSize / 2,
          y:
            metrics.padding +
            targetRow * (metrics.cellSize + metrics.gap) +
            metrics.cellSize / 2,
          width: metrics.cellSize,
          height: metrics.cellSize,
          color: piece.color,
          isGem: isRewardMarker ? piece.isGem : undefined,
          isItem: isRewardMarker ? piece.isItem : undefined,
          itemType: isRewardMarker ? piece.itemType : undefined,
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
    row: cell.row,
    col: cell.col,
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
    width: metrics.cellWidth,
    height: metrics.cellHeight,
    color: cell.color ?? '#c084fc',
  }));
}
