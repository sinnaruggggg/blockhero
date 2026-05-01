import React, {useEffect, useRef, useState} from 'react';
import {Image, View, type ImageSourcePropType} from 'react-native';

type CharacterSpriteSet = {
  idle?: ImageSourcePropType;
  attack?: ImageSourcePropType;
  idleFrames?: ImageSourcePropType[];
  attackFrames?: ImageSourcePropType[];
  idleSheetChunks?: ImageSourcePropType[];
  attackSheetChunks?: ImageSourcePropType[];
  idleColumns?: number;
  idleFrameCount?: number;
  idleFrameWidth?: number;
  idleFrameHeight?: number;
  idlePingPong?: boolean;
  idleFramesPerChunk?: number;
  idleFrameMs?: number;
  attackColumns?: number;
  attackFrameCount?: number;
  attackFrameWidth?: number;
  attackFrameHeight?: number;
  attackFramesPerChunk?: number;
};

type CharacterAssetProfile = 'normal' | 'battleLite' | 'lobbyHd';

const ARCHER_LOBBY_IDLE_CHUNKS: ImageSourcePropType[] = [
  require('../assets/characters/lobby_hd_frames/archer/idle_chunks/00.png'),
  require('../assets/characters/lobby_hd_frames/archer/idle_chunks/01.png'),
  require('../assets/characters/lobby_hd_frames/archer/idle_chunks/02.png'),
  require('../assets/characters/lobby_hd_frames/archer/idle_chunks/03.png'),
  require('../assets/characters/lobby_hd_frames/archer/idle_chunks/04.png'),
];

const ARCHER_BATTLE_IDLE_CHUNKS: ImageSourcePropType[] = [
  require('../assets/characters/battle_lite_styled/archer_idle_chunks/00.png'),
  require('../assets/characters/battle_lite_styled/archer_idle_chunks/01.png'),
  require('../assets/characters/battle_lite_styled/archer_idle_chunks/02.png'),
  require('../assets/characters/battle_lite_styled/archer_idle_chunks/03.png'),
  require('../assets/characters/battle_lite_styled/archer_idle_chunks/04.png'),
];

const HEALER_LOBBY_IDLE_CHUNKS: ImageSourcePropType[] = [
  require('../assets/characters/lobby_hd_frames/healer/idle_chunks/00.png'),
  require('../assets/characters/lobby_hd_frames/healer/idle_chunks/01.png'),
  require('../assets/characters/lobby_hd_frames/healer/idle_chunks/02.png'),
  require('../assets/characters/lobby_hd_frames/healer/idle_chunks/03.png'),
  require('../assets/characters/lobby_hd_frames/healer/idle_chunks/04.png'),
  require('../assets/characters/lobby_hd_frames/healer/idle_chunks/05.png'),
  require('../assets/characters/lobby_hd_frames/healer/idle_chunks/06.png'),
  require('../assets/characters/lobby_hd_frames/healer/idle_chunks/07.png'),
  require('../assets/characters/lobby_hd_frames/healer/idle_chunks/08.png'),
  require('../assets/characters/lobby_hd_frames/healer/idle_chunks/09.png'),
];

const HEALER_BATTLE_IDLE_CHUNKS: ImageSourcePropType[] = [
  require('../assets/characters/battle_lite_styled/healer_idle_chunks/00.png'),
  require('../assets/characters/battle_lite_styled/healer_idle_chunks/01.png'),
  require('../assets/characters/battle_lite_styled/healer_idle_chunks/02.png'),
  require('../assets/characters/battle_lite_styled/healer_idle_chunks/03.png'),
  require('../assets/characters/battle_lite_styled/healer_idle_chunks/04.png'),
  require('../assets/characters/battle_lite_styled/healer_idle_chunks/05.png'),
  require('../assets/characters/battle_lite_styled/healer_idle_chunks/06.png'),
  require('../assets/characters/battle_lite_styled/healer_idle_chunks/07.png'),
  require('../assets/characters/battle_lite_styled/healer_idle_chunks/08.png'),
  require('../assets/characters/battle_lite_styled/healer_idle_chunks/09.png'),
];

const CHARACTER_SPRITE_PROFILES: Record<
  CharacterAssetProfile,
  {frameSize: number; sprites: Record<string, CharacterSpriteSet>}
> = {
  normal: {
    frameSize: 512,
    sprites: {
      archer: {
        idleSheetChunks: ARCHER_LOBBY_IDLE_CHUNKS,
        idleColumns: 4,
        idleFrameCount: 70,
        idleFramesPerChunk: 16,
        idleFrameWidth: 504,
        idleFrameHeight: 653,
        idleFrameMs: 67,
        attack: require('../assets/characters/styled/archer_attack_sheet.png'),
      },
      rogue: {
        idle: require('../assets/characters/styled/rogue_idle_sheet.png'),
        attack: require('../assets/characters/styled/rogue_attack_sheet.png'),
      },
      healer: {
        idleSheetChunks: HEALER_LOBBY_IDLE_CHUNKS,
        idleColumns: 4,
        idleFrameCount: 156,
        idleFramesPerChunk: 16,
        idleFrameWidth: 476,
        idleFrameHeight: 554,
        idlePingPong: true,
        idleFrameMs: 67,
        attack: require('../assets/characters/styled/healer_attack_sheet.png'),
      },
    },
  },
  lobbyHd: {
    frameSize: 1024,
    sprites: {
      archer: {
        idleSheetChunks: ARCHER_LOBBY_IDLE_CHUNKS,
        idleColumns: 4,
        idleFrameCount: 70,
        idleFramesPerChunk: 16,
        idleFrameWidth: 504,
        idleFrameHeight: 653,
        idleFrameMs: 67,
        attackFrames: [
          require('../assets/characters/lobby_hd_frames/archer/attack/00.png'),
          require('../assets/characters/lobby_hd_frames/archer/attack/01.png'),
          require('../assets/characters/lobby_hd_frames/archer/attack/02.png'),
          require('../assets/characters/lobby_hd_frames/archer/attack/03.png'),
          require('../assets/characters/lobby_hd_frames/archer/attack/04.png'),
          require('../assets/characters/lobby_hd_frames/archer/attack/05.png'),
          require('../assets/characters/lobby_hd_frames/archer/attack/06.png'),
          require('../assets/characters/lobby_hd_frames/archer/attack/07.png'),
          require('../assets/characters/lobby_hd_frames/archer/attack/08.png'),
          require('../assets/characters/lobby_hd_frames/archer/attack/09.png'),
        ],
      },
      rogue: {
        idleFrames: [
          require('../assets/characters/lobby_hd_frames/rogue/idle/00.png'),
          require('../assets/characters/lobby_hd_frames/rogue/idle/01.png'),
          require('../assets/characters/lobby_hd_frames/rogue/idle/02.png'),
          require('../assets/characters/lobby_hd_frames/rogue/idle/03.png'),
          require('../assets/characters/lobby_hd_frames/rogue/idle/04.png'),
          require('../assets/characters/lobby_hd_frames/rogue/idle/05.png'),
          require('../assets/characters/lobby_hd_frames/rogue/idle/06.png'),
          require('../assets/characters/lobby_hd_frames/rogue/idle/07.png'),
          require('../assets/characters/lobby_hd_frames/rogue/idle/08.png'),
          require('../assets/characters/lobby_hd_frames/rogue/idle/09.png'),
        ],
        attackFrames: [
          require('../assets/characters/lobby_hd_frames/rogue/attack/00.png'),
          require('../assets/characters/lobby_hd_frames/rogue/attack/01.png'),
          require('../assets/characters/lobby_hd_frames/rogue/attack/02.png'),
          require('../assets/characters/lobby_hd_frames/rogue/attack/03.png'),
          require('../assets/characters/lobby_hd_frames/rogue/attack/04.png'),
          require('../assets/characters/lobby_hd_frames/rogue/attack/05.png'),
          require('../assets/characters/lobby_hd_frames/rogue/attack/06.png'),
          require('../assets/characters/lobby_hd_frames/rogue/attack/07.png'),
          require('../assets/characters/lobby_hd_frames/rogue/attack/08.png'),
          require('../assets/characters/lobby_hd_frames/rogue/attack/09.png'),
        ],
      },
      healer: {
        idleSheetChunks: HEALER_LOBBY_IDLE_CHUNKS,
        idleColumns: 4,
        idleFrameCount: 156,
        idleFramesPerChunk: 16,
        idleFrameWidth: 476,
        idleFrameHeight: 554,
        idlePingPong: true,
        idleFrameMs: 67,
        attackFrames: [
          require('../assets/characters/lobby_hd_frames/healer/attack/00.png'),
          require('../assets/characters/lobby_hd_frames/healer/attack/01.png'),
          require('../assets/characters/lobby_hd_frames/healer/attack/02.png'),
          require('../assets/characters/lobby_hd_frames/healer/attack/03.png'),
          require('../assets/characters/lobby_hd_frames/healer/attack/04.png'),
          require('../assets/characters/lobby_hd_frames/healer/attack/05.png'),
          require('../assets/characters/lobby_hd_frames/healer/attack/06.png'),
          require('../assets/characters/lobby_hd_frames/healer/attack/07.png'),
          require('../assets/characters/lobby_hd_frames/healer/attack/08.png'),
          require('../assets/characters/lobby_hd_frames/healer/attack/09.png'),
        ],
      },
    },
  },
  battleLite: {
    frameSize: 256,
    sprites: {
      archer: {
        idleSheetChunks: ARCHER_BATTLE_IDLE_CHUNKS,
        idleColumns: 4,
        idleFrameCount: 70,
        idleFramesPerChunk: 16,
        idleFrameWidth: 198,
        idleFrameHeight: 256,
        idleFrameMs: 67,
        attack: require('../assets/characters/battle_lite_styled/archer_attack_sheet.png'),
      },
      rogue: {
        idle: require('../assets/characters/battle_lite_styled/rogue_idle_sheet.png'),
        attack: require('../assets/characters/battle_lite_styled/rogue_attack_sheet.png'),
      },
      healer: {
        idleSheetChunks: HEALER_BATTLE_IDLE_CHUNKS,
        idleColumns: 4,
        idleFrameCount: 156,
        idleFramesPerChunk: 16,
        idleFrameWidth: 220,
        idleFrameHeight: 256,
        idlePingPong: true,
        idleFrameMs: 67,
        attack: require('../assets/characters/battle_lite_styled/healer_attack_sheet.png'),
      },
    },
  },
};

const FRAME_COUNT = 10;
const IDLE_PING_PONG_COUNT = FRAME_COUNT * 2 - 2;

type CharacterSpriteProps = {
  characterId: string;
  size?: number;
  attackPulse?: number;
  facing?: 1 | -1;
  assetProfile?: CharacterAssetProfile;
  attackScaleMultiplier?: number;
  attackOffsetX?: number;
  attackOffsetY?: number;
};

export default function CharacterSprite({
  characterId,
  size = 120,
  attackPulse = 0,
  facing = 1,
  assetProfile = 'normal',
  attackScaleMultiplier = 1,
  attackOffsetX = 0,
  attackOffsetY = 0,
}: CharacterSpriteProps) {
  const [pose, setPose] = useState<'idle' | 'attack'>('idle');
  const [frame, setFrame] = useState(0);
  const previousAttackPulse = useRef(attackPulse);
  const spriteProfile = CHARACTER_SPRITE_PROFILES[assetProfile];
  const spriteSet =
    spriteProfile.sprites[characterId] ?? spriteProfile.sprites.archer;
  const frameSources =
    pose === 'idle' ? spriteSet.idleFrames : spriteSet.attackFrames;
  const sheetChunkSources =
    pose === 'idle' ? spriteSet.idleSheetChunks : spriteSet.attackSheetChunks;
  const frameCount = Math.max(
    frameSources?.length ??
      (pose === 'idle'
        ? spriteSet.idleFrameCount
        : spriteSet.attackFrameCount) ??
      FRAME_COUNT,
    1,
  );
  const shouldPingPongIdle = spriteSet.idlePingPong !== false;
  const idleCycleFrameCount = shouldPingPongIdle
    ? Math.max(frameCount * 2 - 2, 1)
    : frameCount;

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
    const frameMs = pose === 'attack' ? 58 : spriteSet.idleFrameMs ?? 92;
    const interval = setInterval(() => {
      setFrame(previous => {
        if (pose === 'attack') {
          if (previous >= frameCount - 1) {
            setPose('idle');
            return 0;
          }
          return previous + 1;
        }
        return (previous + 1) % idleCycleFrameCount;
      });
    }, frameMs);

    return () => clearInterval(interval);
  }, [frameCount, idleCycleFrameCount, pose, spriteSet.idleFrameMs]);

  const sourceFrameWidth =
    pose === 'idle'
      ? spriteSet.idleFrameWidth ?? spriteProfile.frameSize
      : spriteSet.attackFrameWidth ?? spriteProfile.frameSize;
  const sourceFrameHeight =
    pose === 'idle'
      ? spriteSet.idleFrameHeight ?? spriteProfile.frameSize
      : spriteSet.attackFrameHeight ?? spriteProfile.frameSize;
  const scale = size / sourceFrameHeight;
  const renderedFrameWidth = sourceFrameWidth * scale;
  const renderedFrameHeight = sourceFrameHeight * scale;
  const sheetFrame =
    pose === 'idle' && shouldPingPongIdle && frame >= frameCount
      ? idleCycleFrameCount - frame
      : frame;
  const frameSource = frameSources?.[sheetFrame % frameCount];
  const renderSpriteFrame = (content: React.ReactNode) => (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{scaleX: facing}],
      }}>
      <View
        style={
          pose === 'attack'
            ? {
                transform: [
                  {translateX: attackOffsetX},
                  {translateY: attackOffsetY},
                  {scale: attackScaleMultiplier},
                ],
              }
            : undefined
        }>
        {content}
      </View>
    </View>
  );

  if (frameSource) {
    return renderSpriteFrame(
        <Image
          source={frameSource}
          resizeMode="stretch"
          fadeDuration={0}
          style={{width: renderedFrameWidth, height: renderedFrameHeight}}
        />
    );
  }

  const sheetColumns =
    pose === 'idle'
      ? spriteSet.idleColumns ?? frameCount
      : spriteSet.attackColumns ?? frameCount;
  const framesPerChunk =
    pose === 'idle'
      ? spriteSet.idleFramesPerChunk ?? sheetColumns
      : spriteSet.attackFramesPerChunk ?? sheetColumns;

  if (sheetChunkSources?.length) {
    const activeChunkIndex = Math.min(
      Math.floor(sheetFrame / framesPerChunk),
      sheetChunkSources.length - 1,
    );
    const localFrame = sheetFrame % framesPerChunk;
    const chunkRows = Math.max(Math.ceil(framesPerChunk / sheetColumns), 1);
    const chunkColumn = localFrame % sheetColumns;
    const chunkRow = Math.floor(localFrame / sheetColumns);

    return renderSpriteFrame(
        <View
          style={{
            width: renderedFrameWidth,
            height: renderedFrameHeight,
            overflow: 'hidden',
          }}>
          {sheetChunkSources.map((chunkSource, chunkIndex) => (
            <Image
              key={chunkIndex}
              source={chunkSource}
              resizeMode="stretch"
              fadeDuration={0}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                opacity: chunkIndex === activeChunkIndex ? 1 : 0,
                width: sourceFrameWidth * sheetColumns * scale,
                height: sourceFrameHeight * chunkRows * scale,
                transform: [
                  {translateX: -chunkColumn * renderedFrameWidth},
                  {translateY: -chunkRow * renderedFrameHeight},
                ],
              }}
            />
          ))}
        </View>
    );
  }

  const sheetSource = spriteSet[pose];
  if (!sheetSource) {
    return null;
  }
  const sheetRows = Math.max(Math.ceil(frameCount / sheetColumns), 1);
  const sheetColumn = sheetFrame % sheetColumns;
  const sheetRow = Math.floor(sheetFrame / sheetColumns);

  return renderSpriteFrame(
      <View
        style={{
          width: renderedFrameWidth,
          height: renderedFrameHeight,
          overflow: 'hidden',
        }}>
        <Image
          source={sheetSource}
          resizeMode="stretch"
          fadeDuration={0}
          style={{
            width: sourceFrameWidth * sheetColumns * scale,
            height: sourceFrameHeight * sheetRows * scale,
            transform: [
              {translateX: -sheetColumn * renderedFrameWidth},
              {translateY: -sheetRow * renderedFrameHeight},
            ],
          }}
        />
      </View>
  );
}
