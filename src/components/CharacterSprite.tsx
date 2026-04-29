import React, {useEffect, useRef, useState} from 'react';
import {Image, View, type ImageSourcePropType} from 'react-native';

type CharacterSpriteSet = {
  idle: ImageSourcePropType;
  attack: ImageSourcePropType;
};

const CHARACTER_SPRITES: Record<string, CharacterSpriteSet> = {
  archer: {
    idle: require('../assets/characters/archer_idle_sheet.png'),
    attack: require('../assets/characters/archer_attack_sheet.png'),
  },
  rogue: {
    idle: require('../assets/characters/rogue_idle_sheet.png'),
    attack: require('../assets/characters/rogue_attack_sheet.png'),
  },
  healer: {
    idle: require('../assets/characters/healer_idle_sheet.png'),
    attack: require('../assets/characters/healer_attack_sheet.png'),
  },
};

const FRAME_SIZE = 512;
const FRAME_COUNT = 10;
const IDLE_PING_PONG_COUNT = FRAME_COUNT * 2 - 2;

type CharacterSpriteProps = {
  characterId: string;
  size?: number;
  attackPulse?: number;
  facing?: 1 | -1;
};

export default function CharacterSprite({
  characterId,
  size = 120,
  attackPulse = 0,
  facing = 1,
}: CharacterSpriteProps) {
  const [pose, setPose] = useState<'idle' | 'attack'>('idle');
  const [frame, setFrame] = useState(0);
  const previousAttackPulse = useRef(attackPulse);
  const spriteSet = CHARACTER_SPRITES[characterId] ?? CHARACTER_SPRITES.archer;

  useEffect(() => {
    if (attackPulse <= previousAttackPulse.current) {
      previousAttackPulse.current = attackPulse;
      return;
    }

    previousAttackPulse.current = attackPulse;
    setPose('attack');
    setFrame(0);
  }, [attackPulse]);

  useEffect(() => {
    const frameMs = pose === 'attack' ? 58 : 92;
    const interval = setInterval(() => {
      setFrame(previous => {
        if (pose === 'attack') {
          if (previous >= FRAME_COUNT - 1) {
            setPose('idle');
            return 0;
          }
          return previous + 1;
        }
        return (previous + 1) % IDLE_PING_PONG_COUNT;
      });
    }, frameMs);

    return () => clearInterval(interval);
  }, [pose]);

  const scale = size / FRAME_SIZE;
  const sheetFrame =
    pose === 'idle' && frame >= FRAME_COUNT
      ? IDLE_PING_PONG_COUNT - frame
      : frame;

  return (
    <View
      style={{
        width: size,
        height: size,
        overflow: 'hidden',
        transform: [{scaleX: facing}],
      }}>
      <Image
        source={spriteSet[pose]}
        resizeMode="stretch"
        fadeDuration={0}
        style={{
          width: FRAME_SIZE * FRAME_COUNT * scale,
          height: FRAME_SIZE * scale,
          transform: [{translateX: -sheetFrame * size}],
        }}
      />
    </View>
  );
}
