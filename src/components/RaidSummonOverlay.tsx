import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  ImageSourcePropType,
  StyleSheet,
  View,
} from 'react-native';

const SUMMON_POINTS = [
  {x: 0.16, y: 0.42},
  {x: 0.68, y: 0.42},
  {x: 0.24, y: 0.18},
  {x: 0.62, y: 0.18},
];

const BOSS_TARGET = {x: 0.46, y: 0.28};

interface RaidSummonOverlayProps {
  visible: boolean;
  returning: boolean;
  attackPulse: number;
  spawnIndex: number;
  spriteSet: {
    idle: ImageSourcePropType;
    attack: ImageSourcePropType;
    hurt: ImageSourcePropType;
    scale?: number;
  } | null;
  compact?: boolean;
  onReturnDone?: () => void;
}

type SummonFrame = 'idle' | 'attack' | 'hurt';

export default function RaidSummonOverlay({
  visible,
  returning,
  attackPulse,
  spawnIndex,
  spriteSet,
  compact = false,
  onReturnDone,
}: RaidSummonOverlayProps) {
  const [frame, setFrame] = useState<SummonFrame>('idle');
  const opacity = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const dash = useRef(new Animated.Value(0)).current;
  const returnProgress = useRef(new Animated.Value(0)).current;
  const popScale = useRef(new Animated.Value(0.82)).current;
  const idleLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const point = SUMMON_POINTS[spawnIndex % SUMMON_POINTS.length] ?? SUMMON_POINTS[0];
  const baseSize = compact ? 46 : 60;
  const spriteScale = spriteSet?.scale ?? 1;
  const renderSize = baseSize * spriteScale;
  const dashRangeX = (BOSS_TARGET.x - point.x) * (compact ? 110 : 148);
  const dashRangeY = (BOSS_TARGET.y - point.y) * (compact ? 88 : 116);
  const facing = point.x <= BOSS_TARGET.x ? 1 : -1;
  const source =
    frame === 'attack'
      ? spriteSet?.attack
      : frame === 'hurt'
        ? spriteSet?.hurt
        : spriteSet?.idle;

  useEffect(() => {
    if (!visible || !spriteSet || returning) {
      idleLoopRef.current?.stop();
      floatY.setValue(0);
      return;
    }

    idleLoopRef.current?.stop();
    idleLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -3,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 3,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    idleLoopRef.current.start();

    return () => {
      idleLoopRef.current?.stop();
    };
  }, [floatY, returning, spriteSet, visible]);

  useEffect(() => {
    if (!visible || !spriteSet) {
      opacity.setValue(0);
      dash.setValue(0);
      popScale.setValue(0.82);
      returnProgress.setValue(0);
      setFrame('idle');
      return;
    }

    opacity.setValue(0);
    popScale.setValue(0.82);
    returnProgress.setValue(0);
    dash.setValue(0);
    setFrame('idle');

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(popScale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [dash, opacity, popScale, returnProgress, spawnIndex, spriteSet, visible]);

  useEffect(() => {
    if (!visible || !spriteSet || returning || attackPulse <= 0) {
      return;
    }

    setFrame('attack');
    dash.setValue(0);

    Animated.sequence([
      Animated.timing(dash, {
        toValue: 1,
        duration: 170,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(40),
      Animated.timing(dash, {
        toValue: 0,
        duration: 190,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setFrame('idle');
    });
  }, [attackPulse, dash, returning, spriteSet, visible]);

  useEffect(() => {
    if (!visible || !spriteSet || !returning) {
      return;
    }

    idleLoopRef.current?.stop();
    setFrame('hurt');
    returnProgress.setValue(0);

    Animated.parallel([
      Animated.timing(returnProgress, {
        toValue: 1,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      dash.setValue(0);
      setFrame('idle');
      onReturnDone?.();
    });
  }, [dash, onReturnDone, opacity, returnProgress, returning, spriteSet, visible]);

  if (!visible || !spriteSet || !source) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View
        style={[
          styles.anchor,
          {
            left: `${point.x * 100}%`,
            top: `${point.y * 100}%`,
            width: renderSize,
            height: renderSize,
            opacity,
            transform: [
              {translateX: -renderSize / 2},
              {translateY: -renderSize / 2},
              {
                translateX: dash.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, dashRangeX],
                }),
              },
              {
                translateY: dash.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, dashRangeY],
                }),
              },
              {
                translateY: returnProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 20],
                }),
              },
              {translateY: floatY},
              {scale: popScale},
              {
                scale: returnProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.78],
                }),
              },
              {scaleX: facing},
            ],
          },
        ]}>
        <Animated.Image
          source={source}
          fadeDuration={0}
          resizeMode="contain"
          style={styles.sprite}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
  anchor: {
    position: 'absolute',
    zIndex: 4,
  },
  sprite: {
    width: '100%',
    height: '100%',
  },
});
