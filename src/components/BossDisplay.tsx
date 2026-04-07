import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
} from 'react-native';
import {t} from '../i18n';
import FloatingDamageLabel from './FloatingDamageLabel';
import {
  getMonsterPoseSource,
  getRaidBossSpriteSet,
  MonsterSpritePose,
} from '../assets/monsterSprites';
import {getLatestFloatingDamageHit, type FloatingDamageHit} from '../game/floatingDamage';

const HIT_FRAMES = [
  require('../assets/effects/hit_00.png'),
  require('../assets/effects/hit_01.png'),
  require('../assets/effects/hit_02.png'),
  require('../assets/effects/hit_03.png'),
  require('../assets/effects/hit_04.png'),
  require('../assets/effects/hit_05.png'),
  require('../assets/effects/hit_06.png'),
  require('../assets/effects/hit_07.png'),
  require('../assets/effects/hit_08.png'),
  require('../assets/effects/hit_09.png'),
  require('../assets/effects/hit_10.png'),
  require('../assets/effects/hit_11.png'),
  require('../assets/effects/hit_12.png'),
  require('../assets/effects/hit_13.png'),
];

function HitEffect({damage, onDone}: {damage: number; onDone: () => void}) {
  const [frame, setFrame] = useState(0);
  const scale = Math.min(2.5, 1 + Math.floor(damage / 10) * 0.1);
  const size = 120 * scale;
  const rotation = useRef(Math.floor(Math.random() * 4) * 90).current;
  const flipX = useRef(Math.random() > 0.5).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(previous => {
        if (previous >= HIT_FRAMES.length - 1) {
          clearInterval(interval);
          onDone();
          return previous;
        }

        return previous + 1;
      });
    }, 20);

    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <Image
      source={HIT_FRAMES[frame]}
      resizeMode="contain"
      style={[
        styles.hitEffect,
        {
          width: size,
          height: size,
          top: -(size - 88) / 2,
          left: -(size - 88) / 2,
          transform: [{rotate: `${rotation}deg`}, {scaleX: flipX ? -1 : 1}],
        },
      ]}
    />
  );
}

export interface ParticipantSlot {
  rank: number;
  nickname: string;
  totalDamage: number;
}

interface BossDisplayProps {
  bossName: string;
  bossEmoji: string;
  bossColor: string;
  currentHp: number;
  maxHp: number;
  stage: number;
  participants?: ParticipantSlot[];
  expandedStandings?: boolean;
  onToggleStandings?: () => void;
  damageHits?: FloatingDamageHit[];
  activeDamageHit?: FloatingDamageHit | null;
  onClearActiveDamageHit?: (hitId: number) => void;
  overlay?: React.ReactNode;
  bossPose?: MonsterSpritePose;
  playerOverlay?: React.ReactNode;
}

function formatDamage(damage: number): string {
  if (damage >= 1000000) {
    return `${(damage / 1000000).toFixed(1)}M`;
  }

  if (damage >= 1000) {
    return `${(damage / 1000).toFixed(1)}K`;
  }

  return damage.toString();
}

function formatHp(hp: number): string {
  if (hp >= 1000000) {
    return `${(hp / 1000000).toFixed(1)}M`;
  }

  if (hp >= 1000) {
    return `${(hp / 1000).toFixed(1)}K`;
  }

  return hp.toString();
}

export default function BossDisplay({
  bossName,
  bossEmoji,
  bossColor,
  currentHp,
  maxHp,
  stage,
  participants = [],
  expandedStandings = false,
  onToggleStandings,
  damageHits = [],
  activeDamageHit = null,
  onClearActiveDamageHit,
  overlay,
  bossPose = 'idle',
  playerOverlay,
}: BossDisplayProps) {
  const hpAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const visibleParticipants = participants.slice(0, expandedStandings ? 30 : 10);
  const latestDamageHit = getLatestFloatingDamageHit(damageHits);

  useEffect(() => {
    Animated.timing(hpAnim, {
      toValue: Math.max(0, currentHp / Math.max(1, maxHp)),
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [currentHp, hpAnim, maxHp]);

  useEffect(() => {
    if (!latestDamageHit) {
      return;
    }

    Animated.sequence([
      Animated.timing(shakeAnim, {toValue: 8, duration: 40, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: -8, duration: 40, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: 5, duration: 40, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: -5, duration: 40, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: 0, duration: 40, useNativeDriver: true}),
    ]).start();
  }, [latestDamageHit, shakeAnim]);

  const hpPercent = Math.max(0, (currentHp / Math.max(1, maxHp)) * 100);
  const hpColor = hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#f59e0b' : '#ef4444';
  const bossSpriteSet = getRaidBossSpriteSet(stage);
  const bossSprite =
    getMonsterPoseSource(bossSpriteSet, bossPose) ??
    getMonsterPoseSource(bossSpriteSet, 'idle');

  return (
    <View style={styles.container}>
      <Text style={styles.stageText}>{t('raid.stage', stage)}</Text>

      <View style={styles.contentRow}>
        <Animated.View style={[styles.bossArea, {transform: [{translateX: shakeAnim}]}]}>
          <View
            style={[
              styles.bossCircle,
              {shadowColor: bossColor},
            ]}>
            {bossSprite ? (
              <Image
                source={bossSprite}
                resizeMode="contain"
                fadeDuration={0}
                style={[
                  styles.bossSprite,
                  {transform: [{scaleX: -(bossSpriteSet?.facing ?? 1)}]},
                ]}
              />
            ) : (
              <Text style={styles.bossEmoji}>{bossEmoji}</Text>
            )}
            {activeDamageHit && activeDamageHit.damage >= 10 && (
              <HitEffect
                key={`boss-hit-${activeDamageHit.id}`}
                damage={activeDamageHit.damage}
                onDone={() => onClearActiveDamageHit?.(activeDamageHit.id)}
              />
            )}
            <View pointerEvents="none" style={styles.damageHost}>
              {damageHits
                .slice()
                .reverse()
                .map((hit, index) => (
                  <FloatingDamageLabel
                    key={`boss-damage-${hit.id}`}
                    damage={hit.damage}
                    stackIndex={index}
                    baseTop={8}
                    stackGap={22}
                  />
                ))}
            </View>
          </View>
          {playerOverlay ? <View style={styles.playerOverlayHost}>{playerOverlay}</View> : null}
          {overlay ? <View style={styles.overlayHost}>{overlay}</View> : null}
          <Text style={[styles.bossName, {color: bossColor}]}>{bossName}</Text>
          <View style={styles.hpContainer}>
            <View style={styles.hpBarBg}>
              <Animated.View
                style={[
                  styles.hpBarFill,
                  {
                    backgroundColor: hpColor,
                    width: hpAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.hpText}>
              {formatHp(currentHp)} / {formatHp(maxHp)}
            </Text>
          </View>
        </Animated.View>

        <View style={styles.standingsPanel}>
          <View style={styles.standingsHeader}>
            <Text style={styles.standingsTitle}>레이드 순위</Text>
            {participants.length > 10 && onToggleStandings && (
              <TouchableOpacity onPress={onToggleStandings}>
                <Text style={styles.toggleText}>
                  {expandedStandings ? '상위 10명' : '30명 보기'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {visibleParticipants.length === 0 ? (
            <Text style={styles.emptyStandings}>집계 중</Text>
          ) : (
            visibleParticipants.map(participant => (
              <View
                key={`${participant.rank}-${participant.nickname}`}
                style={styles.standingRow}>
                <Text style={styles.standingRank}>#{participant.rank}</Text>
                <Text style={styles.standingName} numberOfLines={1}>
                  {participant.nickname}
                </Text>
                <Text style={styles.standingDamage}>
                  {formatDamage(participant.totalDamage)}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingTop: 2,
    paddingBottom: 2,
  },
  stageText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'stretch',
  },
  bossArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 7,
    overflow: 'visible',
  },
  bossCircle: {
    width: 68,
    height: 68,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  bossEmoji: {
    fontSize: 28,
  },
  bossSprite: {
    width: 62,
    height: 62,
  },
  bossName: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
  },
  hpContainer: {
    width: '100%',
    marginTop: 5,
  },
  hpBarBg: {
    height: 8,
    backgroundColor: '#111827',
    borderRadius: 999,
    overflow: 'hidden',
  },
  hpBarFill: {
    height: 8,
    borderRadius: 999,
  },
  hpText: {
    color: '#e2e8f0',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  standingsPanel: {
    width: 116,
    backgroundColor: 'rgba(15, 10, 46, 0.55)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  standingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  standingsTitle: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '800',
  },
  toggleText: {
    color: '#93c5fd',
    fontSize: 9,
    fontWeight: '700',
  },
  emptyStandings: {
    color: '#94a3b8',
    fontSize: 9,
    textAlign: 'center',
    paddingVertical: 12,
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  standingRank: {
    color: '#fbbf24',
    fontSize: 9,
    fontWeight: '800',
    width: 20,
  },
  standingName: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 9,
    fontWeight: '700',
  },
  standingDamage: {
    color: '#f87171',
    fontSize: 8,
    fontWeight: '800',
  },
  overlayHost: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
  playerOverlayHost: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
  hitEffect: {
    position: 'absolute',
  },
  damageHost: {
    position: 'absolute',
    top: -18,
    left: -26,
    right: -26,
    bottom: -12,
    alignItems: 'center',
    overflow: 'visible',
    zIndex: 14,
  },
});
