import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Image,
  type ImageStyle,
  StatusBar,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';

const introImage = require('../assets/ui/intro.jpg');
const {width: introImageWidth, height: introImageHeight} =
  Image.resolveAssetSource(introImage);
const introImageAspectRatio = introImageWidth / introImageHeight;

interface IntroScreenProps {
  onPress: () => void;
}

export default function IntroScreen({onPress}: IntroScreenProps) {
  const {width: screenWidth, height: screenHeight} = useWindowDimensions();
  const [loadingDone, setLoadingDone] = useState(false);
  const loadingProgress = useRef(new Animated.Value(0)).current;
  const imageFade = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const loadingBarOpacity = useRef(new Animated.Value(1)).current;
  const screenAspectRatio = screenWidth / screenHeight;
  const backgroundImageSize: ImageStyle =
    screenAspectRatio > introImageAspectRatio
      ? {
          width: screenHeight * introImageAspectRatio,
          height: screenHeight,
        }
      : {
          width: screenWidth,
          height: screenWidth / introImageAspectRatio,
        };

  useEffect(() => {
    Animated.timing(imageFade, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    Animated.timing(loadingProgress, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start(() => {
      setLoadingDone(true);

      Animated.timing(loadingBarOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(textFade, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(textFade, {
            toValue: 0.2,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, [imageFade, loadingBarOpacity, loadingProgress, textFade]);

  const barWidth = loadingProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, screenWidth * 0.6],
  });

  return (
    <TouchableWithoutFeedback onPress={loadingDone ? onPress : undefined}>
      <View style={styles.container}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />

        <View pointerEvents="none" style={styles.backgroundImageFrame}>
          <Animated.Image
            source={introImage}
            style={[
              backgroundImageSize,
              {
                opacity: imageFade,
              },
            ]}
            resizeMode="contain"
          />
        </View>

        <Animated.View
          style={[
            styles.loadingContainer,
            {marginBottom: screenHeight * 0.1, opacity: loadingBarOpacity},
          ]}>
          <View style={[styles.loadingTrack, {width: screenWidth * 0.6}]}>
            <Animated.View style={[styles.loadingBar, {width: barWidth}]} />
          </View>
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </Animated.View>

        {loadingDone && (
          <Animated.Text
            style={[
              styles.touchText,
              {marginBottom: screenHeight * 0.08, opacity: textFade},
            ]}>
            아무 곳이나 터치하세요
          </Animated.Text>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#000',
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  backgroundImageFrame: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingTrack: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    height: 6,
    overflow: 'hidden',
  },
  loadingBar: {
    backgroundColor: '#a78bfa',
    borderRadius: 3,
    height: '100%',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 8,
  },
  touchText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
  },
});
