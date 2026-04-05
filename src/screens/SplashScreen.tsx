import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';

export default function SplashScreen({onFinish}: {onFinish: () => void}) {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const cubeRotate = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(cubeRotate, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.delay(800),
    ]).start(() => {
      onFinish();
    });
  }, [cubeRotate, glowOpacity, logoOpacity, logoScale, onFinish, subtitleOpacity]);

  const spin = cubeRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glow, {opacity: glowOpacity}]} />

      <Animated.View
        style={[
          styles.cubeContainer,
          {
            opacity: logoOpacity,
            transform: [{scale: logoScale}, {rotateZ: spin}],
          },
        ]}>
        <View style={styles.cube}>
          <View style={styles.cubeRow}>
            <View style={[styles.cubeBlock, {backgroundColor: '#818cf8'}]} />
            <View style={[styles.cubeBlock, {backgroundColor: '#6366f1'}]} />
          </View>
          <View style={styles.cubeRow}>
            <View style={[styles.cubeBlock, {backgroundColor: '#a78bfa'}]} />
            <View style={[styles.cubeBlock, {backgroundColor: '#818cf8'}]} />
          </View>
        </View>
      </Animated.View>

      <Animated.Text
        style={[
          styles.title,
          {
            opacity: logoOpacity,
            transform: [{scale: logoScale}],
          },
        ]}>
        BLOCKHERO
      </Animated.Text>

      <Animated.Text style={[styles.subtitle, {opacity: subtitleOpacity}]}>
        블록 히어로
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#6366f1',
    opacity: 0.15,
  },
  cubeContainer: {
    marginBottom: 24,
  },
  cube: {
    gap: 4,
  },
  cubeRow: {
    flexDirection: 'row',
    gap: 4,
  },
  cubeBlock: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#e2e8f0',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#a5b4fc',
    marginTop: 8,
    letterSpacing: 2,
  },
});
