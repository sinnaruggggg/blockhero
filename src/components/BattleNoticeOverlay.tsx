import React, {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';

interface BattleNoticeOverlayProps {
  message: string | null;
  bottom?: number;
}

export default function BattleNoticeOverlay({
  message,
  bottom = 118,
}: BattleNoticeOverlayProps) {
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    if (message) {
      setDisplayMessage(message);
      opacity.setValue(0);
      translateY.setValue(18);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 60,
        }),
      ]).start();
      return;
    }

    if (!displayMessage) {
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -10,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(({finished}) => {
      if (finished) {
        setDisplayMessage(null);
      }
    });
  }, [displayMessage, message, opacity, translateY]);

  if (!displayMessage) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[styles.overlay, {bottom}]}>
      <Animated.View
        style={[
          styles.chip,
          {
            opacity,
            transform: [{translateY}],
          },
        ]}>
        <Text style={styles.text}>{displayMessage}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  chip: {
    backgroundColor: 'rgba(15,23,42,0.94)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.45)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 8},
    elevation: 10,
  },
  text: {
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '800',
  },
});
