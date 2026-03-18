import {useState, useCallback, useRef} from 'react';
import {Board, Piece, canPlacePiece, PieceShape} from './engine';
import {screenToBoard, CELL_SIZE, CELL_GAP, COMPACT_SCALE} from '../components/Board';
import {ROWS, COLS} from '../constants';

export interface PreviewCell {
  row: number;
  col: number;
  color: string;
}

export interface DragDropState {
  previewCells: PreviewCell[];
  invalidPreview: boolean;
  draggingIndex: number | null;
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

  const lastPreviewPos = useRef<{row: number; col: number} | null>(null);

  // Calculate the top-left board position for centering piece on finger
  const getPieceOrigin = useCallback(
    (shape: PieceShape, boardRow: number, boardCol: number) => {
      const r = boardRow - Math.floor(shape.length / 2);
      const c = boardCol - Math.floor(shape[0].length / 2);
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
  }, []);

  const onDragMove = useCallback(
    (index: number, absX: number, absY: number) => {
      if (!boardLayout) return;
      const piece = pieces[index];
      if (!piece) return;

      const scale = compact ? COMPACT_SCALE : 1;
      const cellStep = (CELL_SIZE * scale + CELL_GAP * scale);
      const offsetY = absY - yOffsetCells * cellStep;
      const boardPos = screenToBoard(absX, offsetY, boardLayout.x, boardLayout.y, compact);
      if (!boardPos) {
        // Finger is outside the board
        if (lastPreviewPos.current !== null) {
          setPreviewCells([]);
          setInvalidPreview(false);
          lastPreviewPos.current = null;
        }
        return;
      }

      // Skip redundant updates for same cell
      if (
        lastPreviewPos.current &&
        lastPreviewPos.current.row === boardPos.row &&
        lastPreviewPos.current.col === boardPos.col
      ) {
        return;
      }
      lastPreviewPos.current = boardPos;

      const {r, c} = getPieceOrigin(piece.shape, boardPos.row, boardPos.col);
      const cells = getPreviewCells(piece.shape, piece.color, r, c);
      const valid = canPlacePiece(board, piece.shape, r, c);

      setPreviewCells(cells);
      setInvalidPreview(!valid);
    },
    [board, pieces, boardLayout, compact, yOffsetCells, getPieceOrigin, getPreviewCells],
  );

  const onDragEnd = useCallback(
    (index: number, absX: number, absY: number) => {
      setDraggingIndex(null);
      setPreviewCells([]);
      setInvalidPreview(false);
      lastPreviewPos.current = null;

      if (!boardLayout) return;
      const piece = pieces[index];
      if (!piece) return;

      const scale = compact ? COMPACT_SCALE : 1;
      const cellStep = (CELL_SIZE * scale + CELL_GAP * scale);
      const offsetY = absY - yOffsetCells * cellStep;
      const boardPos = screenToBoard(absX, offsetY, boardLayout.x, boardLayout.y, compact);
      if (!boardPos) return;

      const {r, c} = getPieceOrigin(piece.shape, boardPos.row, boardPos.col);
      if (canPlacePiece(board, piece.shape, r, c)) {
        onPlace(index, r, c);
      }
    },
    [board, pieces, boardLayout, compact, yOffsetCells, getPieceOrigin, onPlace],
  );

  const onDragCancel = useCallback((_index: number) => {
    setDraggingIndex(null);
    setPreviewCells([]);
    setInvalidPreview(false);
    lastPreviewPos.current = null;
  }, []);

  return {
    previewCells,
    invalidPreview,
    draggingIndex,
    onDragStart,
    onDragMove,
    onDragEnd,
    onDragCancel,
  };
}
