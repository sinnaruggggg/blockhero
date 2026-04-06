import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import type {PiecePlacementEffectCell} from '../game/piecePlacementEffect';

interface PiecePlacementEffectProps {
  cells: PiecePlacementEffectCell[];
  onDone: () => void;
}

type SparkConfig = PiecePlacementEffectCell & {
  dx: number;
  dy: number;
  size: number;
  rotation: number;
  delay: number;
};

function createSparkConfigs(cells: PiecePlacementEffectCell[]): SparkConfig[] {
  return cells.flatMap(cell => {
    const angles = [-50, -15, 15, 50];
    return angles.map((angle, index) => {
      const radians = (angle * Math.PI) / 180;
      const distance = 8 + index * 2.5;
      return {
        ...cell,
        dx: Math.cos(radians) * distance,
        dy: Math.sin(radians) * distance,
        size: 2 + index * 0.7,
        rotation: angle * 2.4,
        delay: index * 10,
      };
    });
  });
}

export default function PiecePlacementEffect({
  cells,
  onDone,
}: PiecePlacementEffectProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const sparks = useMemo(() => createSparkConfigs(cells), [cells]);

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 140,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(onDone);
  }, [onDone, progress]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {cells.map(cell => (
        <Animated.View
          key={`flash-${cell.id}`}
          style={[
            styles.flash,
            {
              left: cell.x - 8,
              top: cell.y - 8,
              backgroundColor: cell.color,
              opacity: progress.interpolate({
                inputRange: [0, 0.2, 1],
                outputRange: [0.9, 0.7, 0],
              }),
              transform: [
                {
                  scale: progress.interpolate({
                    inputRange: [0, 0.25, 1],
                    outputRange: [0.55, 1, 1.25],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
      {sparks.map((spark, index) => (
        <Animated.View
          key={`spark-${spark.id}-${index}`}
          style={[
            styles.spark,
            {
              width: spark.size,
              height: spark.size * 1.8,
              left: spark.x - spark.size / 2,
              top: spark.y - spark.size / 2,
              backgroundColor: spark.color,
              opacity: progress.interpolate({
                inputRange: [0, 0.15, 1],
                outputRange: [0, 1, 0],
              }),
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, spark.dx],
                  }),
                },
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, spark.dy],
                  }),
                },
                {
                  scale: progress.interpolate({
                    inputRange: [0, 0.3, 1],
                    outputRange: [0.5, 1, 0.1],
                  }),
                },
                {
                  rotate: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${spark.rotation}deg`],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flash: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    shadowColor: '#fff',
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 5,
  },
  spark: {
    position: 'absolute',
    borderRadius: 999,
    shadowColor: '#fff',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
});
