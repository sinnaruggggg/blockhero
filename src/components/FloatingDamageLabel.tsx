import React, {useEffect, useRef} from 'react';
import {Animated, Text, StyleSheet} from 'react-native';

interface FloatingDamageLabelProps {
  damage: number;
  stackIndex?: number;
  onDone: () => void;
  baseTop?: number;
  stackGap?: number;
}

export default function FloatingDamageLabel({
  damage,
  stackIndex = 0,
  onDone,
  baseTop = -22,
  stackGap = 24,
}: FloatingDamageLabelProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(translateY, {toValue: -6, duration: 220, useNativeDriver: true}),
        Animated.timing(translateY, {toValue: -18, duration: 820, useNativeDriver: true}),
      ]),
      Animated.sequence([
        Animated.delay(650),
        Animated.timing(opacity, {toValue: 0, duration: 350, useNativeDriver: true}),
      ]),
    ]).start(onDone);
  }, [onDone, opacity, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.damageFlash,
        {
          top: baseTop - stackIndex * stackGap,
          opacity,
          zIndex: 12 - stackIndex,
          transform: [{translateY}],
        },
      ]}>
      <Text style={styles.damageFlashText}>-{damage}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  damageFlash: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(239,68,68,0.92)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  damageFlashText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});
