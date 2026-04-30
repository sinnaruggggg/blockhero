import React, {useState, useEffect} from 'react';
import {View, Image} from 'react-native';

const IMG_MAGE_A = require('../assets/sprites/optimized/mage_idle_a.png'); // rows 0-4
const IMG_MAGE_B = require('../assets/sprites/optimized/mage_idle_b.png'); // rows 5-9
const IMG_MAGE_A_BATTLE_LITE = require('../assets/sprites/battle_lite/mage_idle_a.png');
const IMG_MAGE_B_BATTLE_LITE = require('../assets/sprites/battle_lite/mage_idle_b.png');

const FRAME_COLS = 10;
const FRAME_ROWS_PER_SHEET = 5;
const TOTAL_FRAMES = 100;
const PING_PONG_LEN = TOTAL_FRAMES * 2 - 2;
type SpriteAssetProfile = 'normal' | 'battleLite';

const SPRITE_PROFILES: Record<
  SpriteAssetProfile,
  {idleA: any; idleB: any; frameW: number; frameH: number}
> = {
  normal: {
    idleA: IMG_MAGE_A,
    idleB: IMG_MAGE_B,
    frameW: 360,
    frameH: 544,
  },
  battleLite: {
    idleA: IMG_MAGE_A_BATTLE_LITE,
    idleB: IMG_MAGE_B_BATTLE_LITE,
    frameW: 180,
    frameH: 272,
  },
};

export default function MageSprite({
  size = 150,
  assetProfile = 'normal',
}: {
  size?: number;
  assetProfile?: SpriteAssetProfile;
}) {
  const [counter, setCounter] = useState(0);
  const [sheetALoaded, setSheetALoaded] = useState(false);
  const [sheetBLoaded, setSheetBLoaded] = useState(false);
  const spriteProfile = SPRITE_PROFILES[assetProfile];
  const scale = size / spriteProfile.frameW;
  const displayH = Math.round(spriteProfile.frameH * scale);

  useEffect(() => {
    const interval = setInterval(() => {
      setCounter(c => (c + 1) % PING_PONG_LEN);
    }, 67);
    return () => clearInterval(interval);
  }, []);

  // 0→99 재생 후 98→1 역재생 (핑퐁)
  const frame = counter < TOTAL_FRAMES ? counter : PING_PONG_LEN - counter;
  const bothLoaded = sheetALoaded && sheetBLoaded;

  // 각 시트의 sheetFrame 독립 계산
  const sheetFrameA = frame < 50 ? frame : frame - 50;
  const sheetFrameB = frame < 50 ? frame : frame - 50;

  const colA = sheetFrameA % FRAME_COLS;
  const rowA = Math.floor(sheetFrameA / FRAME_COLS);
  const colB = sheetFrameB % FRAME_COLS;
  const rowB = Math.floor(sheetFrameB / FRAME_COLS);

  return (
    <View style={{width: size, height: displayH}}>
      {/* 시트 A — 항상 트리에 존재, frame<50일 때만 보임 */}
      <View style={{
        position: 'absolute', width: size, height: displayH, overflow: 'hidden',
        opacity: (bothLoaded && frame < 50) ? 1 : 0,
      }}>
        <Image
          source={spriteProfile.idleA}
          style={{
            width: spriteProfile.frameW * FRAME_COLS * scale,
            height: spriteProfile.frameH * FRAME_ROWS_PER_SHEET * scale,
            transform: [{translateX: -colA * size}, {translateY: -rowA * displayH}],
          }}
          resizeMode="stretch"
          onLoad={() => setSheetALoaded(true)}
        />
      </View>
      {/* 시트 B — 항상 트리에 존재, frame>=50일 때만 보임 */}
      <View style={{
        position: 'absolute', width: size, height: displayH, overflow: 'hidden',
        opacity: (bothLoaded && frame >= 50) ? 1 : 0,
      }}>
        <Image
          source={spriteProfile.idleB}
          style={{
            width: spriteProfile.frameW * FRAME_COLS * scale,
            height: spriteProfile.frameH * FRAME_ROWS_PER_SHEET * scale,
            transform: [{translateX: -colB * size}, {translateY: -rowB * displayH}],
          }}
          resizeMode="stretch"
          onLoad={() => setSheetBLoaded(true)}
        />
      </View>
      {/* 정적 폴백 — 두 시트 모두 로드될 때까지 표시 */}
    </View>
  );
}
