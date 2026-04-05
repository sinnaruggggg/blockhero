import React, {useRef, useMemo, useEffect} from 'react';
import {View, StyleSheet, PanResponder, Animated} from 'react-native';
import {Piece} from '../game/engine';
import {CELL_SIZE, CELL_GAP} from './Board';

const BLOCK_SIZE = 18;
const COMPACT_BLOCK_SIZE = 16;
const BOARD_CELL_STEP = CELL_SIZE + CELL_GAP;
const DRAG_OFFSET_Y = -Math.round(BOARD_CELL_STEP * 2.5); // 2 board blocks above finger
const DRAG_EXTRA = 0.05; // 5% extra movement distance
const BEVEL = 2;

// Voxel helpers
function hexToRgb(hex: string): {r: number; g: number; b: number} {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function lighten(hex: string, amount: number): string {
  const {r, g, b} = hexToRgb(hex);
  return `rgb(${Math.min(255, r + amount)},${Math.min(255, g + amount)},${Math.min(255, b + amount)})`;
}

function darken(hex: string, amount: number): string {
  const {r, g, b} = hexToRgb(hex);
  return `rgb(${Math.max(0, r - amount)},${Math.max(0, g - amount)},${Math.max(0, b - amount)})`;
}

function VoxelBlock({color, size}: {color: string; size: number}) {
  return (
    <View style={{width: size, height: size, margin: 1}}>
      {/* Shadow edge */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        borderRadius: 3, backgroundColor: darken(color, 70),
      }} />
      {/* Highlight edge */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: BEVEL, bottom: BEVEL,
        borderRadius: 3, backgroundColor: lighten(color, 60),
      }} />
      {/* Face */}
      <View style={{
        position: 'absolute', top: BEVEL, left: BEVEL, right: BEVEL, bottom: BEVEL,
        borderRadius: 2, backgroundColor: color,
      }} />
      {/* Gloss */}
      <View style={{
        position: 'absolute', top: BEVEL + 1, left: BEVEL + 1,
        width: Math.floor((size - BEVEL * 2) * 0.4),
        height: Math.floor((size - BEVEL * 2) * 0.25),
        borderRadius: 1,
        backgroundColor: 'rgba(255,255,255,0.3)',
      }} />
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
}

export default function DraggablePiece({
  piece,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  compact = false,
}: DraggablePieceProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const blockSize = compact ? COMPACT_BLOCK_SIZE : BLOCK_SIZE;

  const callbacksRef = useRef({onDragStart, onDragMove, onDragEnd, onDragCancel});
  const pieceRef = useRef(piece);
  useEffect(() => {
    callbacksRef.current = {onDragStart, onDragMove, onDragEnd, onDragCancel};
    pieceRef.current = piece;
  });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !!pieceRef.current,
        onMoveShouldSetPanResponder: (_, gs) =>
          !!pieceRef.current && (Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5),
        onPanResponderGrant: () => {
          pan.setValue({x: 0, y: DRAG_OFFSET_Y});
          Animated.spring(scale, {
            toValue: 1.5,
            useNativeDriver: false,
            friction: 8,
          }).start();
          callbacksRef.current.onDragStart();
        },
        onPanResponderMove: (evt, gs) => {
          pan.setValue({
            x: gs.dx * (1 + DRAG_EXTRA),
            y: gs.dy * (1 + DRAG_EXTRA) + DRAG_OFFSET_Y,
          });
          callbacksRef.current.onDragMove(
            evt.nativeEvent.pageX + gs.dx * DRAG_EXTRA,
            evt.nativeEvent.pageY + gs.dy * DRAG_EXTRA + DRAG_OFFSET_Y,
          );
        },
        onPanResponderRelease: (evt, gs) => {
          const finalX = evt.nativeEvent.pageX + gs.dx * DRAG_EXTRA;
          const finalY = evt.nativeEvent.pageY + gs.dy * DRAG_EXTRA + DRAG_OFFSET_Y;
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: false,
            friction: 8,
          }).start();
          Animated.spring(pan, {
            toValue: {x: 0, y: 0},
            useNativeDriver: false,
            friction: 6,
          }).start();
          callbacksRef.current.onDragEnd(finalX, finalY);
        },
        onPanResponderTerminate: () => {
          Animated.spring(scale, {toValue: 1, useNativeDriver: false}).start();
          Animated.spring(pan, {
            toValue: {x: 0, y: 0},
            useNativeDriver: false,
          }).start();
          callbacksRef.current.onDragCancel();
        },
      }),
    [pan, scale],
  );

  if (!piece) {
    return <View style={[styles.emptyContainer, compact && styles.emptyContainerCompact]} />;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        compact && styles.containerCompact,
        {
          transform: [
            {translateX: pan.x},
            {translateY: pan.y},
            {scale},
          ],
        },
      ]}
      {...panResponder.panHandlers}>
      {piece.shape.map((row, r) => (
        <View key={r} style={styles.pieceRow}>
              {row.map((cell, c) =>
            cell === 1 ? (
              <VoxelBlock key={c} color={piece.color} size={blockSize} />
            ) : (
              <View key={c} style={{width: blockSize, height: blockSize, margin: 1}} />
            ),
          )}
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 64,
    minHeight: 64,
    backgroundColor: 'transparent',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  containerCompact: {
    minWidth: 56,
    minHeight: 56,
    padding: 6,
  },
  emptyContainer: {
    minWidth: 64,
    minHeight: 64,
    backgroundColor: 'rgba(15, 10, 40, 0.3)',
    borderRadius: 10,
    opacity: 0.3,
  },
  emptyContainerCompact: {
    minWidth: 56,
    minHeight: 56,
  },
  pieceRow: {
    flexDirection: 'row',
  },
});
