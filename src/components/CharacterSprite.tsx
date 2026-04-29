import React, {useEffect, useRef, useState} from 'react';
import {
  Image,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

type CharacterSpriteSet = {
  idle: ImageSourcePropType;
  attack: ImageSourcePropType;
};

const CHARACTER_SPRITES: Record<string, CharacterSpriteSet> = {
  knight: {
    idle: require('../assets/characters/knight_idle.png'),
    attack: require('../assets/characters/knight_attack.png'),
  },
  mage: {
    idle: require('../assets/characters/mage_idle.png'),
    attack: require('../assets/characters/mage_attack.png'),
  },
  archer: {
    idle: require('../assets/characters/archer_idle.png'),
    attack: require('../assets/characters/archer_attack.png'),
  },
  rogue: {
    idle: require('../assets/characters/rogue_idle.png'),
    attack: require('../assets/characters/rogue_attack.png'),
  },
  healer: {
    idle: require('../assets/characters/healer_idle.png'),
    attack: require('../assets/characters/healer_attack.png'),
  },
};

type CharacterSpriteProps = {
  characterId: string;
  size?: number;
  attackPulse?: number;
  facing?: 1 | -1;
  style?: StyleProp<ImageStyle>;
};

export default function CharacterSprite({
  characterId,
  size = 120,
  attackPulse = 0,
  facing = 1,
  style,
}: CharacterSpriteProps) {
  const [pose, setPose] = useState<'idle' | 'attack'>('idle');
  const previousAttackPulse = useRef(attackPulse);
  const spriteSet = CHARACTER_SPRITES[characterId] ?? CHARACTER_SPRITES.knight;

  useEffect(() => {
    if (attackPulse <= previousAttackPulse.current) {
      previousAttackPulse.current = attackPulse;
      return;
    }

    previousAttackPulse.current = attackPulse;
    setPose('attack');
    const timeout = setTimeout(() => setPose('idle'), 360);
    return () => clearTimeout(timeout);
  }, [attackPulse]);

  return (
    <Image
      source={spriteSet[pose]}
      resizeMode="contain"
      fadeDuration={0}
      style={[
        {
          width: size,
          height: size,
          transform: [{scaleX: facing}],
        },
        style,
      ]}
    />
  );
}
