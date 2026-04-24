import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import {ROWS} from '../constants';
import {getBoardMetrics} from './Board';
import type {VisualViewport} from '../game/visualConfig';
import type {LineClearEffectCell} from '../game/lineClearEffect';
import SpecialBlockBadge from './SpecialBlockBadge';

interface LineClearEffectProps {
  cells: LineClearEffectCell[];
  compact?: boolean;
  viewport?: Partial<VisualViewport>;
  onDone: () => void;
}

type FallingTileSpec = {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  launchVelocityX: number;
  lateralDragX: number;
  launchVelocityY: number;
  gravityY: number;
  popScale: number;
  isGem?: boolean;
  isItem?: boolean;
  itemType?: string;
};

const EFFECT_DURATION_MS = 560;

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export default function LineClearEffect({
  cells,
  compact = false,
  viewport,
  onDone,
}: LineClearEffectProps) {
  const timeline = useRef(new Animated.Value(0)).current;
  const onDoneRef = useRef(onDone);
  const metrics = getBoardMetrics(viewport, {compact});
  const boardHeight =
    metrics.padding * 2 + metrics.cellSize * ROWS + metrics.gap * (ROWS - 1);

  const tiles = useMemo<FallingTileSpec[]>(() => {
    const centerCol =
      cells.reduce((sum, cell) => sum + cell.col, 0) / Math.max(1, cells.length);
    const centerRow =
      cells.reduce((sum, cell) => sum + cell.row, 0) / Math.max(1, cells.length);
    const horizontalSpreadBase = Math.max(1.4, cells.length * 0.22);

    return cells.map((cell, cellIndex) => {
      const baseLeft =
        metrics.padding + cell.col * (metrics.cellSize + metrics.gap);
      const baseTop =
        metrics.padding + cell.row * (metrics.cellSize + metrics.gap);
      const seed = cell.row * 131 + cell.col * 17 + cellIndex * 53;
      const spreadNoise = pseudoRandom(seed + 5);
      const burstNoise = pseudoRandom(seed + 11);
      const fallNoise = pseudoRandom(seed + 17);
      const colOffset = cell.col - centerCol;
      const rowOffset = cell.row - centerRow;
      const outwardDistance = Math.hypot(colOffset, rowOffset);
      const normalizedCol = colOffset / horizontalSpreadBase;
      const launchAngleDeg =
        -90 +
        normalizedCol * 34 +
        (spreadNoise - 0.5) * 18 +
        (cellIndex % 2 === 0 ? -4 : 4);
      const launchAngleRad = (launchAngleDeg * Math.PI) / 180;
      const launchSpeed =
        metrics.cellSize *
        (1.02 +
          Math.min(0.22, outwardDistance * 0.08) +
          burstNoise * 0.28);
      const launchVelocityX = Math.cos(launchAngleRad) * launchSpeed;
      const launchVelocityY =
        Math.max(
        metrics.cellSize * 0.54,
        -Math.sin(launchAngleRad) * launchSpeed,
        ) * 3;
      const fallDistance =
        boardHeight -
        baseTop +
        metrics.cellSize * (1.16 + fallNoise * 0.44);
      const lateralDragX =
        -launchVelocityX * (0.28 + spreadNoise * 0.1);

      return {
        key: `${cell.id}-${cellIndex}`,
        left: baseLeft,
        top: baseTop,
        width: metrics.cellSize,
        height: metrics.cellSize,
        color: cell.color,
        launchVelocityX,
        lateralDragX,
        launchVelocityY,
        gravityY: fallDistance + launchVelocityY,
        popScale: 1.04 + burstNoise * 0.04,
        isGem: cell.isGem,
        isItem: cell.isItem,
        itemType: cell.itemType,
      };
    });
  }, [
    boardHeight,
    cells,
    metrics.cellSize,
    metrics.gap,
    metrics.padding,
  ]);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (cells.length === 0) {
      return;
    }

    timeline.stopAnimation();
    timeline.setValue(0);
    const animation = Animated.timing(timeline, {
      toValue: 1,
      duration: EFFECT_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start(({finished}) => {
      if (finished) {
        onDoneRef.current();
      }
    });

    return () => {
      animation.stop();
    };
  }, [cells, timeline]);

  if (cells.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {tiles.map(tile => {
        const timeSquared = Animated.multiply(timeline, timeline);
        const translateX = Animated.add(
          Animated.multiply(timeline, tile.launchVelocityX),
          Animated.multiply(timeSquared, tile.lateralDragX),
        );
        const translateY = Animated.add(
          Animated.multiply(timeline, -tile.launchVelocityY),
          Animated.multiply(timeSquared, tile.gravityY),
        );
        const opacity = timeline.interpolate({
          inputRange: [0, 0.76, 1],
          outputRange: [1, 0.96, 0],
        });
        const burstGlowOpacity = timeline.interpolate({
          inputRange: [0, 0.12, 0.36, 1],
          outputRange: [0.68, 0.3, 0.08, 0],
        });
        const scale = timeline.interpolate({
          inputRange: [0, 0.12, 1],
          outputRange: [0.74, tile.popScale + 0.04, 1],
        });
        return (
          <Animated.View
            key={tile.key}
            pointerEvents="none"
            style={[
              styles.tile,
              {
                left: tile.left,
                top: tile.top,
                width: tile.width,
                height: tile.height,
                opacity,
                transform: [{translateX}, {translateY}, {scale}],
              },
            ]}>
            <View style={styles.tileShadow} />
            <Animated.View
              pointerEvents="none"
              style={[styles.tileBurstGlow, {opacity: burstGlowOpacity}]}
            />
            <View style={[styles.tileHighlight, {backgroundColor: lighten(tile.color, 60)}]} />
            <View style={[styles.tileFace, {backgroundColor: tile.color}]} />
            <View style={styles.tileGloss} />
            <SpecialBlockBadge
              isGem={tile.isGem}
              isItem={tile.isItem}
              itemType={tile.itemType}
              size={Math.min(tile.width, tile.height)}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

function hexToRgb(hex: string): {r: number; g: number; b: number} {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.substring(0, 2), 16),
    g: parseInt(normalized.substring(2, 4), 16),
    b: parseInt(normalized.substring(4, 6), 16),
  };
}

function lighten(hex: string, amount: number): string {
  const {r, g, b} = hexToRgb(hex);
  return `rgb(${Math.min(255, r + amount)},${Math.min(
    255,
    g + amount,
  )},${Math.min(255, b + amount)})`;
}

const styles = StyleSheet.create({
  tile: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 4,
  },
  tileShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 4,
    backgroundColor: 'rgba(15,23,42,0.86)',
  },
  tileBurstGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  tileHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 2,
    bottom: 2,
    borderRadius: 4,
  },
  tileFace: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 3,
  },
  tileGloss: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: '34%',
    height: '18%',
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
