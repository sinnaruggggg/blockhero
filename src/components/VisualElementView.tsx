import React from 'react';
import {
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  getVisualElementRule,
  resolveVisualOffset,
  type VisualElementId,
  type VisualScreenId,
  type VisualViewport,
} from '../game/visualConfig';
import {useVisualConfig} from '../hooks/useVisualConfig';

export function buildVisualElementStyle(rule: {
  offsetX: number;
  offsetY: number;
  scale: number;
  opacity: number;
  zIndex: number;
  safeAreaAware?: boolean;
}, currentViewport?: VisualViewport, referenceViewport?: VisualViewport): ViewStyle {
  const resolvedOffset =
    currentViewport && referenceViewport
      ? resolveVisualOffset(
          rule.offsetX,
          rule.offsetY,
          currentViewport,
          referenceViewport,
          rule.safeAreaAware === true,
        )
      : {x: rule.offsetX, y: rule.offsetY};

  return {
    opacity: rule.opacity,
    zIndex: rule.zIndex,
    transform: [
      {translateX: resolvedOffset.x},
      {translateY: resolvedOffset.y},
      {scale: rule.scale},
    ],
  };
}

export default function VisualElementView({
  screenId,
  elementId,
  style,
  children,
  viewport,
  ...rest
}: {
  screenId: VisualScreenId;
  elementId: VisualElementId;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  viewport?: VisualViewport;
} & ViewProps) {
  const windowDimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {manifest} = useVisualConfig();
  const rule = getVisualElementRule(manifest, screenId, elementId);
  const currentViewport =
    viewport ??
    ({
      width: windowDimensions.width,
      height: windowDimensions.height,
      safeTop: insets.top,
      safeBottom: insets.bottom,
    } satisfies VisualViewport);

  if (!rule.visible) {
    return null;
  }

  return (
    <View
      {...rest}
      style={[
        style,
        buildVisualElementStyle(rule, currentViewport, manifest.referenceViewport),
      ]}>
      {children}
    </View>
  );
}
