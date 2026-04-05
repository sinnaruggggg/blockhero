import {useState, useCallback, useRef} from 'react';
import {Board, Piece, canPlacePiece, PieceShape, predictClearLines} from './engine';
import {ROWS, COLS} from '../constants';
import {CELL_SIZE, CELL_GAP, BOARD_PADDING, COMPACT_SCALE} from '../components/Board';

export interface PreviewCell {
  row: number;
  col: number;
  color: string;
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

// Magnet snap: search nearby cells for a valid placement
const SNAP_RADIUS = 1;
// Sticky threshold: once snapped, must move this many cells away to re-snap elsewhere
const STICKY_THRESHOLD = 0.7;

function findNearestValid(
  board: Board,
  shape: PieceShape,
  centerR: number,
  centerC: number,
): {r: number; c: number} | null {
  // Check exact position first
  if (canPlacePiece(board, shape, centerR, centerC)) {
    return {r: centerR, c: centerC};
  }
  // Search expanding radius
  for (let radius = 1; radius <= SNAP_RADIUS; radius++) {
    let bestDist = Infinity;
    let bestPos: {r: number; c: number} | null = null;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.abs(dr) < radius && Math.abs(dc) < radius) continue;
        const nr = centerR + dr;
        const nc = centerC + dc;
        if (canPlacePiece(board, shape, nr, nc)) {
          const dist = dr * dr + dc * dc;
          if (dist < bestDist) {
            bestDist = dist;
            bestPos = {r: nr, c: nc};
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
  compact?: boolean,
): {row: number; col: number} {
  const scale = compact ? COMPACT_SCALE : 1;
  const cs = CELL_SIZE * scale;
  const cg = CELL_GAP * scale;
  const bp = BOARD_PADDING * scale;
  const localX = x - boardX - bp;
  const localY = y - boardY - bp;
  const cellStep = cs + cg;
  return {
    row: (localY - cs / 2) / cellStep,
    col: (localX - cs / 2) / cellStep,
  };
}

export function useDragDrop(
  board: Board,
  pieces: (Piece | null)[],
  boardLayout: {x: number; y: number} | null,
  onPlace: (pieceIndex: number, row: number, col: number) => void,
  compact?: boolean,
  yOffsetCells: number = 0,
) {
  const [previewCells, setPreviewCells] = useState<PreviewCell[]>([]);
  const [invalidPreview, setInvalidPreview] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [clearGuideCells, setClearGuideCells] = useState<ClearGuideCell[]>([]);

  const lastPreviewPos = useRef<{row: number; col: number} | null>(null);
  const lastRawPos = useRef<{r: number; c: number} | null>(null);

  // Calculate the top-left board position for centering piece on finger
  // Uses actual filled cell bounds, not shape array dimensions
  // Accepts floating-point board coordinates and rounds the final origin
  const getPieceOrigin = useCallback(
    (shape: PieceShape, boardRow: number, boardCol: number) => {
      let minR = shape.length, maxR = 0, minC = shape[0].length, maxC = 0;
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
      const r = Math.round(boardRow - centerR);
      const c = Math.round(boardCol - centerC);
      return {r, c};
    },
    [],
  );

  const getPreviewCells = useCallback(
    (shape: PieceShape, color: string, originR: number, originC: number): PreviewCell[] => {
      const cells: PreviewCell[] = [];
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] === 1) {
            cells.push({row: originR + r, col: originC + c, color});
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

      const scale = compact ? COMPACT_SCALE : 1;
      const cellStep = (CELL_SIZE * scale + CELL_GAP * scale);
      const offsetY = absY - yOffsetCells * cellStep;

      // Use floating-point board coordinates for precise centering
      const floatPos = screenToBoardFloat(absX, offsetY, boardLayout.x, boardLayout.y, compact);

      const {r, c} = getPieceOrigin(piece.shape, floatPos.row, floatPos.col);

      // Find nearest valid placement (magnet snap)
      const snapResult = findNearestValid(board, piece.shape, r, c);

      if (snapResult) {
        // Sticky snap: if already snapped somewhere, only move if raw position
        // has moved far enough from current snap position
        if (lastPreviewPos.current && lastRawPos.current) {
          const dR = Math.abs(r - lastRawPos.current.r);
          const dC = Math.abs(c - lastRawPos.current.c);
          const moved = Math.max(dR, dC);
          // If haven't moved enough AND current snap is still valid, keep it
          if (
            moved < STICKY_THRESHOLD &&
            canPlacePiece(board, piece.shape, lastPreviewPos.current.row, lastPreviewPos.current.col)
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
          lastRawPos.current = {r, c};
          return;
        }
        lastPreviewPos.current = {row: snapResult.r, col: snapResult.c};
        lastRawPos.current = {r, c};
        const cells = getPreviewCells(piece.shape, piece.color, snapResult.r, snapResult.c);
        setPreviewCells(cells);
        setInvalidPreview(false);

        // Predict clear lines
        const {rows: clearRows, cols: clearCols} = predictClearLines(board, piece.shape, snapResult.r, snapResult.c);
        const guide: ClearGuideCell[] = [];
        for (const row of clearRows) {
          for (let c = 0; c < COLS; c++) {
            guide.push({row, col: c});
          }
        }
        for (const col of clearCols) {
          for (let r = 0; r < ROWS; r++) {
            if (!clearRows.includes(r)) {
              guide.push({row: r, col});
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
        }
      }
    },
    [board, pieces, boardLayout, compact, yOffsetCells, getPieceOrigin, getPreviewCells],
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
      if (currentSnap && canPlacePiece(board, piece.shape, currentSnap.row, currentSnap.col)) {
        onPlace(index, currentSnap.row, currentSnap.col);
        return;
      }

      const scale = compact ? COMPACT_SCALE : 1;
      const cellStep = (CELL_SIZE * scale + CELL_GAP * scale);
      const offsetY = absY - yOffsetCells * cellStep;

      // Use floating-point board coordinates for precise centering
      const floatPos = screenToBoardFloat(absX, offsetY, boardLayout.x, boardLayout.y, compact);
      const {r, c} = getPieceOrigin(piece.shape, floatPos.row, floatPos.col);

      const snapResult = findNearestValid(board, piece.shape, r, c);
      if (snapResult) {
        onPlace(index, snapResult.r, snapResult.c);
      }
    },
    [board, pieces, boardLayout, compact, yOffsetCells, getPieceOrigin, onPlace],
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
