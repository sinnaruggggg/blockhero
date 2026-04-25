import React, {useEffect, useRef} from 'react';
import {Animated, Text, StyleSheet} from 'react-native';

interface FloatingDamageLabelProps {
  damage: number;
  stackIndex?: number;
  baseTop?: number;
  stackGap?: number;
  variant?: 'player' | 'summon';
}

export default function FloatingDamageLabel({
  damage,
  stackIndex = 0,
  baseTop = 0,
  stackGap = 16,
  variant = 'player',
}: FloatingDamageLabelProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(8);
    scale.setValue(0.92);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 14,
        stiffness: 170,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 12,
        stiffness: 180,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [damage, opacity, scale, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.damageFlash,
        variant === 'summon' && styles.damageFlashSummon,
        {
          top: baseTop - stackIndex * stackGap,
          opacity,
          zIndex: 12 - stackIndex,
          transform: [{translateY}, {scale}],
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
    borderRadius: 8,
    minWidth: 30,
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    shadowColor: '#111827',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 12,
  },
  damageFlashSummon: {
    // RAID_FIX: summon damage is shown separately from player damage.
    backgroundColor: 'rgba(37,99,235,0.94)',
  },
  damageFlashText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
  },
});
