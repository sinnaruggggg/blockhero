import {BOARD_PADDING, CELL_GAP, CELL_SIZE, COMPACT_SCALE} from '../components/Board';
import type {Piece} from './engine';

export interface PiecePlacementEffectCell {
  id: string;
  x: number;
  y: number;
  color: string;
}

export function buildPiecePlacementEffectCells(
  boardLayout: {x: number; y: number},
  piece: Piece,
  row: number,
  col: number,
  compact = false,
): PiecePlacementEffectCell[] {
  const scale = compact ? COMPACT_SCALE : 1;
  const cellSize = CELL_SIZE * scale;
  const gap = CELL_GAP * scale;
  const padding = BOARD_PADDING * scale;

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
          x: boardLayout.x + padding + targetCol * (cellSize + gap) + cellSize / 2,
          y: boardLayout.y + padding + targetRow * (cellSize + gap) + cellSize / 2,
          color: piece.color,
        },
      ];
    }),
  );
}
