import React, { useRef, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { Piece, getPieceRewardMarkerCell } from '../game/engine';
import { getBoardMetrics } from './Board';
import { getGameplayLayoutScale } from '../game/layoutScale';
import {
  DEFAULT_GAMEPLAY_DRAG_TUNING,
  type GameplayDragTuning,
  type VisualViewport,
} from '../game/visualConfig';
import SpecialBlockBadge from './SpecialBlockBadge';

const BLOCK_SIZE = 18;
const COMPACT_BLOCK_SIZE = 16;
const BEVEL = 2;
const TRAY_SLOT_SIZE = 108;
const TRAY_SLOT_SIZE_COMPACT = 96;

// Voxel helpers
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.min(255, r + amount)},${Math.min(
    255,
    g + amount,
  )},${Math.min(255, b + amount)})`;
}

function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.max(0, r - amount)},${Math.max(0, g - amount)},${Math.max(
    0,
    b - amount,
  )})`;
}

function VoxelBlock({
  color,
  size,
  isGem = false,
  isItem = false,
  itemType,
}: {
  color: string;
  size: number;
  isGem?: boolean;
  isItem?: boolean;
  itemType?: string;
}) {
  return (
    <View style={{ width: size, height: size, margin: 1 }}>
      {/* Shadow edge */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 3,
          backgroundColor: darken(color, 70),
        }}
      />
      {/* Highlight edge */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: BEVEL,
          bottom: BEVEL,
          borderRadius: 3,
          backgroundColor: lighten(color, 60),
        }}
      />
      {/* Face */}
      <View
        style={{
          position: 'absolute',
          top: BEVEL,
          left: BEVEL,
          right: BEVEL,
          bottom: BEVEL,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
      {/* Gloss */}
      <View
        style={{
          position: 'absolute',
          top: BEVEL + 1,
          left: BEVEL + 1,
          width: Math.floor((size - BEVEL * 2) * 0.4),
          height: Math.floor((size - BEVEL * 2) * 0.25),
          borderRadius: 1,
          backgroundColor: 'rgba(255,255,255,0.3)',
        }}
      />
      <SpecialBlockBadge
        isGem={isGem}
        isItem={isItem}
        itemType={itemType}
        size={size}
      />
    </View>
  );
}

interface DraggablePieceProps {
  piece: Piece | null;
  onDragStart: () => void;
  onDragMove: (absoluteX: number, absoluteY: number) => void;
  onDragEnd: (absoluteX: number, absoluteY: number) => void;
  onDragCancel: () => void;
  compact?: boolean;
  boardCompact?: boolean;
  boardScaleY?: number;
  viewport?: Partial<VisualViewport>;
  dragTuning?: Partial<GameplayDragTuning> | null;
}

export default function DraggablePiece({
  piece,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  compact = false,
  boardCompact = false,
  boardScaleY = 1,
  viewport,
  dragTuning,
}: DraggablePieceProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const dragCenterOffsetRef = useRef({ x: 0, y: 0 });
  const dragOriginRef = useRef({ x: 0, y: 0, active: false });
  const layoutScale = getGameplayLayoutScale(viewport);
  const boardMetrics = getBoardMetrics(viewport, { compact: boardCompact });
  const blockSize = Math.max(
    12,
    Math.round((compact ? COMPACT_BLOCK_SIZE : BLOCK_SIZE) * layoutScale),
  );
  const liftOffsetCells = Math.max(
    1,
    Math.min(
      4,
      Number.isFinite(Number(dragTuning?.liftOffsetCells))
        ? Number(dragTuning?.liftOffsetCells)
        : DEFAULT_GAMEPLAY_DRAG_TUNING.liftOffsetCells,
    ),
  );
  const dragOffsetY = -Math.round(
    (boardMetrics.cellSize + boardMetrics.gap) * liftOffsetCells * boardScaleY,
  );
  const centerOffsetXCells = Math.max(
    -1.5,
    Math.min(
      1.5,
      Number.isFinite(Number(dragTuning?.centerOffsetXCells))
        ? Number(dragTuning?.centerOffsetXCells)
        : DEFAULT_GAMEPLAY_DRAG_TUNING.centerOffsetXCells,
    ),
  );
  const centerOffsetYCells = Math.max(
    -1.5,
    Math.min(
      1.5,
      Number.isFinite(Number(dragTuning?.centerOffsetYCells))
        ? Number(dragTuning?.centerOffsetYCells)
        : DEFAULT_GAMEPLAY_DRAG_TUNING.centerOffsetYCells,
    ),
  );
  const dragDistanceScaleX = Math.max(
    0.75,
    Math.min(
      1.5,
      Number.isFinite(Number(dragTuning?.dragDistanceScaleX))
        ? Number(dragTuning?.dragDistanceScaleX)
        : DEFAULT_GAMEPLAY_DRAG_TUNING.dragDistanceScaleX,
    ),
  );
  const dragDistanceScaleY = Math.max(
    0.75,
    Math.min(
      1.5,
      Number.isFinite(Number(dragTuning?.dragDistanceScaleY))
        ? Number(dragTuning?.dragDistanceScaleY)
        : DEFAULT_GAMEPLAY_DRAG_TUNING.dragDistanceScaleY,
    ),
  );
  const centerOffsetX = Math.round(
    (boardMetrics.cellSize + boardMetrics.gap) * centerOffsetXCells,
  );
  const centerOffsetY = Math.round(
    (boardMetrics.cellSize + boardMetrics.gap) *
      centerOffsetYCells *
      boardScaleY,
  );
  const traySlotSize = Math.max(
    72,
    Math.round(
      (compact ? TRAY_SLOT_SIZE_COMPACT : TRAY_SLOT_SIZE) * layoutScale,
    ),
  );
  const rewardMarker =
    piece && (piece.isGem || piece.isItem)
      ? getPieceRewardMarkerCell(piece.shape)
      : null;

  const callbacksRef = useRef({
    onDragStart,
    onDragMove,
    onDragEnd,
    onDragCancel,
  });
  const pieceRef = useRef(piece);
  useEffect(() => {
    callbacksRef.current = { onDragStart, onDragMove, onDragEnd, onDragCancel };
    pieceRef.current = piece;
  });

  const getLiftedPieceCenter = useMemo(
    () =>
      (evt: GestureResponderEvent, gs: Partial<PanResponderGestureState>) => {
        const pageX =
          typeof gs.moveX === 'number' && gs.moveX !== 0
            ? gs.moveX
            : typeof evt.nativeEvent.pageX === 'number'
              ? evt.nativeEvent.pageX
              : gs.x0 ?? 0;
        const pageY =
          typeof gs.moveY === 'number' && gs.moveY !== 0
            ? gs.moveY
            : typeof evt.nativeEvent.pageY === 'number'
              ? evt.nativeEvent.pageY
              : gs.y0 ?? 0;

        const origin = dragOriginRef.current;
        const adjustedPageX = origin.active
          ? origin.x + (pageX - origin.x) * dragDistanceScaleX
          : pageX;
        const adjustedPageY = origin.active
          ? origin.y + (pageY - origin.y) * dragDistanceScaleY
          : pageY;

        return {
          x:
            adjustedPageX +
            dragCenterOffsetRef.current.x +
            centerOffsetX,
          y:
            adjustedPageY +
            dragCenterOffsetRef.current.y +
            dragOffsetY +
            centerOffsetY,
        };
      },
    [
      centerOffsetX,
      centerOffsetY,
      dragDistanceScaleX,
      dragDistanceScaleY,
      dragOffsetY,
    ],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !!pieceRef.current,
        onMoveShouldSetPanResponder: (_, gs) =>
          !!pieceRef.current && (Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5),
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: evt => {
          const locationX =
            typeof evt.nativeEvent.locationX === 'number'
              ? evt.nativeEvent.locationX
              : traySlotSize / 2;
          const locationY =
            typeof evt.nativeEvent.locationY === 'number'
              ? evt.nativeEvent.locationY
              : traySlotSize / 2;
          dragCenterOffsetRef.current = {
            x: traySlotSize / 2 - locationX,
            y: traySlotSize / 2 - locationY,
          };
          dragOriginRef.current = {
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
            active: true,
          };

          pan.setValue({ x: centerOffsetX, y: dragOffsetY + centerOffsetY });
          Animated.spring(scale, {
            toValue: 1.5,
            useNativeDriver: false,
            friction: 8,
          }).start();
          callbacksRef.current.onDragStart();
          const liftedCenter = getLiftedPieceCenter(evt, {
            moveX: evt.nativeEvent.pageX,
            moveY: evt.nativeEvent.pageY,
          });
          callbacksRef.current.onDragMove(liftedCenter.x, liftedCenter.y);
        },
        onPanResponderMove: (evt, gs) => {
          pan.setValue({
            x: gs.dx * dragDistanceScaleX + centerOffsetX,
            y: gs.dy * dragDistanceScaleY + dragOffsetY + centerOffsetY,
          });
          const liftedCenter = getLiftedPieceCenter(evt, gs);
          callbacksRef.current.onDragMove(liftedCenter.x, liftedCenter.y);
        },
        onPanResponderRelease: (evt, gs) => {
          const liftedCenter = getLiftedPieceCenter(evt, gs);
          dragOriginRef.current.active = false;
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: false,
            friction: 8,
          }).start();
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 6,
          }).start();
          callbacksRef.current.onDragEnd(liftedCenter.x, liftedCenter.y);
        },
        onPanResponderTerminate: () => {
          dragOriginRef.current.active = false;
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: false,
          }).start();
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
          callbacksRef.current.onDragCancel();
        },
      }),
    [
      centerOffsetX,
      centerOffsetY,
      dragDistanceScaleX,
      dragDistanceScaleY,
      dragOffsetY,
      getLiftedPieceCenter,
      pan,
      scale,
      traySlotSize,
    ],
  );

  if (!piece) {
    return (
      <View
        style={[
          styles.emptyContainer,
          {
            width: traySlotSize,
            height: traySlotSize,
          },
        ]}
      />
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: traySlotSize,
          height: traySlotSize,
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {piece.shape.map((row, r) => (
        <View key={r} style={styles.pieceRow}>
          {row.map((cell, c) =>
            cell === 1 ? (
              <VoxelBlock
                key={c}
                color={piece.color}
                size={blockSize}
                isGem={
                  rewardMarker !== null &&
                  rewardMarker.row === r &&
                  rewardMarker.col === c &&
                  piece.isGem === true
                }
                isItem={
                  rewardMarker !== null &&
                  rewardMarker.row === r &&
                  rewardMarker.col === c &&
                  piece.isItem === true
                }
                itemType={
                  rewardMarker !== null &&
                  rewardMarker.row === r &&
                  rewardMarker.col === c
                    ? piece.itemType
                    : undefined
                }
              />
            ) : (
              <View
                key={c}
                style={{ width: blockSize, height: blockSize, margin: 1 }}
              />
            ),
          )}
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  emptyContainer: {
    backgroundColor: 'rgba(15, 10, 40, 0.3)',
    borderRadius: 10,
    opacity: 0.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieceRow: {
    flexDirection: 'row',
  },
});
