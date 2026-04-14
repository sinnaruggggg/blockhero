import {
  DEFAULT_VISUAL_REFERENCE_VIEWPORT,
  type VisualViewport,
} from './visualConfig';
import { COLS } from '../constants';
import {
  getGameplayLayoutScale,
  normalizeGameplayViewport,
} from './layoutScale';

const SCREEN_WIDTH = DEFAULT_VISUAL_REFERENCE_VIEWPORT.width;
export const BOARD_PADDING = 8;
export const CELL_GAP = 2;
export const BOARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 388);
export const COMPACT_SCALE = 0.82;
const PIECE_TRAY_HEIGHT = 124;
const PIECE_TRAY_HEIGHT_COMPACT = 108;
export const CELL_SIZE =
  (BOARD_WIDTH - BOARD_PADDING * 2 - CELL_GAP * (COLS - 1)) / COLS;
export const BOARD_REFERENCE_VIEWPORT = DEFAULT_VISUAL_REFERENCE_VIEWPORT;

export function getBoardMetrics(
  viewport:
    | Partial<VisualViewport>
    | number = DEFAULT_VISUAL_REFERENCE_VIEWPORT,
  options?: { small?: boolean; compact?: boolean },
) {
  const resolvedViewport =
    typeof viewport === 'number'
      ? normalizeGameplayViewport({
          width: viewport,
          height: DEFAULT_VISUAL_REFERENCE_VIEWPORT.height,
        })
      : normalizeGameplayViewport(viewport);
  const layoutScale = getGameplayLayoutScale(resolvedViewport);
  const modeScale = options?.small ? 0.4 : options?.compact ? COMPACT_SCALE : 1;
  const combinedScale = layoutScale * modeScale;
  const cellSize = CELL_SIZE * combinedScale;
  const gap = CELL_GAP * combinedScale;
  const padding = BOARD_PADDING * combinedScale;
  const boardSize = cellSize * COLS + gap * (COLS - 1) + padding * 2;

  return {
    scale: combinedScale,
    layoutScale,
    modeScale,
    cellSize,
    gap,
    padding,
    boardSize,
  };
}

export function getPieceTrayHeight(
  viewport?: Partial<VisualViewport> | null,
  compact = false,
) {
  const layoutScale = getGameplayLayoutScale(viewport);
  return Math.max(
    88,
    Math.round(
      (compact ? PIECE_TRAY_HEIGHT_COMPACT : PIECE_TRAY_HEIGHT) * layoutScale,
    ),
  );
}

export function getComboGaugeMetrics(
  viewport?: Partial<VisualViewport> | null,
  compact = false,
) {
  const currentViewport = normalizeGameplayViewport(viewport);
  const widthRatio = compact ? 0.46 : 0.48;
  const minWidth = compact ? 120 : 136;
  const maxWidth = compact ? 172 : 196;

  return {
    top: compact ? 6 : 8,
    width: Math.round(
      Math.max(
        minWidth,
        Math.min(maxWidth, currentViewport.width * widthRatio),
      ),
    ),
    height: compact ? 24 : 27,
  };
}
