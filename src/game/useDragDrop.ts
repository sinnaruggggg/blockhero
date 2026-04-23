import { useState, useCallback, useRef } from 'react';
import {
  Board,
  Piece,
  canPlacePiece,
  getPieceRewardMarkerCell,
  PieceShape,
  predictClearLines,
} from './engine';
import { ROWS, COLS } from '../constants';
import { getBoardMetrics } from '../components/Board';
import type { VisualViewport } from './visualConfig';
import {
  resolveBoardScreenMetrics,
  type MeasuredBoardLayout,
} from './boardScreenMetrics';

export interface PreviewCell {
  row: number;
  col: number;
  color: string;
  isGem?: boolean;
  isItem?: boolean;
  itemType?: string;
}

export interface ClearGuideCell {
  row: number;
  col: number;
}

export interface DragDropState {
  previewCells: PreviewCell[];
  invalidPreview: boolean;
  draggingIndex: number | null;
  clearGuideCells: ClearGuideCell[];
}

// Magnet snap: keep correction close so preview does not jump to distant cells.
const SNAP_SEARCH_RADIUS = 1;
const SNAP_MAX_DISTANCE_CELLS = 0.62;
// Sticky threshold: once snapped, must move this many cells away to re-snap elsewhere
const STICKY_THRESHOLD = 0.28;

function findNearestValid(
  board: Board,
  shape: PieceShape,
  centerR: number,
  centerC: number,
  rawR: number = centerR,
  rawC: number = centerC,
): { r: number; c: number } | null {
  // Check exact position first
  if (canPlacePiece(board, shape, centerR, centerC)) {
    return { r: centerR, c: centerC };
  }
  // Search expanding radius
  for (let radius = 1; radius <= SNAP_SEARCH_RADIUS; radius++) {
    let bestDist = Infinity;
    let bestPos: { r: number; c: number } | null = null;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.abs(dr) < radius && Math.abs(dc) < radius) continue;
        const nr = centerR + dr;
        const nc = centerC + dc;
        if (canPlacePiece(board, shape, nr, nc)) {
          const rowDistance = Math.abs(nr - rawR);
          const colDistance = Math.abs(nc - rawC);
          if (Math.max(rowDistance, colDistance) > SNAP_MAX_DISTANCE_CELLS) {
            continue;
          }
          const dist = rowDistance * rowDistance + colDistance * colDistance;
          if (dist < bestDist) {
            bestDist = dist;
            bestPos = { r: nr, c: nc };
          }
        }
      }
    }
    if (bestPos) return bestPos;
  }
  return null;
}

// Get floating-point board row/col for precise centering
// Cell centers map to integer values (cell 0 center → 0.0, cell 3 center → 3.0)
function screenToBoardFloat(
  x: number,
  y: number,
  boardX: number,
  boardY: number,
  metrics: {
    cellWidth: number;
    cellHeight: number;
    gapX: number;
    gapY: number;
    paddingX: number;
    paddingY: number;
  },
): { row: number; col: number } {
  const localX = x - boardX - metrics.paddingX;
  const localY = y - boardY - metrics.paddingY;
  const cellStepX = metrics.cellWidth + metrics.gapX;
  const cellStepY = metrics.cellHeight + metrics.gapY;
  return {
    row: (localY - metrics.cellHeight / 2) / cellStepY,
    col: (localX - metrics.cellWidth / 2) / cellStepX,
  };
}

export function useDragDrop(
  board: Board,
  pieces: (Piece | null)[],
  boardLayout: MeasuredBoardLayout | null,
  onPlace: (pieceIndex: number, row: number, col: number) => void,
  compact?: boolean,
  yOffsetCells: number = 0,
  viewport?: Partial<VisualViewport>,
) {
  const [previewCells, setPreviewCells] = useState<PreviewCell[]>([]);
  const [invalidPreview, setInvalidPreview] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [clearGuideCells, setClearGuideCells] = useState<ClearGuideCell[]>([]);

  const lastPreviewPos = useRef<{ row: number; col: number } | null>(null);
  const lastRawPos = useRef<{ r: number; c: number } | null>(null);

  // Calculate the top-left board position for centering piece on finger
  // Uses actual filled cell bounds, not shape array dimensions
  // Accepts floating-point board coordinates and rounds the final origin
  const getPieceOrigin = useCallback(
    (shape: PieceShape, boardRow: number, boardCol: number) => {
      let minR = shape.length,
        maxR = 0,
        minC = shape[0].length,
        maxC = 0;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] === 1) {
            if (r < minR) minR = r;
            if (r > maxR) maxR = r;
            if (c < minC) minC = c;
            if (c > maxC) maxC = c;
          }
        }
      }
      const centerR = (minR + maxR) / 2;
      const centerC = (minC + maxC) / 2;
      // Round the final origin (not the center) for precise centering
      const rawR = boardRow - centerR;
      const rawC = boardCol - centerC;
      const r = Math.round(rawR);
      const c = Math.round(rawC);
      return { r, c, rawR, rawC };
    },
    [],
  );

  const getPreviewCells = useCallback(
    (
      piece: Piece,
      originR: number,
      originC: number,
    ): PreviewCell[] => {
      const cells: PreviewCell[] = [];
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
            cells.push({
              row: originR + r,
              col: originC + c,
              color: piece.color,
              isGem: isRewardMarker ? piece.isGem : undefined,
              isItem: isRewardMarker ? piece.isItem : undefined,
              itemType: isRewardMarker ? piece.itemType : undefined,
            });
          }
        }
      }
      return cells;
    },
    [],
  );

  const onDragStart = useCallback((index: number) => {
    setDraggingIndex(index);
    lastPreviewPos.current = null;
    lastRawPos.current = null;
  }, []);

  const onDragMove = useCallback(
    (index: number, absX: number, absY: number) => {
      if (!boardLayout) return;
      const piece = pieces[index];
      if (!piece) return;

      const baseMetrics = getBoardMetrics(viewport, { compact });
      const screenMetrics = resolveBoardScreenMetrics(baseMetrics, boardLayout);
      const cellStepY = screenMetrics.cellHeight + screenMetrics.gapY;
      const offsetY = absY - yOffsetCells * cellStepY;

      // Use floating-point board coordinates for precise centering
      const floatPos = screenToBoardFloat(
        absX,
        offsetY,
        boardLayout.x,
        boardLayout.y,
        screenMetrics,
      );

      const { r, c, rawR, rawC } = getPieceOrigin(
        piece.shape,
        floatPos.row,
        floatPos.col,
      );

      // Find nearest valid placement (magnet snap)
      const snapResult = findNearestValid(
        board,
        piece.shape,
        r,
        c,
        rawR,
        rawC,
      );

      if (snapResult) {
        // Sticky snap: if already snapped somewhere, only move if raw position
        // has moved far enough from current snap position
        if (lastPreviewPos.current && lastRawPos.current) {
          const dR = Math.abs(rawR - lastRawPos.current.r);
          const dC = Math.abs(rawC - lastRawPos.current.c);
          const moved = Math.max(dR, dC);
          // If haven't moved enough AND current snap is still valid, keep it
          if (
            moved < STICKY_THRESHOLD &&
            canPlacePiece(
              board,
              piece.shape,
              lastPreviewPos.current.row,
              lastPreviewPos.current.col,
            )
          ) {
            return;
          }
        }

        // Skip redundant updates for same snapped cell
        if (
          lastPreviewPos.current &&
          lastPreviewPos.current.row === snapResult.r &&
          lastPreviewPos.current.col === snapResult.c
        ) {
          lastRawPos.current = { r: rawR, c: rawC };
          return;
        }
        lastPreviewPos.current = { row: snapResult.r, col: snapResult.c };
        lastRawPos.current = { r: rawR, c: rawC };
        const cells = getPreviewCells(
          piece,
          snapResult.r,
          snapResult.c,
        );
        setPreviewCells(cells);
        setInvalidPreview(false);

        // Predict clear lines
        const { rows: clearRows, cols: clearCols } = predictClearLines(
          board,
          piece.shape,
          snapResult.r,
          snapResult.c,
        );
        const guide: ClearGuideCell[] = [];
        for (const row of clearRows) {
          for (let c = 0; c < COLS; c++) {
            guide.push({ row, col: c });
          }
        }
        for (const col of clearCols) {
          for (let r = 0; r < ROWS; r++) {
            if (!clearRows.includes(r)) {
              guide.push({ row: r, col });
            }
          }
        }
        setClearGuideCells(guide);
      } else {
        // No valid placement nearby - hide preview
        if (lastPreviewPos.current !== null) {
          setPreviewCells([]);
          setInvalidPreview(false);
          setClearGuideCells([]);
          lastPreviewPos.current = null;
          lastRawPos.current = null;
        }
      }
    },
    [
      board,
      pieces,
      boardLayout,
      compact,
      yOffsetCells,
      viewport,
      getPieceOrigin,
      getPreviewCells,
    ],
  );

  const onDragEnd = useCallback(
    (index: number, absX: number, absY: number) => {
      // If we have a current snap position, use it directly (sticky)
      const currentSnap = lastPreviewPos.current;

      setDraggingIndex(null);
      setPreviewCells([]);
      setInvalidPreview(false);
      setClearGuideCells([]);
      lastPreviewPos.current = null;
      lastRawPos.current = null;

      if (!boardLayout) return;
      const piece = pieces[index];
      if (!piece) return;

      // Use the sticky snap position if available and still valid
      if (
        currentSnap &&
        canPlacePiece(board, piece.shape, currentSnap.row, currentSnap.col)
      ) {
        onPlace(index, currentSnap.row, currentSnap.col);
        return;
      }

      const baseMetrics = getBoardMetrics(viewport, { compact });
      const screenMetrics = resolveBoardScreenMetrics(baseMetrics, boardLayout);
      const cellStepY = screenMetrics.cellHeight + screenMetrics.gapY;
      const offsetY = absY - yOffsetCells * cellStepY;

      // Use floating-point board coordinates for precise centering
      const floatPos = screenToBoardFloat(
        absX,
        offsetY,
        boardLayout.x,
        boardLayout.y,
        screenMetrics,
      );
      const { r, c, rawR, rawC } = getPieceOrigin(
        piece.shape,
        floatPos.row,
        floatPos.col,
      );

      const snapResult = findNearestValid(
        board,
        piece.shape,
        r,
        c,
        rawR,
        rawC,
      );
      if (snapResult) {
        onPlace(index, snapResult.r, snapResult.c);
      }
    },
    [
      board,
      pieces,
      boardLayout,
      compact,
      yOffsetCells,
      viewport,
      getPieceOrigin,
      onPlace,
    ],
  );

  const onDragCancel = useCallback((_index: number) => {
    setDraggingIndex(null);
    setPreviewCells([]);
    setInvalidPreview(false);
    setClearGuideCells([]);
    lastPreviewPos.current = null;
    lastRawPos.current = null;
  }, []);

  return {
    previewCells,
    invalidPreview,
    draggingIndex,
    clearGuideCells,
    onDragStart,
    onDragMove,
    onDragEnd,
    onDragCancel,
  };
}
