import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import type { PiecePlacementEffectCell } from '../game/piecePlacementEffect';

export type BoardSkillCastEffectEvent = {
  id: number;
  type: 'block_summon' | 'magic_transform';
  cells: PiecePlacementEffectCell[];
};

interface BoardSkillCastEffectProps {
  events: BoardSkillCastEffectEvent[];
  onDone: () => void;
}

export default function BoardSkillCastEffect({
  events,
  onDone,
}: BoardSkillCastEffectProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(onDone);
  }, [onDone, progress]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {events.map(event =>
        event.type === 'block_summon'
          ? event.cells.map(cell => (
              <React.Fragment key={`${event.id}-${cell.id}`}>
                <Animated.View
                  style={[
                    styles.summonPulse,
                    {
                      left: cell.x - 18,
                      top: cell.y - 18,
                      borderColor: cell.color,
                      opacity: progress.interpolate({
                        inputRange: [0, 0.25, 1],
                        outputRange: [0, 0.9, 0],
                      }),
                      transform: [
                        {
                          scale: progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.25, 1.15],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.summonFlash,
                    {
                      left: cell.x - 8,
                      top: cell.y - 8,
                      backgroundColor: cell.color,
                      opacity: progress.interpolate({
                        inputRange: [0, 0.2, 1],
                        outputRange: [0.25, 0.9, 0],
                      }),
                      transform: [
                        {
                          scale: progress.interpolate({
                            inputRange: [0, 0.35, 1],
                            outputRange: [0.4, 1, 1.2],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </React.Fragment>
            ))
          : event.cells.map(cell => (
              <React.Fragment key={`${event.id}-${cell.id}`}>
                <Animated.View
                  style={[
                    styles.manaDrop,
                    {
                      left: cell.x - 7,
                      top: cell.y - 64,
                      backgroundColor: cell.color,
                      opacity: progress.interpolate({
                        inputRange: [0, 0.8, 1],
                        outputRange: [0, 0.95, 0],
                      }),
                      transform: [
                        {
                          translateY: progress.interpolate({
                            inputRange: [0, 0.82, 1],
                            outputRange: [-72, 0, 4],
                          }),
                        },
                        {
                          scale: progress.interpolate({
                            inputRange: [0, 0.2, 0.82, 1],
                            outputRange: [0.3, 1, 1, 0.7],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.impactFlash,
                    {
                      left: cell.x - 16,
                      top: cell.y - 16,
                      backgroundColor: cell.color,
                      opacity: progress.interpolate({
                        inputRange: [0, 0.72, 0.86, 1],
                        outputRange: [0, 0, 0.9, 0],
                      }),
                      transform: [
                        {
                          scale: progress.interpolate({
                            inputRange: [0, 0.72, 1],
                            outputRange: [0.2, 0.2, 1.2],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </React.Fragment>
            )),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  summonPulse: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    shadowColor: '#ffffff',
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  summonFlash: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    shadowColor: '#ffffff',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  manaDrop: {
    position: 'absolute',
    width: 14,
    height: 28,
    borderRadius: 9,
    shadowColor: '#d8b4fe',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  impactFlash: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    shadowColor: '#ffffff',
    shadowOpacity: 0.38,
    shadowRadius: 8,
    elevation: 5,
  },
});
