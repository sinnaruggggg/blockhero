export interface MeasuredBoardLayout {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface BaseBoardMetrics {
  cellSize: number;
  gap: number;
  padding: number;
  boardSize: number;
}

export interface BoardScreenMetrics {
  cellWidth: number;
  cellHeight: number;
  gapX: number;
  gapY: number;
  paddingX: number;
  paddingY: number;
  scaleX: number;
  scaleY: number;
  boardWidth: number;
  boardHeight: number;
}

export function resolveBoardScreenMetrics(
  baseMetrics: BaseBoardMetrics,
  boardLayout?: MeasuredBoardLayout | null,
): BoardScreenMetrics {
  const boardWidth =
    boardLayout?.width && boardLayout.width > 0
      ? boardLayout.width
      : baseMetrics.boardSize;
  const boardHeight =
    boardLayout?.height && boardLayout.height > 0
      ? boardLayout.height
      : baseMetrics.boardSize;
  const scaleX = boardWidth / Math.max(1, baseMetrics.boardSize);
  const scaleY = boardHeight / Math.max(1, baseMetrics.boardSize);

  return {
    cellWidth: baseMetrics.cellSize * scaleX,
    cellHeight: baseMetrics.cellSize * scaleY,
    gapX: baseMetrics.gap * scaleX,
    gapY: baseMetrics.gap * scaleY,
    paddingX: baseMetrics.padding * scaleX,
    paddingY: baseMetrics.padding * scaleY,
    scaleX,
    scaleY,
    boardWidth,
    boardHeight,
  };
}
