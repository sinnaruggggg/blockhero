import React, {useMemo, useRef} from 'react';
import {
  ImageBackground,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BackImageButton from './BackImageButton';
import Board from './Board';
import BossDisplay from './BossDisplay';
import ComboGaugeOverlay from './ComboGaugeOverlay';
import GameHeader from './GameHeader';
import ItemBar from './ItemBar';
import NextPiecePreview from './NextPiecePreview';
import PieceSelector from './PieceSelector';
import SkillBar from './SkillBar';
import {buildVisualElementStyle} from './VisualElementView';
import {
  buildVisualTintColor,
  getLevelBackgroundOverride,
  getRaidBackgroundOverride,
  getVisualElementRule,
  resolveVisualOffset,
  type VisualConfigManifest,
  type VisualElementFrame,
  type VisualElementId,
  type VisualElementRule,
  type VisualScreenId,
  type VisualViewport,
} from '../game/visualConfig';
import {createBoard, type Piece} from '../game/engine';

const LEVEL_BG = require('../assets/ui/grassland_bg.jpg');

const SAMPLE_ITEMS = {
  hammer: 2,
  bomb: 1,
  refresh: 2,
  addTurns: 0,
  piece_square3: 1,
  piece_rect: 0,
  piece_line5: 1,
  piece_num2: 0,
  piece_diag: 1,
};

const SAMPLE_PIECES: Piece[] = [
  {id: 1001, color: '#22c55e', shape: [[1, 1, 1], [0, 1, 0]]},
  {id: 1002, color: '#f59e0b', shape: [[1], [1], [1], [1]]},
  {id: 1003, color: '#38bdf8', shape: [[1, 1], [1, 1]]},
];

const SAMPLE_NEXT_PIECES: Piece[] = [
  {id: 2001, color: '#fb7185', shape: [[1, 1, 1]]},
  {id: 2002, color: '#a78bfa', shape: [[1, 1], [0, 1]]},
  {id: 2003, color: '#facc15', shape: [[1, 1], [1, 0]]},
];

function buildPreviewBoard() {
  const board = createBoard();
  const blocks = [
    {row: 7, col: 0, color: '#38bdf8'},
    {row: 7, col: 1, color: '#38bdf8'},
    {row: 7, col: 2, color: '#38bdf8'},
    {row: 6, col: 4, color: '#22c55e'},
    {row: 5, col: 4, color: '#22c55e'},
    {row: 6, col: 5, color: '#22c55e'},
    {row: 5, col: 5, color: '#22c55e'},
    {row: 4, col: 1, color: '#f59e0b'},
    {row: 4, col: 2, color: '#f59e0b'},
    {row: 4, col: 3, color: '#f59e0b'},
    {row: 3, col: 6, color: '#fb7185'},
    {row: 2, col: 6, color: '#fb7185'},
  ];

  blocks.forEach(block => {
    board[block.row][block.col] = {color: block.color};
  });
  return board;
}

function buildSmallPreviewBoard() {
  const board = createBoard();
  for (let row = 5; row < 8; row += 1) {
    for (let col = 1; col < 5; col += 1) {
      if ((row + col) % 2 === 0) {
        board[row][col] = {color: '#60a5fa'};
      }
    }
  }
  return board;
}

function EditorFrame({
  label,
  selected,
  elementId,
  viewport,
  displayScale,
  manifest,
  screenId,
  onSelect,
  onMove,
  onMeasure,
  style,
  children,
}: {
  label: string;
  selected: boolean;
  elementId: VisualElementId;
  viewport: VisualViewport;
  displayScale: number;
  manifest: VisualConfigManifest;
  screenId: VisualScreenId;
  onSelect: (elementId: VisualElementId) => void;
  onMove: (elementId: VisualElementId, nextX: number, nextY: number) => void;
  onMeasure?: (
    elementId: VisualElementId,
    payload: {
      frame: VisualElementFrame;
      rule: VisualElementRule;
    },
  ) => void;
  style?: any;
  children: React.ReactNode;
}) {
  const rule = getVisualElementRule(manifest, screenId, elementId);
  const resolvedOffset = resolveVisualOffset(
    rule.offsetX,
    rule.offsetY,
    viewport,
    manifest.referenceViewport,
    rule.safeAreaAware === true,
  );
  const dragOriginRef = useRef({x: rule.offsetX, y: rule.offsetY});

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => selected,
        onMoveShouldSetPanResponder: () => selected,
        onPanResponderGrant: () => {
          dragOriginRef.current = {x: rule.offsetX, y: rule.offsetY};
        },
        onPanResponderMove: (_event, gestureState) => {
          onMove(
            elementId,
            dragOriginRef.current.x + gestureState.dx / Math.max(displayScale, 0.001),
            dragOriginRef.current.y + gestureState.dy / Math.max(displayScale, 0.001),
          );
        },
      }),
    [displayScale, elementId, onMove, rule.offsetX, rule.offsetY, selected],
  );

  if (!rule.visible) {
    return null;
  }

  return (
    <View
      style={[
        style,
        buildVisualElementStyle(rule, viewport, manifest.referenceViewport),
      ]}
      onLayout={event => {
        const layout = event.nativeEvent.layout;
        const scaledWidth = layout.width * rule.scale;
        const scaledHeight = layout.height * rule.scale;
        const scaledX =
          layout.x + resolvedOffset.x - Math.round((scaledWidth - layout.width) / 2);
        const scaledY =
          layout.y + resolvedOffset.y - Math.round((scaledHeight - layout.height) / 2);

        onMeasure?.(elementId, {
          frame: {
            x: Math.round(scaledX),
            y: Math.round(scaledY),
            width: Math.round(scaledWidth),
            height: Math.round(scaledHeight),
          },
          rule,
        });
      }}
      {...(selected ? panResponder.panHandlers : {})}>
      <TouchableOpacity activeOpacity={1} onPress={() => onSelect(elementId)}>
        <View style={styles.frameInner}>
          <View pointerEvents="none">{children}</View>
          <View
            pointerEvents="none"
            style={[styles.outline, selected && styles.outlineSelected]}>
            <Text style={styles.outlineLabel}>{label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function SampleBattleLane() {
  return (
    <View style={styles.levelBattleLane}>
      <View style={styles.unitCard}>
        <Text style={styles.unitName}>기사</Text>
        <View style={styles.hpTrack}>
          <View style={[styles.hpFill, {width: '74%'}]} />
        </View>
        <Text style={styles.hpText}>148 / 200</Text>
      </View>
      <View style={styles.unitCard}>
        <Text style={[styles.unitName, {color: '#f97316'}]}>슬라임 킹</Text>
        <View style={styles.hpTrack}>
          <View style={[styles.hpFill, styles.enemyHpFill, {width: '58%'}]} />
        </View>
        <Text style={styles.hpText}>740 / 1280</Text>
      </View>
    </View>
  );
}

export default function VisualRuntimePreview({
  screenId,
  manifest,
  assetUris,
  selectedElementId,
  previewWorld,
  previewLevelId,
  previewRaidStage,
  viewport,
  displayScale = 1,
  onSelectElement,
  onMoveElement,
  onMeasureElement,
}: {
  screenId: VisualScreenId;
  manifest: VisualConfigManifest;
  assetUris: Record<string, string>;
  selectedElementId: VisualElementId;
  previewWorld: number;
  previewLevelId: number;
  previewRaidStage: number;
  viewport: VisualViewport;
  displayScale?: number;
  onSelectElement: (elementId: VisualElementId) => void;
  onMoveElement: (elementId: VisualElementId, nextOffsetX: number, nextOffsetY: number) => void;
  onMeasureElement?: (
    screenId: VisualScreenId,
    elementId: VisualElementId,
    payload: {
      frame: VisualElementFrame;
      rule: VisualElementRule;
    },
  ) => void;
}) {
  const board = useMemo(() => buildPreviewBoard(), []);
  const enemyBoard = useMemo(() => buildSmallPreviewBoard(), []);
  const levelBackgroundOverride = getLevelBackgroundOverride(
    manifest,
    previewLevelId,
    previewWorld,
  );
  const raidBackgroundOverride = getRaidBackgroundOverride(manifest, previewRaidStage);
  const levelBackgroundSource =
    levelBackgroundOverride?.removeImage === true
      ? null
      : levelBackgroundOverride?.assetKey &&
          assetUris[levelBackgroundOverride.assetKey]
        ? {uri: assetUris[levelBackgroundOverride.assetKey]}
        : LEVEL_BG;
  const raidBackgroundSource =
    raidBackgroundOverride?.removeImage === true
      ? null
      : raidBackgroundOverride?.assetKey &&
          assetUris[raidBackgroundOverride.assetKey]
        ? {uri: assetUris[raidBackgroundOverride.assetKey]}
        : LEVEL_BG;
  const backgroundSource =
    screenId === 'level'
      ? levelBackgroundSource
      : screenId === 'raid'
        ? raidBackgroundSource
        : null;
  const tintColor =
    screenId === 'level' && levelBackgroundOverride
      ? buildVisualTintColor(
          levelBackgroundOverride.tintColor,
          levelBackgroundOverride.tintOpacity,
        )
      : screenId === 'raid' && raidBackgroundOverride
        ? buildVisualTintColor(
            raidBackgroundOverride.tintColor,
            raidBackgroundOverride.tintOpacity,
          )
        : 'transparent';

  const contentPadding = {
    paddingTop: viewport.safeTop + Math.round(viewport.height * 0.05),
    paddingBottom: viewport.safeBottom + Math.round(viewport.height * 0.05),
    paddingHorizontal: Math.max(12, Math.round(viewport.width * 0.035)),
  };

  const comboGaugeLevel = getVisualElementRule(manifest, 'level', 'combo_gauge');
  const comboGaugeEndless = getVisualElementRule(manifest, 'endless', 'combo_gauge');
  const comboGaugeRaid = getVisualElementRule(manifest, 'raid', 'combo_gauge');
  const reportLevelMeasure = useMemo(
    () =>
      (elementId: VisualElementId, payload: {frame: VisualElementFrame; rule: VisualElementRule}) =>
        onMeasureElement?.('level', elementId, payload),
    [onMeasureElement],
  );
  const reportEndlessMeasure = useMemo(
    () =>
      (elementId: VisualElementId, payload: {frame: VisualElementFrame; rule: VisualElementRule}) =>
        onMeasureElement?.('endless', elementId, payload),
    [onMeasureElement],
  );
  const reportBattleMeasure = useMemo(
    () =>
      (elementId: VisualElementId, payload: {frame: VisualElementFrame; rule: VisualElementRule}) =>
        onMeasureElement?.('battle', elementId, payload),
    [onMeasureElement],
  );
  const reportRaidMeasure = useMemo(
    () =>
      (elementId: VisualElementId, payload: {frame: VisualElementFrame; rule: VisualElementRule}) =>
        onMeasureElement?.('raid', elementId, payload),
    [onMeasureElement],
  );

  const renderLevel = () => (
    <View style={[styles.runtimeScreen, contentPadding]}>
      <EditorFrame
        label="상단 헤더"
        selected={selectedElementId === 'header'}
        elementId="header"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="level"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportLevelMeasure}>
        <View style={styles.levelHeader}>
          <BackImageButton onPress={() => undefined} size={40} />
          <Text style={styles.levelTitle}>레벨 모드 1-1</Text>
          <View style={styles.headerSpacer} />
        </View>
      </EditorFrame>

      <EditorFrame
        label="전투 HUD"
        selected={selectedElementId === 'battle_lane'}
        elementId="battle_lane"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="level"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportLevelMeasure}
        style={styles.sectionGap}>
        <SampleBattleLane />
      </EditorFrame>

      <EditorFrame
        label="보드"
        selected={selectedElementId === 'board'}
        elementId="board"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="level"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportLevelMeasure}
        style={[styles.sectionGap, styles.centered]}>
        <View>
          <Board board={board} viewportWidth={viewport.width} />
          {comboGaugeLevel.visible ? (
            <ComboGaugeOverlay
              combo={7}
              comboRemainingMs={5200}
              comboMaxMs={7000}
              style={buildVisualElementStyle(
                comboGaugeLevel,
                viewport,
                manifest.referenceViewport,
              )}
            />
          ) : null}
        </View>
      </EditorFrame>

      <View style={styles.flexFill} />

      <EditorFrame
        label="하단 블록 트레이"
        selected={selectedElementId === 'piece_tray'}
        elementId="piece_tray"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="level"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportLevelMeasure}>
        <PieceSelector
          pieces={SAMPLE_PIECES}
          onDragStart={() => undefined}
          onDragMove={() => undefined}
          onDragEnd={() => undefined}
          onDragCancel={() => undefined}
        />
      </EditorFrame>

      <EditorFrame
        label="아이템 바"
        selected={selectedElementId === 'item_bar'}
        elementId="item_bar"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="level"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportLevelMeasure}
        style={styles.sectionGapSmall}>
        <ItemBar
          items={SAMPLE_ITEMS}
          selectedItem={null}
          onSelectItem={() => undefined}
          showAddTurns={false}
        />
      </EditorFrame>
    </View>
  );

  const renderEndless = () => (
    <View style={[styles.runtimeScreen, contentPadding]}>
      <EditorFrame
        label="상단 헤더"
        selected={selectedElementId === 'header'}
        elementId="header"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="endless"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportEndlessMeasure}>
        <GameHeader
          score={12840}
          combo={6}
          linesCleared={17}
          level="무한 모드 레벨 4"
          goalText="다음 골드: 15,000 / +20골드"
          onBack={() => undefined}
          feverGauge={46}
          feverActive={false}
        />
      </EditorFrame>

      <EditorFrame
        label="상태 바"
        selected={selectedElementId === 'status_bar'}
        elementId="status_bar"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="endless"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportEndlessMeasure}
        style={styles.sectionGap}>
        <View style={styles.statusBar}>
          <Text style={styles.statusBarText}>이번 판 획득 골드: 120</Text>
          <Text style={styles.statusBarSub}>다음: 15,000점</Text>
        </View>
      </EditorFrame>

      <EditorFrame
        label="다음 블록"
        selected={selectedElementId === 'next_preview'}
        elementId="next_preview"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="endless"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportEndlessMeasure}
        style={styles.sectionGapSmall}>
        <NextPiecePreview pieces={SAMPLE_NEXT_PIECES} />
      </EditorFrame>

      <EditorFrame
        label="소환 패널"
        selected={selectedElementId === 'summon_panel'}
        elementId="summon_panel"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="endless"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportEndlessMeasure}
        style={styles.sectionGapSmall}>
        <View style={styles.summonCard}>
          <Text style={styles.summonTitle}>소환수</Text>
          <Text style={styles.summonSub}>번개정령 Lv.3</Text>
          <View style={styles.summonTrack}>
            <View style={[styles.summonFill, {width: '62%'}]} />
          </View>
        </View>
      </EditorFrame>

      <EditorFrame
        label="보드"
        selected={selectedElementId === 'board'}
        elementId="board"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="endless"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportEndlessMeasure}
        style={[styles.sectionGap, styles.centered]}>
        <View>
          <Board board={board} viewportWidth={viewport.width} />
          {comboGaugeEndless.visible ? (
            <ComboGaugeOverlay
              combo={6}
              comboRemainingMs={4100}
              comboMaxMs={7000}
              style={buildVisualElementStyle(
                comboGaugeEndless,
                viewport,
                manifest.referenceViewport,
              )}
            />
          ) : null}
        </View>
      </EditorFrame>

      <View style={styles.flexFill} />

      <EditorFrame
        label="하단 블록 트레이"
        selected={selectedElementId === 'piece_tray'}
        elementId="piece_tray"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="endless"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportEndlessMeasure}>
        <PieceSelector
          pieces={SAMPLE_PIECES}
          onDragStart={() => undefined}
          onDragMove={() => undefined}
          onDragEnd={() => undefined}
          onDragCancel={() => undefined}
        />
      </EditorFrame>

      <EditorFrame
        label="아이템 바"
        selected={selectedElementId === 'item_bar'}
        elementId="item_bar"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="endless"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportEndlessMeasure}
        style={styles.sectionGapSmall}>
        <ItemBar
          items={SAMPLE_ITEMS}
          selectedItem={null}
          onSelectItem={() => undefined}
          showAddTurns={false}
        />
      </EditorFrame>
    </View>
  );

  const renderBattle = () => (
    <View style={[styles.runtimeScreen, contentPadding]}>
      <EditorFrame
        label="뒤로가기"
        selected={selectedElementId === 'back_button'}
        elementId="back_button"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="battle"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportBattleMeasure}>
        <View style={styles.backDock}>
          <BackImageButton onPress={() => undefined} size={42} />
        </View>
      </EditorFrame>

      <EditorFrame
        label="상대 패널"
        selected={selectedElementId === 'opponent_panel'}
        elementId="opponent_panel"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="battle"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportBattleMeasure}
        style={styles.sectionGap}>
        <View style={styles.opponentSection}>
          <Text style={styles.opponentName}>상대 PlayerTwo</Text>
          <Board board={enemyBoard} small viewportWidth={viewport.width} />
        </View>
      </EditorFrame>

      <EditorFrame
        label="공격 바"
        selected={selectedElementId === 'attack_bar'}
        elementId="attack_bar"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="battle"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportBattleMeasure}
        style={styles.sectionGap}>
        <View style={styles.attackBar}>
          <Text style={styles.attackLabel}>공격 포인트 24</Text>
          <View style={styles.attackChipRow}>
            {['약공', '중공', '강공'].map(label => (
              <View key={label} style={styles.attackChip}>
                <Text style={styles.attackChipText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </EditorFrame>

      <EditorFrame
        label="보드"
        selected={selectedElementId === 'board'}
        elementId="board"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="battle"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportBattleMeasure}
        style={[styles.sectionGap, styles.centered]}>
        <Board board={board} compact viewportWidth={viewport.width} />
      </EditorFrame>

      <View style={styles.flexFill} />

      <EditorFrame
        label="하단 블록 트레이"
        selected={selectedElementId === 'piece_tray'}
        elementId="piece_tray"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="battle"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportBattleMeasure}>
        <PieceSelector
          pieces={SAMPLE_PIECES}
          onDragStart={() => undefined}
          onDragMove={() => undefined}
          onDragEnd={() => undefined}
          onDragCancel={() => undefined}
          compact
        />
      </EditorFrame>
    </View>
  );

  const renderRaid = () => (
    <View style={[styles.runtimeScreen, contentPadding]}>
      <EditorFrame
        label="상단 보스 영역"
        selected={selectedElementId === 'top_panel'}
        elementId="top_panel"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="raid"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportRaidMeasure}>
        <BossDisplay
          bossName="킹슬라임"
          bossEmoji="🟢"
          bossColor="#4ade80"
          currentHp={8420}
          maxHp={14000}
          stage={1}
          participants={[
            {rank: 1, nickname: 'Player', totalDamage: 5820},
            {rank: 2, nickname: 'GuildA', totalDamage: 4770},
            {rank: 3, nickname: 'GuildB', totalDamage: 3210},
          ]}
        />
      </EditorFrame>

      <EditorFrame
        label="스킬 바"
        selected={selectedElementId === 'skill_bar'}
        elementId="skill_bar"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="raid"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportRaidMeasure}
        style={styles.sectionGapSmall}>
        <SkillBar
          currentGauge={17}
          charges={{3: 1, 7: 0, 12: 0, 20: 0, 50: 0}}
          activeMultiplier={3}
          skillLevels={{1: 2, 3: 3, 7: 1, 12: 0, 20: 0, 50: 0}}
          onSelectSkill={() => undefined}
          disabled={false}
        />
      </EditorFrame>

      <EditorFrame
        label="정보 바"
        selected={selectedElementId === 'info_bar'}
        elementId="info_bar"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="raid"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportRaidMeasure}
        style={styles.sectionGapSmall}>
        <View style={styles.statusBar}>
          <Text style={styles.statusBarText}>내 누적 대미지 8,420</Text>
          <Text style={styles.statusBarSub}>게이지 17</Text>
        </View>
      </EditorFrame>

      <EditorFrame
        label="보드"
        selected={selectedElementId === 'board'}
        elementId="board"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="raid"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportRaidMeasure}
        style={[styles.sectionGap, styles.centered]}>
        <View>
          <Board board={board} compact viewportWidth={viewport.width} />
          {comboGaugeRaid.visible ? (
            <ComboGaugeOverlay
              combo={9}
              comboRemainingMs={4700}
              comboMaxMs={7000}
              feverActive
              feverRemainingMs={2600}
              feverMaxMs={12000}
              compact
              style={buildVisualElementStyle(
                comboGaugeRaid,
                viewport,
                manifest.referenceViewport,
              )}
            />
          ) : null}
        </View>
      </EditorFrame>

      <View style={styles.flexFill} />

      <EditorFrame
        label="하단 블록 트레이"
        selected={selectedElementId === 'piece_tray'}
        elementId="piece_tray"
        viewport={viewport}
        displayScale={displayScale}
        manifest={manifest}
        screenId="raid"
        onSelect={onSelectElement}
        onMove={onMoveElement}
        onMeasure={reportRaidMeasure}>
        <PieceSelector
          pieces={SAMPLE_PIECES}
          onDragStart={() => undefined}
          onDragMove={() => undefined}
          onDragEnd={() => undefined}
          onDragCancel={() => undefined}
          compact
        />
      </EditorFrame>
    </View>
  );

  const screenContent =
    screenId === 'level'
      ? renderLevel()
      : screenId === 'endless'
        ? renderEndless()
        : screenId === 'battle'
          ? renderBattle()
          : renderRaid();

  return (
    <View style={styles.previewHost}>
      <View
        style={[
          styles.previewFrame,
          {
            width: viewport.width * displayScale,
            height: viewport.height * displayScale,
          },
        ]}>
        <View
          style={[
            styles.scaledCanvas,
            {
              width: viewport.width,
              height: viewport.height,
              transform: [{scale: displayScale}],
            },
          ]}>
          {backgroundSource ? (
            <ImageBackground
              source={backgroundSource}
              resizeMode="cover"
              style={styles.background}>
              <View style={[styles.backgroundTint, {backgroundColor: tintColor}]}>
                {screenContent}
              </View>
            </ImageBackground>
          ) : (
            <View style={styles.background}>{screenContent}</View>
          )}
          <View pointerEvents="none" style={[styles.safeInsetTop, {height: viewport.safeTop}]} />
          <View
            pointerEvents="none"
            style={[styles.safeInsetBottom, {height: viewport.safeBottom}]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  previewHost: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFrame: {
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#7a4a26',
    backgroundColor: '#0f172a',
    shadowColor: '#1f1208',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 10},
    elevation: 8,
  },
  scaledCanvas: {
    alignItems: 'flex-start',
  },
  background: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  backgroundTint: {
    flex: 1,
  },
  runtimeScreen: {
    flex: 1,
  },
  frameInner: {
    position: 'relative',
  },
  outline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(253, 224, 71, 0.28)',
    borderRadius: 14,
  },
  outlineSelected: {
    borderColor: '#f59e0b',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  outlineLabel: {
    position: 'absolute',
    top: -14,
    left: 10,
    backgroundColor: '#7c2d12',
    color: '#fff7ed',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  safeInsetTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  safeInsetBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sectionGap: {marginTop: 12},
  sectionGapSmall: {marginTop: 8},
  centered: {alignSelf: 'center'},
  flexFill: {flex: 1},
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  levelTitle: {
    color: '#fff7ed',
    fontSize: 28,
    fontWeight: '900',
  },
  headerSpacer: {width: 44},
  levelBattleLane: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 8,
  },
  unitCard: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.78)',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.32)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  unitName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  hpTrack: {
    marginTop: 8,
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
  },
  hpFill: {
    height: '100%',
    backgroundColor: '#60a5fa',
    borderRadius: 999,
  },
  enemyHpFill: {backgroundColor: '#f97316'},
  hpText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  statusBar: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(30, 27, 75, 0.72)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusBarText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  statusBarSub: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  summonCard: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(17, 24, 39, 0.82)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  summonTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '900',
  },
  summonSub: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  summonTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    overflow: 'hidden',
  },
  summonFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#38bdf8',
  },
  backDock: {
    paddingLeft: 6,
  },
  opponentSection: {
    alignItems: 'center',
  },
  opponentName: {
    color: '#fff7ed',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
  },
  attackBar: {
    marginHorizontal: 8,
    backgroundColor: 'rgba(30, 27, 75, 0.74)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  attackLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },
  attackChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  attackChip: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#4c1d95',
    paddingVertical: 8,
    alignItems: 'center',
  },
  attackChipText: {
    color: '#fef3c7',
    fontSize: 12,
    fontWeight: '900',
  },
});
