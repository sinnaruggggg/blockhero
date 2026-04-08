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
import ComboGaugeOverlay from './ComboGaugeOverlay';
import GameHeader from './GameHeader';
import ItemBar from './ItemBar';
import NextPiecePreview from './NextPiecePreview';
import PieceSelector from './PieceSelector';
import SkillBar from './SkillBar';
import BossDisplay from './BossDisplay';
import {
  buildVisualTintColor,
  getLevelBackgroundOverride,
  getRaidBackgroundOverride,
  getVisualElementRule,
  type VisualConfigManifest,
  type VisualElementId,
  type VisualScreenId,
} from '../game/visualConfig';
import {buildVisualElementStyle} from './VisualElementView';
import {createBoard, type Piece} from '../game/engine';

const PREVIEW_CANVAS_WIDTH = 392;
const PREVIEW_CANVAS_HEIGHT = 780;
const PREVIEW_SCALE = 0.78;
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

function StudioElementFrame({
  label,
  elementId,
  selected,
  rule,
  baseStyle,
  onSelect,
  onMove,
  children,
}: {
  label: string;
  elementId: VisualElementId;
  selected: boolean;
  rule: ReturnType<typeof getVisualElementRule>;
  baseStyle: any;
  onSelect: (elementId: VisualElementId) => void;
  onMove: (elementId: VisualElementId, dx: number, dy: number) => void;
  children: React.ReactNode;
}) {
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
            dragOriginRef.current.x + gestureState.dx / PREVIEW_SCALE,
            dragOriginRef.current.y + gestureState.dy / PREVIEW_SCALE,
          );
        },
      }),
    [elementId, onMove, rule.offsetX, rule.offsetY, selected],
  );

  if (!rule.visible) {
    return null;
  }

  return (
    <View
      style={[baseStyle, buildVisualElementStyle(rule)]}
      {...(selected ? panResponder.panHandlers : {})}>
      <TouchableOpacity activeOpacity={1} onPress={() => onSelect(elementId)}>
        <View style={styles.frameInner}>
          {children}
          <View
            pointerEvents="none"
            style={[
              styles.elementOutline,
              selected && styles.elementOutlineSelected,
            ]}>
            <Text style={styles.elementLabel}>{label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default function VisualStudioPreview({
  screenId,
  manifest,
  assetUris,
  selectedElementId,
  previewWorld,
  previewLevelId,
  previewRaidStage,
  onSelectElement,
  onMoveElement,
}: {
  screenId: VisualScreenId;
  manifest: VisualConfigManifest;
  assetUris: Record<string, string>;
  selectedElementId: VisualElementId;
  previewWorld: number;
  previewLevelId: number;
  previewRaidStage: number;
  onSelectElement: (elementId: VisualElementId) => void;
  onMoveElement: (elementId: VisualElementId, nextOffsetX: number, nextOffsetY: number) => void;
}) {
  const board = useMemo(() => buildPreviewBoard(), []);
  const enemyBoard = useMemo(() => buildSmallPreviewBoard(), []);
  const levelBackgroundOverride = getLevelBackgroundOverride(
    manifest,
    previewLevelId,
    previewWorld,
  );
  const raidBackgroundOverride = getRaidBackgroundOverride(manifest, previewRaidStage);

  const backgroundSource =
    screenId === 'level'
      ? levelBackgroundOverride?.removeImage
        ? null
        : levelBackgroundOverride?.assetKey && assetUris[levelBackgroundOverride.assetKey]
          ? {uri: assetUris[levelBackgroundOverride.assetKey]}
          : LEVEL_BG
      : screenId === 'raid'
        ? raidBackgroundOverride?.removeImage
          ? null
          : raidBackgroundOverride?.assetKey && assetUris[raidBackgroundOverride.assetKey]
            ? {uri: assetUris[raidBackgroundOverride.assetKey]}
            : LEVEL_BG
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

  const renderLevelPreview = () => {
    const comboRule = getVisualElementRule(manifest, 'level', 'combo_gauge');

    return (
      <>
        <StudioElementFrame
          label="Header"
          elementId="header"
          selected={selectedElementId === 'header'}
          rule={getVisualElementRule(manifest, 'level', 'header')}
          baseStyle={styles.levelHeaderSlot}
          onSelect={onSelectElement}
          onMove={onMoveElement}>
          <View style={styles.levelHeader}>
            <BackImageButton onPress={() => undefined} size={34} />
            <Text style={styles.levelTitle}>레벨 모드 1-1</Text>
            <View style={styles.headerSpacer} />
          </View>
        </StudioElementFrame>

        <StudioElementFrame
          label="Battle HUD"
          elementId="battle_lane"
          selected={selectedElementId === 'battle_lane'}
          rule={getVisualElementRule(manifest, 'level', 'battle_lane')}
          baseStyle={styles.levelBattleSlot}
          onSelect={onSelectElement}
          onMove={onMoveElement}>
          <View style={styles.levelBattleLane}>
            <View style={styles.sampleUnitCard}>
              <Text style={styles.sampleUnitName}>기사</Text>
              <View style={styles.sampleHpTrack}>
                <View style={[styles.sampleHpFill, {width: '74%'}]} />
              </View>
              <Text style={styles.sampleHpText}>148 / 200</Text>
            </View>
            <View style={styles.sampleUnitCard}>
              <Text style={[styles.sampleUnitName, {color: '#f97316'}]}>슬라임 킹</Text>
              <View style={styles.sampleHpTrack}>
                <View
                  style={[
                    styles.sampleHpFill,
                    styles.sampleEnemyHpFill,
                    {width: '58%'},
                  ]}
                />
              </View>
              <Text style={styles.sampleHpText}>740 / 1280</Text>
            </View>
          </View>
        </StudioElementFrame>

        <StudioElementFrame
          label="Board"
          elementId="board"
          selected={selectedElementId === 'board'}
          rule={getVisualElementRule(manifest, 'level', 'board')}
          baseStyle={styles.levelBoardSlot}
          onSelect={onSelectElement}
          onMove={onMoveElement}>
          <View>
            <Board board={board} />
            {comboRule.visible ? (
              <ComboGaugeOverlay
                combo={7}
                comboRemainingMs={5200}
                comboMaxMs={7000}
                style={buildVisualElementStyle(comboRule)}
              />
            ) : null}
          </View>
        </StudioElementFrame>

        <StudioElementFrame
          label="Piece Tray"
          elementId="piece_tray"
          selected={selectedElementId === 'piece_tray'}
          rule={getVisualElementRule(manifest, 'level', 'piece_tray')}
          baseStyle={styles.levelTraySlot}
          onSelect={onSelectElement}
          onMove={onMoveElement}>
          <PieceSelector
            pieces={SAMPLE_PIECES}
            onDragStart={() => undefined}
            onDragMove={() => undefined}
            onDragEnd={() => undefined}
            onDragCancel={() => undefined}
          />
        </StudioElementFrame>

        <StudioElementFrame
          label="Item Bar"
          elementId="item_bar"
          selected={selectedElementId === 'item_bar'}
          rule={getVisualElementRule(manifest, 'level', 'item_bar')}
          baseStyle={styles.levelItemSlot}
          onSelect={onSelectElement}
          onMove={onMoveElement}>
          <ItemBar
            items={SAMPLE_ITEMS}
            selectedItem={null}
            onSelectItem={() => undefined}
            showAddTurns={false}
          />
        </StudioElementFrame>
      </>
    );
  };

  const renderEndlessPreview = () => {
    const comboRule = getVisualElementRule(manifest, 'endless', 'combo_gauge');

    return (
      <>
        <StudioElementFrame
          label="Header"
          elementId="header"
          selected={selectedElementId === 'header'}
          rule={getVisualElementRule(manifest, 'endless', 'header')}
          baseStyle={styles.endlessHeaderSlot}
          onSelect={onSelectElement}
          onMove={onMoveElement}>
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
        </StudioElementFrame>

        <StudioElementFrame
          label="Status"
          elementId="status_bar"
          selected={selectedElementId === 'status_bar'}
          rule={getVisualElementRule(manifest, 'endless', 'status_bar')}
          baseStyle={styles.endlessStatusSlot}
          onSelect={onSelectElement}
          onMove={onMoveElement}>
          <View style={styles.endlessStatusBar}>
            <Text style={styles.endlessStatusText}>이번 판 획득 골드: 14</Text>
            <Text style={styles.endlessStatusSub}>다음: 15,000점</Text>
          </View>
        </StudioElementFrame>

        <StudioElementFrame
          label="Summon"
          elementId="summon_panel"
          selected={selectedElementId === 'summon_panel'}
          rule={getVisualElementRule(manifest, 'endless', 'summon_panel')}
          baseStyle={styles.endlessSummonSlot}
          onSelect={onSelectElement}
          onMove={onMoveElement}>
          <View style={styles.previewSummonCard}>
            <Text style={styles.previewSummonTitle}>소환수</Text>
            <Text style={styles.previewSummonMeta}>공격 28 / 지속 18초</Text>
            <View style={styles.previewSummonBarTrack}>
              <View style={[styles.previewSummonBarFill, {width: '62%'}]} />
            </View>
          </View>
        </StudioElementFrame>

        <StudioElementFrame
          label="Next Preview"
          elementId="next_preview"
          selected={selectedElementId === 'next_preview'}
          rule={getVisualElementRule(manifest, 'endless', 'next_preview')}
          baseStyle={styles.endlessNextSlot}
          onSelect={onSelectElement}
          onMove={onMoveElement}>
          <NextPiecePreview pieces={SAMPLE_NEXT_PIECES} variant="side" />
        </StudioElementFrame>

        <StudioElementFrame
          label="Board"
          elementId="board"
          selected={selectedElementId === 'board'}
          rule={getVisualElementRule(manifest, 'endless', 'board')}
          baseStyle={styles.endlessBoardSlot}
          onSelect={onSelectElement}
          onMove={onMoveElement}>
          <View>
            <Board board={board} />
            {comboRule.visible ? (
              <ComboGaugeOverlay
                combo={6}
                comboRemainingMs={4200}
                comboMaxMs={7000}
                style={buildVisualElementStyle(comboRule)}
              />
            ) : null}
          </View>
        </StudioElementFrame>

        <StudioElementFrame
          label="Piece Tray"
          elementId="piece_tray"
          selected={selectedElementId === 'piece_tray'}
          rule={getVisualElementRule(manifest, 'endless', 'piece_tray')}
          baseStyle={styles.endlessTraySlot}
          onSelect={onSelectElement}
          onMove={onMoveElement}>
          <PieceSelector
            pieces={SAMPLE_PIECES}
            onDragStart={() => undefined}
            onDragMove={() => undefined}
            onDragEnd={() => undefined}
            onDragCancel={() => undefined}
          />
        </StudioElementFrame>

        <StudioElementFrame
          label="Item Bar"
          elementId="item_bar"
          selected={selectedElementId === 'item_bar'}
          rule={getVisualElementRule(manifest, 'endless', 'item_bar')}
          baseStyle={styles.endlessItemSlot}
          onSelect={onSelectElement}
          onMove={onMoveElement}>
          <ItemBar
            items={SAMPLE_ITEMS}
            selectedItem={null}
            onSelectItem={() => undefined}
            showAddTurns={false}
          />
        </StudioElementFrame>
      </>
    );
  };

  const renderBattlePreview = () => (
    <>
      <StudioElementFrame
        label="Back Button"
        elementId="back_button"
        selected={selectedElementId === 'back_button'}
        rule={getVisualElementRule(manifest, 'battle', 'back_button')}
        baseStyle={styles.battleBackSlot}
        onSelect={onSelectElement}
        onMove={onMoveElement}>
        <BackImageButton onPress={() => undefined} size={34} />
      </StudioElementFrame>

      <StudioElementFrame
        label="Opponent"
        elementId="opponent_panel"
        selected={selectedElementId === 'opponent_panel'}
        rule={getVisualElementRule(manifest, 'battle', 'opponent_panel')}
        baseStyle={styles.battleOpponentSlot}
        onSelect={onSelectElement}
        onMove={onMoveElement}>
        <View style={styles.battleOpponentCard}>
          <Text style={styles.battleOpponentTitle}>상대 RogueMaster</Text>
          <Board board={enemyBoard} small />
        </View>
      </StudioElementFrame>

      <StudioElementFrame
        label="Attack Bar"
        elementId="attack_bar"
        selected={selectedElementId === 'attack_bar'}
        rule={getVisualElementRule(manifest, 'battle', 'attack_bar')}
        baseStyle={styles.battleAttackSlot}
        onSelect={onSelectElement}
        onMove={onMoveElement}>
        <View style={styles.battleAttackBar}>
          <Text style={styles.battleAttackLabel}>공격 라인 4</Text>
          <View style={styles.battleAttackButtons}>
            {[1, 2, 3].map(lines => (
              <View key={lines} style={styles.battleAttackChip}>
                <Text style={styles.battleAttackChipText}>{lines}줄</Text>
              </View>
            ))}
          </View>
        </View>
      </StudioElementFrame>

      <StudioElementFrame
        label="Board"
        elementId="board"
        selected={selectedElementId === 'board'}
        rule={getVisualElementRule(manifest, 'battle', 'board')}
        baseStyle={styles.battleBoardSlot}
        onSelect={onSelectElement}
        onMove={onMoveElement}>
        <Board board={board} compact />
      </StudioElementFrame>

      <StudioElementFrame
        label="Piece Tray"
        elementId="piece_tray"
        selected={selectedElementId === 'piece_tray'}
        rule={getVisualElementRule(manifest, 'battle', 'piece_tray')}
        baseStyle={styles.battleTraySlot}
        onSelect={onSelectElement}
        onMove={onMoveElement}>
        <PieceSelector
          pieces={SAMPLE_PIECES}
          onDragStart={() => undefined}
          onDragMove={() => undefined}
          onDragEnd={() => undefined}
          onDragCancel={() => undefined}
        />
      </StudioElementFrame>
    </>
  );

  const renderRaidPreview = () => {
    const comboRule = getVisualElementRule(manifest, 'raid', 'combo_gauge');

    return (
      <>
        <StudioElementFrame
          label="Top Panel"
          elementId="top_panel"
          selected={selectedElementId === 'top_panel'}
          rule={getVisualElementRule(manifest, 'raid', 'top_panel')}
          baseStyle={styles.raidTopSlot}
          onSelect={onSelectElement}
          onMove={onMoveElement}>
          <BossDisplay
            bossName="킹슬라임"
            bossEmoji="🐉"
            bossColor="#22d3ee"
            currentHp={84000}
            maxHp={120000}
            stage={previewRaidStage}
            participants={[
              {rank: 1, nickname: 'Alpha', totalDamage: 18300},
              {rank: 2, nickname: 'Beta', totalDamage: 14210},
              {rank: 3, nickname: 'You', totalDamage: 12980},
            ]}
            damageHits={[]}
            bossPose="idle"
          />
        </StudioElementFrame>

        <StudioElementFrame
          label="Skill Bar"
          elementId="skill_bar"
          selected={selectedElementId === 'skill_bar'}
          rule={getVisualElementRule(manifest, 'raid', 'skill_bar')}
          baseStyle={styles.raidSkillSlot}
          onSelect={onSelectElement}
          onMove={onMoveElement}>
          <SkillBar
            currentGauge={42}
            charges={{3: 1, 7: 0, 12: 0, 20: 0, 50: 0}}
            activeMultiplier={1}
            skillLevels={{1: 2, 3: 1}}
            disabled={false}
            onSelectSkill={() => undefined}
          />
        </StudioElementFrame>

        <StudioElementFrame
          label="Info Bar"
          elementId="info_bar"
          selected={selectedElementId === 'info_bar'}
          rule={getVisualElementRule(manifest, 'raid', 'info_bar')}
          baseStyle={styles.raidInfoSlot}
          onSelect={onSelectElement}
          onMove={onMoveElement}>
          <View style={styles.raidInfoBar}>
            <Text style={styles.raidInfoText}>내 누적 대미지 12,980</Text>
            <Text style={styles.raidInfoText}>스킬 게이지 42</Text>
          </View>
        </StudioElementFrame>

        <StudioElementFrame
          label="Board"
          elementId="board"
          selected={selectedElementId === 'board'}
          rule={getVisualElementRule(manifest, 'raid', 'board')}
          baseStyle={styles.raidBoardSlot}
          onSelect={onSelectElement}
          onMove={onMoveElement}>
          <View>
            <Board board={board} compact />
            {comboRule.visible ? (
              <ComboGaugeOverlay
                combo={5}
                comboRemainingMs={3600}
                comboMaxMs={7000}
                feverActive
                feverRemainingMs={5800}
                feverMaxMs={10000}
                compact
                style={buildVisualElementStyle(comboRule)}
              />
            ) : null}
          </View>
        </StudioElementFrame>

        <StudioElementFrame
          label="Piece Tray"
          elementId="piece_tray"
          selected={selectedElementId === 'piece_tray'}
          rule={getVisualElementRule(manifest, 'raid', 'piece_tray')}
          baseStyle={styles.raidTraySlot}
          onSelect={onSelectElement}
          onMove={onMoveElement}>
          <PieceSelector
            pieces={SAMPLE_PIECES}
            onDragStart={() => undefined}
            onDragMove={() => undefined}
            onDragEnd={() => undefined}
            onDragCancel={() => undefined}
            compact
          />
        </StudioElementFrame>
      </>
    );
  };

  const screenContent =
    screenId === 'level'
      ? renderLevelPreview()
      : screenId === 'endless'
        ? renderEndlessPreview()
        : screenId === 'battle'
          ? renderBattlePreview()
          : renderRaidPreview();

  const canvas = (
    <View style={styles.canvas}>
      {screenContent}
    </View>
  );

  return (
    <View style={styles.previewHost}>
      <View
        style={[
          styles.previewFrame,
          {
            width: PREVIEW_CANVAS_WIDTH * PREVIEW_SCALE,
            height: PREVIEW_CANVAS_HEIGHT * PREVIEW_SCALE,
          },
        ]}>
        <View
          style={[
            styles.scaledCanvas,
            {
              width: PREVIEW_CANVAS_WIDTH,
              height: PREVIEW_CANVAS_HEIGHT,
              transform: [{scale: PREVIEW_SCALE}],
            },
          ]}>
          {backgroundSource ? (
            <ImageBackground
              source={backgroundSource}
              resizeMode="cover"
              style={styles.background}>
              <View style={[styles.backgroundTint, {backgroundColor: tintColor}]}>
                {canvas}
              </View>
            </ImageBackground>
          ) : (
            <View style={styles.background}>
              {tintColor !== 'transparent' ? (
                <View style={[styles.backgroundTint, {backgroundColor: tintColor}]}>
                  {canvas}
                </View>
              ) : (
                canvas
              )}
            </View>
          )}
        </View>
      </View>
      <Text style={styles.previewCaption}>
        선택한 요소를 드래그하면 오프셋이 즉시 반영됩니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  previewHost: {
    alignItems: 'center',
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
  canvas: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'rgba(8, 11, 24, 0.35)',
  },
  frameInner: {
    position: 'relative',
  },
  elementOutline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(253, 224, 71, 0.28)',
    borderRadius: 14,
  },
  elementOutlineSelected: {
    borderColor: '#f59e0b',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  elementLabel: {
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
  previewCaption: {
    marginTop: 10,
    color: '#f2d9b0',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  levelHeaderSlot: {
    position: 'absolute',
    top: 20,
    left: 12,
    right: 12,
  },
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
  headerSpacer: {
    width: 44,
  },
  levelBattleSlot: {
    position: 'absolute',
    top: 92,
    left: 20,
    right: 20,
  },
  levelBattleLane: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 12,
  },
  sampleUnitCard: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.78)',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sampleUnitName: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  sampleHpTrack: {
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    overflow: 'hidden',
  },
  sampleHpFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
  sampleEnemyHpFill: {
    backgroundColor: '#f97316',
  },
  sampleHpText: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  levelBoardSlot: {
    position: 'absolute',
    top: 214,
    left: 14,
    right: 14,
    alignItems: 'center',
  },
  levelTraySlot: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 118,
  },
  levelItemSlot: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 28,
  },
  endlessHeaderSlot: {
    position: 'absolute',
    top: 12,
    left: 6,
    right: 6,
  },
  endlessStatusSlot: {
    position: 'absolute',
    top: 154,
    left: 16,
    right: 16,
  },
  endlessStatusBar: {
    backgroundColor: 'rgba(21, 27, 52, 0.84)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  endlessStatusText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
  },
  endlessStatusSub: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  endlessSummonSlot: {
    position: 'absolute',
    top: 214,
    left: 16,
    right: 16,
  },
  previewSummonCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  previewSummonTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
  },
  previewSummonMeta: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  previewSummonBarTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    marginTop: 10,
  },
  previewSummonBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#22d3ee',
  },
  endlessNextSlot: {
    position: 'absolute',
    top: 302,
    right: 8,
  },
  endlessBoardSlot: {
    position: 'absolute',
    top: 322,
    left: 14,
    right: 14,
    alignItems: 'center',
  },
  endlessTraySlot: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 118,
  },
  endlessItemSlot: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 28,
  },
  battleBackSlot: {
    position: 'absolute',
    top: 18,
    left: 18,
  },
  battleOpponentSlot: {
    position: 'absolute',
    top: 84,
    left: 16,
    right: 16,
  },
  battleOpponentCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 10,
  },
  battleOpponentTitle: {
    color: '#fff7ed',
    fontSize: 18,
    fontWeight: '900',
  },
  battleAttackSlot: {
    position: 'absolute',
    top: 252,
    left: 16,
    right: 16,
  },
  battleAttackBar: {
    backgroundColor: 'rgba(30, 27, 75, 0.82)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  battleAttackLabel: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  battleAttackButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  battleAttackChip: {
    flex: 1,
    backgroundColor: '#4338ca',
    borderRadius: 12,
    paddingVertical: 8,
  },
  battleAttackChipText: {
    color: '#fff7ed',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  battleBoardSlot: {
    position: 'absolute',
    top: 356,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  battleTraySlot: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 44,
  },
  raidTopSlot: {
    position: 'absolute',
    top: 12,
    left: 8,
    right: 8,
  },
  raidSkillSlot: {
    position: 'absolute',
    top: 286,
    left: 12,
    right: 12,
  },
  raidInfoSlot: {
    position: 'absolute',
    top: 350,
    left: 14,
    right: 14,
  },
  raidInfoBar: {
    backgroundColor: 'rgba(30, 27, 75, 0.82)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  raidInfoText: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  raidBoardSlot: {
    position: 'absolute',
    top: 426,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  raidTraySlot: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 40,
  },
});
