import React, {useEffect, useRef, useState} from 'react';
import {Image, View} from 'react-native';
import {
  getCachedCharacterVisualTunings,
  KnightVisualTuning,
  loadCharacterVisualTunings,
  subscribeCharacterVisualTunings,
} from '../stores/characterVisualTuning';

const IMG_KNIGHT_IDLE_A = require('../assets/sprites/knight_idle_a.png');
const IMG_KNIGHT_IDLE_B = require('../assets/sprites/knight_idle_b.png');
const IMG_KNIGHT_ATTACK = require('../assets/sprites/knight_attack.png');

const IDLE_FRAME_COLS = 9;
const IDLE_FRAME_ROWS = 5;
const IDLE_TOTAL_FRAMES = 90;
const IDLE_PING_PONG_LEN = IDLE_TOTAL_FRAMES * 2 - 2;
const IDLE_FRAME_W = 700;
const IDLE_FRAME_H = 956;
const IDLE_SHEET_H = IDLE_FRAME_H * IDLE_FRAME_ROWS;

type KnightSpriteProps = {
  size?: number;
  attackPulse?: number;
  facing?: 1 | -1;
  tuningOverride?: KnightVisualTuning;
};

export default function KnightSprite({
  size = 150,
  attackPulse = 0,
  facing = 1,
  tuningOverride,
}: KnightSpriteProps) {
  const [phase, setPhase] = useState<'idle' | 'attack'>('idle');
  const [counter, setCounter] = useState(0);
  const [sheetALoaded, setSheetALoaded] = useState(false);
  const [sheetBLoaded, setSheetBLoaded] = useState(false);
  const [attackSheetLoaded, setAttackSheetLoaded] = useState(false);
  const [savedTuning, setSavedTuning] = useState(
    getCachedCharacterVisualTunings().knight,
  );
  const previousAttackPulse = useRef(attackPulse);
  const tuning = tuningOverride ?? savedTuning;
  const scale = size / IDLE_FRAME_W;
  const displayH = Math.round(IDLE_FRAME_H * scale);

  useEffect(() => {
    if (tuningOverride) {
      return;
    }

    let active = true;
    loadCharacterVisualTunings().then(tuningValue => {
      if (active) {
        setSavedTuning(tuningValue.knight);
      }
    });
    const unsubscribe = subscribeCharacterVisualTunings(tuningValue => {
      if (active) {
        setSavedTuning(tuningValue.knight);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [tuningOverride]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCounter(previous => {
        if (phase === 'attack') {
          return Math.min(previous + 1, tuning.attackTotalFrames - 1);
        }
        return (previous + 1) % IDLE_PING_PONG_LEN;
      });
    }, phase === 'attack' ? tuning.attackFrameMs : 67);

    return () => clearInterval(interval);
  }, [phase, tuning.attackFrameMs, tuning.attackTotalFrames]);

  useEffect(() => {
    if (attackPulse > previousAttackPulse.current) {
      setPhase('attack');
      setCounter(0);
    }
    previousAttackPulse.current = attackPulse;
  }, [attackPulse]);

  useEffect(() => {
    if (phase !== 'attack' || counter < tuning.attackTotalFrames - 1) {
      return;
    }

    const timeout = setTimeout(() => {
      setPhase('idle');
      setCounter(0);
    }, 90);

    return () => clearTimeout(timeout);
  }, [counter, phase, tuning.attackTotalFrames]);

  const idleFrame =
    counter < IDLE_TOTAL_FRAMES ? counter : IDLE_PING_PONG_LEN - counter;
  const bothLoaded = sheetALoaded && sheetBLoaded;
  const idleSheetFrame = idleFrame < 45 ? idleFrame : idleFrame - 45;
  const idleCol = idleSheetFrame % IDLE_FRAME_COLS;
  const idleRow = Math.floor(idleSheetFrame / IDLE_FRAME_COLS);
  const attackCol = counter % tuning.attackFrameCols;
  const attackRow = Math.floor(counter / tuning.attackFrameCols);
  const attackBaseScale = displayH / tuning.attackFrameHeight;
  const attackScale = attackBaseScale * tuning.attackScaleMultiplier;
  const attackDisplayW = Math.round(tuning.attackFrameWidth * attackScale);
  const attackDisplayH = Math.round(tuning.attackFrameHeight * attackScale);
  const attackSheetH = tuning.attackFrameHeight * tuning.attackFrameRows;
  const attackLeft = Math.round((size - attackDisplayW) / 2 + tuning.attackOffsetX);
  const attackBottom = tuning.attackOffsetY;

  return (
    <View
      style={{
        width: size,
        height: displayH,
        overflow: 'visible',
        transform: [{scaleX: facing}],
      }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: displayH,
          overflow: 'hidden',
          opacity: bothLoaded && phase === 'idle' && idleFrame < 45 ? 1 : 0,
        }}>
        <Image
          source={IMG_KNIGHT_IDLE_A}
          style={{
            width: IDLE_FRAME_W * IDLE_FRAME_COLS * scale,
            height: IDLE_SHEET_H * scale,
            transform: [
              {translateX: -idleCol * size},
              {translateY: -idleRow * displayH},
            ],
          }}
          resizeMode="stretch"
          onLoad={() => setSheetALoaded(true)}
        />
      </View>

      <View
        style={{
          position: 'absolute',
          width: size,
          height: displayH,
          overflow: 'hidden',
          opacity: bothLoaded && phase === 'idle' && idleFrame >= 45 ? 1 : 0,
        }}>
        <Image
          source={IMG_KNIGHT_IDLE_B}
          style={{
            width: IDLE_FRAME_W * IDLE_FRAME_COLS * scale,
            height: IDLE_SHEET_H * scale,
            transform: [
              {translateX: -idleCol * size},
              {translateY: -idleRow * displayH},
            ],
          }}
          resizeMode="stretch"
          onLoad={() => setSheetBLoaded(true)}
        />
      </View>

      <View
        style={{
          position: 'absolute',
          left: attackLeft,
          bottom: attackBottom,
          width: attackDisplayW,
          height: attackDisplayH,
          overflow: 'hidden',
          opacity: attackSheetLoaded && phase === 'attack' ? 1 : 0,
        }}>
        <Image
          source={IMG_KNIGHT_ATTACK}
          style={{
            width: tuning.attackFrameWidth * tuning.attackFrameCols * attackScale,
            height: attackSheetH * attackScale,
            transform: [
              {translateX: -attackCol * attackDisplayW},
              {translateY: -attackRow * attackDisplayH},
            ],
          }}
          resizeMode="stretch"
          onLoad={() => setAttackSheetLoaded(true)}
        />
      </View>
    </View>
  );
}
