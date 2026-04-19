import { scaleGameplayUnit } from './layoutScale';
import {
  getBoardMetrics,
  getComboGaugeMetrics,
  getPieceTrayHeight,
} from './gameplayMetrics';
import type {
  VisualElementId,
  VisualScreenId,
  VisualViewport,
} from './visualConfig';

export type VisualRuntimeRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type VisualRuntimeLayout = Partial<
  Record<VisualElementId, VisualRuntimeRect>
>;

function clampSize(value: number, minimum = 0) {
  return Math.max(minimum, Math.round(value));
}

function makeRect(
  left: number,
  top: number,
  width: number,
  height: number,
): VisualRuntimeRect {
  return {
    left: clampSize(left),
    top: clampSize(top),
    width: clampSize(width),
    height: clampSize(height),
  };
}

function getCenteredBoardRect(
  boardRect: VisualRuntimeRect,
  boardSize: number,
): VisualRuntimeRect {
  return makeRect(
    boardRect.left + Math.max(0, (boardRect.width - boardSize) / 2),
    boardRect.top + Math.max(0, (boardRect.height - boardSize) / 2),
    boardSize,
    boardSize,
  );
}

function getContentBounds(viewport: VisualViewport) {
  const gutter = scaleGameplayUnit(46, viewport, 16);
  return {
    left: 0,
    top: viewport.safeTop + gutter,
    width: viewport.width,
    height: Math.max(
      0,
      viewport.height - viewport.safeTop - viewport.safeBottom - gutter * 2,
    ),
    bottom: viewport.height - viewport.safeBottom - gutter,
  };
}

function getHeaderHeight(screenId: VisualScreenId) {
  switch (screenId) {
    case 'level':
      return 48;
    case 'endless':
      return 126;
    default:
      return 0;
  }
}

function getLevelBattleLaneHeight() {
  return 130;
}

function getStatusBarHeight() {
  return 34;
}

function getNextPreviewHeight() {
  return 80;
}

function getSummonPanelHeight() {
  return 0;
}

function getItemBarHeight() {
  return 66;
}

function getBattleOpponentPanelHeight(viewport: VisualViewport) {
  return clampSize(getBoardMetrics(viewport, { small: true }).boardSize + 22);
}

function getBattleAttackBarHeight() {
  return 44;
}

function getRaidTopPanelHeight(screenId: VisualScreenId) {
  return screenId === 'raidNormal' ? 186 : 176;
}

function getRaidSkillBarHeight() {
  return 38;
}

function getRaidInfoBarHeight() {
  return 20;
}

function buildLevelLayout(viewport: VisualViewport): VisualRuntimeLayout {
  const content = getContentBounds(viewport);
  const headerHeight = getHeaderHeight('level');
  const battleLaneHeight = getLevelBattleLaneHeight();
  const itemBarHeight = getItemBarHeight();
  const pieceTrayHeight = getPieceTrayHeight(viewport, false);
  const bottomRowHeight = pieceTrayHeight + 2;
  const boardTop = content.top + headerHeight + battleLaneHeight;
  const pieceTrayTop = content.bottom - itemBarHeight - bottomRowHeight;
  const boardHeight = Math.max(0, pieceTrayTop - boardTop);
  const trayWidth = Math.max(0, viewport.width - 24);
  const gauge = getComboGaugeMetrics(viewport, false);
  const boardMetrics = getBoardMetrics(viewport);
  const boardStageRect = makeRect(0, boardTop, viewport.width, boardHeight);
  const boardRect = getCenteredBoardRect(
    boardStageRect,
    boardMetrics.boardSize,
  );
  const skillEffectRect = boardRect;

  return {
    header: makeRect(0, content.top, viewport.width, headerHeight),
    battle_lane: makeRect(
      0,
      content.top + headerHeight,
      viewport.width,
      battleLaneHeight,
    ),
    board: boardRect,
    skill_effect: skillEffectRect,
    piece_tray: makeRect(12, pieceTrayTop, trayWidth, pieceTrayHeight),
    item_bar: makeRect(
      0,
      content.bottom - itemBarHeight,
      viewport.width,
      itemBarHeight,
    ),
    combo_gauge: makeRect(
      (viewport.width - gauge.width) / 2,
      boardRect.top + gauge.top,
      gauge.width,
      gauge.height,
    ),
  };
}

function buildEndlessLayout(viewport: VisualViewport): VisualRuntimeLayout {
  const content = getContentBounds(viewport);
  const headerHeight = getHeaderHeight('endless');
  const statusBarHeight = getStatusBarHeight();
  const nextPreviewHeight = getNextPreviewHeight();
  const summonPanelHeight = getSummonPanelHeight();
  const itemBarHeight = getItemBarHeight();
  const pieceTrayHeight = getPieceTrayHeight(viewport, true);
  const boardTop =
    content.top +
    headerHeight +
    statusBarHeight +
    nextPreviewHeight +
    summonPanelHeight;
  const pieceTrayTop = content.bottom - itemBarHeight - pieceTrayHeight;
  const boardHeight = Math.max(0, pieceTrayTop - boardTop);
  const boardMetrics = getBoardMetrics(viewport, { compact: true });
  const gauge = getComboGaugeMetrics(viewport, true);
  const boardStageRect = makeRect(0, boardTop, viewport.width, boardHeight);
  const boardRect = getCenteredBoardRect(
    boardStageRect,
    boardMetrics.boardSize,
  );
  const skillEffectRect = boardRect;

  return {
    header: makeRect(0, content.top, viewport.width, headerHeight),
    status_bar: makeRect(
      0,
      content.top + headerHeight,
      viewport.width,
      statusBarHeight,
    ),
    next_preview: makeRect(
      0,
      content.top + headerHeight + statusBarHeight,
      viewport.width,
      nextPreviewHeight,
    ),
    summon_panel: makeRect(
      0,
      content.top + headerHeight + statusBarHeight + nextPreviewHeight,
      viewport.width,
      summonPanelHeight,
    ),
    board: boardRect,
    skill_effect: skillEffectRect,
    piece_tray: makeRect(0, pieceTrayTop, viewport.width, pieceTrayHeight),
    item_bar: makeRect(
      0,
      content.bottom - itemBarHeight,
      viewport.width,
      itemBarHeight,
    ),
    combo_gauge: makeRect(
      (viewport.width - gauge.width) / 2,
      boardRect.top + gauge.top,
      gauge.width,
      gauge.height,
    ),
  };
}

function buildBattleLayout(viewport: VisualViewport): VisualRuntimeLayout {
  const content = getContentBounds(viewport);
  const backSize = 42;
  const opponentPanelHeight = getBattleOpponentPanelHeight(viewport);
  const attackBarHeight = getBattleAttackBarHeight();
  const pieceTrayHeight = getPieceTrayHeight(viewport, true);
  const boardTop = content.top + opponentPanelHeight + attackBarHeight;
  const pieceTrayTop = content.bottom - pieceTrayHeight;
  const boardStageRect = makeRect(
    0,
    boardTop,
    viewport.width,
    Math.max(0, pieceTrayTop - boardTop),
  );
  const boardMetrics = getBoardMetrics(viewport, { compact: true });
  const boardRect = getCenteredBoardRect(
    boardStageRect,
    boardMetrics.boardSize,
  );
  const skillEffectRect = boardRect;

  return {
    back_button: makeRect(12, content.top + 10, backSize, backSize),
    opponent_panel: makeRect(
      0,
      content.top,
      viewport.width,
      opponentPanelHeight,
    ),
    attack_bar: makeRect(
      0,
      content.top + opponentPanelHeight,
      viewport.width,
      attackBarHeight,
    ),
    board: boardRect,
    skill_effect: skillEffectRect,
    piece_tray: makeRect(0, pieceTrayTop, viewport.width, pieceTrayHeight),
  };
}

function buildRaidLayout(
  screenId: Extract<VisualScreenId, 'raidNormal' | 'raidBoss'>,
  viewport: VisualViewport,
): VisualRuntimeLayout {
  const content = getContentBounds(viewport);
  const topPanelHeight = getRaidTopPanelHeight(screenId);
  const skillBarHeight = getRaidSkillBarHeight();
  const infoBarHeight = getRaidInfoBarHeight();
  const pieceTrayHeight = getPieceTrayHeight(viewport, true);
  const boardMetrics = getBoardMetrics(viewport, { compact: true });
  const boardTop =
    content.top + topPanelHeight + skillBarHeight + infoBarHeight;
  const pieceTrayTop = content.bottom - pieceTrayHeight;
  const boardHeight = Math.max(
    boardMetrics.boardSize + 18,
    pieceTrayTop - boardTop,
  );
  const gauge = getComboGaugeMetrics(viewport, true);
  const boardStageRect = makeRect(0, boardTop, viewport.width, boardHeight);
  const boardRect = getCenteredBoardRect(
    boardStageRect,
    boardMetrics.boardSize,
  );
  const skillEffectRect = boardRect;

  return {
    top_panel: makeRect(0, content.top, viewport.width, topPanelHeight),
    skill_bar: makeRect(
      0,
      content.top + topPanelHeight,
      viewport.width,
      skillBarHeight,
    ),
    info_bar: makeRect(
      0,
      content.top + topPanelHeight + skillBarHeight,
      viewport.width,
      infoBarHeight,
    ),
    board: boardRect,
    skill_effect: skillEffectRect,
    piece_tray: makeRect(0, pieceTrayTop, viewport.width, pieceTrayHeight),
    combo_gauge: makeRect(
      (viewport.width - gauge.width) / 2,
      boardRect.top + gauge.top,
      gauge.width,
      gauge.height,
    ),
  };
}

export function getVisualRuntimeLayout(
  screenId: VisualScreenId,
  viewport: VisualViewport,
): VisualRuntimeLayout {
  switch (screenId) {
    case 'level':
      return buildLevelLayout(viewport);
    case 'endless':
      return buildEndlessLayout(viewport);
    case 'battle':
      return buildBattleLayout(viewport);
    case 'raidNormal':
    case 'raidBoss':
      return buildRaidLayout(screenId, viewport);
    default:
      return {};
  }
}
