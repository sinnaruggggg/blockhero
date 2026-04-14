import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

const BLOCK_COLORS = [
  'rgba(99, 132, 255, 0.25)',
  'rgba(255, 99, 132, 0.2)',
  'rgba(75, 220, 130, 0.22)',
  'rgba(255, 206, 86, 0.22)',
  'rgba(180, 99, 255, 0.2)',
  'rgba(255, 159, 64, 0.22)',
  'rgba(54, 215, 232, 0.2)',
];

interface BlockData {
  id: number;
  size: number;
  color: string;
  startX: number;
  startY: number;
  duration: number;
  delay: number;
  rotation: number;
}

function generateBlocks(count: number): BlockData[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    size: 12 + Math.random() * 24,
    color: BLOCK_COLORS[index % BLOCK_COLORS.length],
    startX: -40 + Math.random() * W * 0.8,
    startY: -60 - Math.random() * H * 0.5,
    duration: 6000 + Math.random() * 6000,
    delay: Math.random() * 4000,
    rotation: Math.random() * 360,
  }));
}

const BLOCKS = generateBlocks(14);

export default function MenuFloatingBlocks() {
  const anims = useRef(BLOCKS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    BLOCKS.forEach((block, index) => {
      const animate = () => {
        anims[index].setValue(0);
        Animated.timing(anims[index], {
          toValue: 1,
          duration: block.duration,
          delay: block.delay,
          useNativeDriver: true,
        }).start(() => {
          block.delay = 0;
          animate();
        });
      };

      animate();
    });
  }, [anims]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {BLOCKS.map((block, index) => {
        const translateX = anims[index].interpolate({
          inputRange: [0, 1],
          outputRange: [block.startX, block.startX + W * 0.5],
        });
        const translateY = anims[index].interpolate({
          inputRange: [0, 1],
          outputRange: [block.startY, block.startY + H * 1.4],
        });
        const rotate = anims[index].interpolate({
          inputRange: [0, 1],
          outputRange: [`${block.rotation}deg`, `${block.rotation + 180}deg`],
        });
        const opacity = anims[index].interpolate({
          inputRange: [0, 0.1, 0.8, 1],
          outputRange: [0, 1, 1, 0],
        });

        return (
          <Animated.View
            key={block.id}
            style={{
              position: 'absolute',
              width: block.size,
              height: block.size,
              backgroundColor: block.color,
              borderRadius: block.size * 0.2,
              opacity,
              transform: [{ translateX }, { translateY }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
