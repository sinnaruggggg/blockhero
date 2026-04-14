import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const introImage = require('../assets/ui/intro.jpg');
const MIN_SPLASH_VISIBLE_MS = 3000;

interface IntroScreenProps {
  readyToExit: boolean;
  onFinish: () => void;
}

export default function IntroScreen({
  readyToExit,
  onFinish,
}: IntroScreenProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const exitRequestedRef = useRef(false);
  const [introAnimationDone, setIntroAnimationDone] = useState(false);
  const [minimumVisibleTimeElapsed, setMinimumVisibleTimeElapsed] =
    useState(false);
  const imageFade = useRef(new Animated.Value(0)).current;
  const loadingPulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const minimumVisibleTimer = setTimeout(() => {
      setMinimumVisibleTimeElapsed(true);
    }, MIN_SPLASH_VISIBLE_MS);

    Animated.timing(imageFade, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start(() => {
      setIntroAnimationDone(true);
    });

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(loadingPulse, {
          toValue: 0.45,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseAnimation.start();

    return () => {
      clearTimeout(minimumVisibleTimer);
      pulseAnimation.stop();
    };
  }, [imageFade, loadingPulse]);

  useEffect(() => {
    if (
      !readyToExit ||
      !introAnimationDone ||
      !minimumVisibleTimeElapsed ||
      exitRequestedRef.current
    ) {
      return;
    }

    exitRequestedRef.current = true;
    onFinish();
  }, [introAnimationDone, minimumVisibleTimeElapsed, onFinish, readyToExit]);

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <Animated.Image
        source={introImage}
        style={[
          styles.backgroundImage,
          {
            width: screenWidth,
            height: screenHeight,
            opacity: imageFade,
          },
        ]}
        resizeMode="cover"
      />

      <View pointerEvents="none" style={styles.bottomOverlay}>
        <Animated.View style={[styles.loadingBadge, { opacity: loadingPulse }]}>
          <ActivityIndicator size="small" color="#ffffff" />
          <View style={styles.loadingTextBlock}>
            <Text style={styles.loadingTitle}>게임 데이터를 준비 중입니다</Text>
            <Text style={styles.loadingSubtitle}>
              메인 화면이 완전히 준비되면 바로 이동합니다.
            </Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

Image.resolveAssetSource(introImage);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  loadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(7, 12, 20, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  loadingTextBlock: {
    gap: 2,
  },
  loadingTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  loadingSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 17,
  },
});
