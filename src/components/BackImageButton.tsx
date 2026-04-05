import React from 'react';
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

interface BackImageButtonProps {
  onPress: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

function Arrow({
  size,
  color,
  offsetX = 0,
  offsetY = 0,
}: {
  size: number;
  color: string;
  offsetX?: number;
  offsetY?: number;
}) {
  const bodyWidth = Math.round(size * 0.36);
  const bodyHeight = Math.max(7, Math.round(size * 0.18));
  const headWidth = Math.round(size * 0.31);
  const headHeight = Math.max(9, Math.round(size * 0.23));

  return (
    <View
      pointerEvents="none"
      style={[
        styles.arrowLayer,
        {
          transform: [{translateX: offsetX}, {translateY: offsetY}],
        },
      ]}>
      <View
        style={[
          styles.arrowHead,
          {
            borderTopWidth: headHeight,
            borderBottomWidth: headHeight,
            borderRightWidth: headWidth,
            borderRightColor: color,
          },
        ]}
      />
      <View
          style={[
            styles.arrowBody,
            {
              width: bodyWidth,
              height: bodyHeight,
              backgroundColor: color,
              marginLeft: -Math.round(size * 0.015),
            },
          ]}
        />
    </View>
  );
}

export default function BackImageButton({
  onPress,
  size = 44,
  style,
}: BackImageButtonProps) {
  const outerRadius = Math.max(8, Math.round(size * 0.14));
  const innerRadius = Math.max(6, Math.round(size * 0.11));
  const innerInset = Math.max(2, Math.round(size * 0.05));
  const arrowShadowOffsetX = Math.max(1, Math.round(size * 0.03));
  const arrowShadowOffsetY = Math.max(1, Math.round(size * 0.03));

  return (
    <TouchableOpacity
      accessibilityLabel="뒤로가기"
      accessibilityRole="button"
      activeOpacity={0.82}
      onPress={onPress}
      style={[styles.hitArea, {width: size, height: size}, style]}>
      <View
        style={[
          styles.outerFrame,
          {
            width: size,
            height: size,
            borderRadius: outerRadius,
          },
        ]}>
        <View
          style={[
            styles.innerFrame,
            {
              margin: innerInset,
              borderRadius: innerRadius,
            },
          ]}>
          <View
            style={[
              styles.topGlow,
              {
                borderTopLeftRadius: innerRadius,
                borderTopRightRadius: innerRadius,
              },
            ]}
          />
          <View
            style={[
              styles.leftGlow,
              {
                borderTopLeftRadius: innerRadius,
                borderBottomLeftRadius: innerRadius,
              },
            ]}
          />
          <View
            style={[
              styles.bottomShade,
              {
                borderBottomLeftRadius: innerRadius,
                borderBottomRightRadius: innerRadius,
              },
            ]}
          />
          <Arrow
            size={size}
            color="#5f7faa"
            offsetX={arrowShadowOffsetX}
            offsetY={arrowShadowOffsetY}
          />
          <Arrow size={size} color="#ffffff" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerFrame: {
    backgroundColor: '#275b95',
    borderWidth: 1.5,
    borderColor: '#163c6b',
    shadowColor: '#00152d',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.45,
    shadowRadius: 3,
    elevation: 5,
  },
  innerFrame: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#88d0fb',
    backgroundColor: '#5aa9f3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '38%',
    backgroundColor: '#8fdbff',
  },
  leftGlow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '20%',
    backgroundColor: 'rgba(170, 231, 255, 0.22)',
  },
  bottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '24%',
    backgroundColor: '#3a8adf',
  },
  arrowLayer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  arrowBody: {
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
});
