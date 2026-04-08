import React from 'react';
import {View, type StyleProp, type ViewProps, type ViewStyle} from 'react-native';
import {getVisualElementRule, type VisualElementId, type VisualScreenId} from '../game/visualConfig';
import {useVisualConfig} from '../hooks/useVisualConfig';

export function buildVisualElementStyle(rule: {
  offsetX: number;
  offsetY: number;
  scale: number;
  opacity: number;
  zIndex: number;
}): ViewStyle {
  return {
    opacity: rule.opacity,
    zIndex: rule.zIndex,
    transform: [
      {translateX: rule.offsetX},
      {translateY: rule.offsetY},
      {scale: rule.scale},
    ],
  };
}

export default function VisualElementView({
  screenId,
  elementId,
  style,
  children,
  ...rest
}: {
  screenId: VisualScreenId;
  elementId: VisualElementId;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
} & ViewProps) {
  const {manifest} = useVisualConfig();
  const rule = getVisualElementRule(manifest, screenId, elementId);

  if (!rule.visible) {
    return null;
  }

  return (
    <View {...rest} style={[style, buildVisualElementStyle(rule)]}>
      {children}
    </View>
  );
}
