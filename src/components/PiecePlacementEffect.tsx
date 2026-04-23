import React, {useEffect} from 'react';
import {
  Platform,
  StyleSheet,
  View,
  requireNativeComponent,
  type ViewStyle,
} from 'react-native';
import type {PiecePlacementEffectCell} from '../game/piecePlacementEffect';

interface PiecePlacementEffectProps {
  cells: PiecePlacementEffectCell[];
  onDone: () => void;
}

type NativeBlockPlacementVfxProps = {
  cells: PiecePlacementEffectCell[];
  style?: ViewStyle;
  pointerEvents?: 'none';
};

const NativeBlockPlacementVfx =
  Platform.OS === 'android'
    ? requireNativeComponent<NativeBlockPlacementVfxProps>(
        'BlockPlacementVfxView',
      )
    : null;

const NATIVE_EFFECT_DURATION_MS = 1080;

export default function PiecePlacementEffect({
  cells,
  onDone,
}: PiecePlacementEffectProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, NATIVE_EFFECT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (cells.length === 0 || !NativeBlockPlacementVfx) {
    return null;
  }

  return (
    <View pointerEvents="none" collapsable={false} style={StyleSheet.absoluteFill}>
      <NativeBlockPlacementVfx
        pointerEvents="none"
        cells={cells}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
