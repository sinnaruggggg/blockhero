import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type ColorValue,
} from 'react-native';

type SkillTriggerBoardEffectProps = {
  message: string | null;
  triggerKey?: number;
  accentColor?: ColorValue;
};

export default function SkillTriggerBoardEffect({
  message,
  triggerKey = 0,
  accentColor = '#facc15',
}: SkillTriggerBoardEffectProps) {
  const timeline = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) {
      timeline.stopAnimation();
      timeline.setValue(0);
      return;
    }

    timeline.stopAnimation();
    timeline.setValue(0);
    Animated.timing(timeline, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [message, timeline, triggerKey]);

  if (!message) {
    return null;
  }

  const hostOpacity = timeline.interpolate({
    inputRange: [0, 0.08, 0.68, 1],
    outputRange: [0, 1, 1, 0],
  });
  const badgeScale = timeline.interpolate({
    inputRange: [0, 0.16, 0.42, 1],
    outputRange: [0.78, 1.12, 1, 0.94],
  });
  const badgeTranslateY = timeline.interpolate({
    inputRange: [0, 0.16, 1],
    outputRange: [18, 0, -8],
  });
  const badgeGlowOpacity = timeline.interpolate({
    inputRange: [0, 0.12, 0.45, 1],
    outputRange: [0, 0.72, 0.3, 0],
  });
  const lineScaleX = timeline.interpolate({
    inputRange: [0, 0.2, 0.6, 1],
    outputRange: [0.45, 1.08, 1, 0.82],
  });
  const lineOpacity = timeline.interpolate({
    inputRange: [0, 0.1, 0.7, 1],
    outputRange: [0, 0.75, 0.34, 0],
  });
  const ringOneScale = timeline.interpolate({
    inputRange: [0, 0.75, 1],
    outputRange: [0.34, 1.22, 1.42],
  });
  const ringOneOpacity = timeline.interpolate({
    inputRange: [0, 0.24, 1],
    outputRange: [0.46, 0.38, 0],
  });
  const ringTwoScale = timeline.interpolate({
    inputRange: [0, 0.82, 1],
    outputRange: [0.52, 1.48, 1.66],
  });
  const ringTwoOpacity = timeline.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.28, 0.22, 0],
  });

  return (
    <View pointerEvents="none" style={styles.host}>
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: accentColor,
            opacity: Animated.multiply(hostOpacity, ringOneOpacity),
            transform: [{ scale: ringOneScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ringSecondary,
          {
            borderColor: accentColor,
            opacity: Animated.multiply(hostOpacity, ringTwoOpacity),
            transform: [{ scale: ringTwoScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.energyLine,
          {
            backgroundColor: accentColor,
            opacity: Animated.multiply(hostOpacity, lineOpacity),
            transform: [{ scaleX: lineScaleX }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.energyLineVertical,
          {
            backgroundColor: accentColor,
            opacity: Animated.multiply(hostOpacity, lineOpacity),
            transform: [{ scaleY: lineScaleX }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.badgeGlow,
          {
            backgroundColor: accentColor,
            opacity: Animated.multiply(hostOpacity, badgeGlowOpacity),
            transform: [{ scale: badgeScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.badge,
          {
            opacity: hostOpacity,
            transform: [{ translateY: badgeTranslateY }, { scale: badgeScale }],
          },
        ]}
      >
        <Text style={styles.label}>SKILL TRIGGER</Text>
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  ring: {
    position: 'absolute',
    width: '54%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 2,
    shadowColor: '#facc15',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  ringSecondary: {
    position: 'absolute',
    width: '72%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  energyLine: {
    position: 'absolute',
    width: '78%',
    height: 3,
    borderRadius: 999,
  },
  energyLineVertical: {
    position: 'absolute',
    width: 3,
    height: '78%',
    borderRadius: 999,
  },
  badgeGlow: {
    position: 'absolute',
    width: '44%',
    maxWidth: 188,
    aspectRatio: 2.9,
    borderRadius: 999,
  },
  badge: {
    minWidth: 156,
    maxWidth: '78%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.72)',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  label: {
    color: '#fde68a',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  message: {
    marginTop: 3,
    color: '#fff7ed',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
});
