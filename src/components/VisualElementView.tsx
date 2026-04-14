import React from 'react';
import {
  StyleSheet,
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

export const VISUAL_AUTOMATION_PREFIX = 'blockhero-visual:';

export function buildVisualAutomationLabel(
  screenId: VisualScreenId,
  elementId: VisualElementId,
) {
  return `${VISUAL_AUTOMATION_PREFIX}${screenId}:${elementId}`;
}

export function buildVisualElementStyle(rule: {
  offsetX: number;
  offsetY: number;
  scale: number;
  widthScale?: number;
  heightScale?: number;
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
      {scaleX: rule.scale * (rule.widthScale ?? 1)},
      {scaleY: rule.scale * (rule.heightScale ?? 1)},
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

  const automationLabel = buildVisualAutomationLabel(screenId, elementId);

  return (
    <View
      {...rest}
      collapsable={false}
      style={[
        style,
        buildVisualElementStyle(rule, currentViewport, manifest.referenceViewport),
      ]}>
      <View
        pointerEvents="none"
        accessible
        accessibilityLabel={automationLabel}
        collapsable={false}
        style={styles.automationTag}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  automationTag: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.01,
  },
});
