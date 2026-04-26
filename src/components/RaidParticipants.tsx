import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';

export interface RaidParticipant {
  playerId: string;
  nickname: string;
  totalDamage: number;
  rank: number;
  // RAID_FIX: raid member rendering can now share the same participant shape
  // across lobby, battle, spectator and result views.
  avatarIcon?: string;
  role?: string;
  isHost?: boolean;
  isReady?: boolean;
  isAlive?: boolean;
  currentHp?: number;
  maxHp?: number;
  joinedAt?: string;
}

interface RaidParticipantsProps {
  participants: RaidParticipant[];
  myPlayerId: string;
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function formatDamage(damage: number): string {
  if (damage >= 1000000) return `${(damage / 1000000).toFixed(1)}M`;
  if (damage >= 1000) return `${(damage / 1000).toFixed(1)}K`;
  return damage.toString();
}

function formatHp(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

export default function RaidParticipants({
  participants,
  myPlayerId,
}: RaidParticipantsProps) {
  if (participants.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {participants.map((participant, index) => {
          const isMe = participant.playerId === myPlayerId;
          const medal = index < 3 ? RANK_MEDALS[index] : `${index + 1}`;
          const isAlive = participant.isAlive !== false;
          const maxHp = Math.max(1, participant.maxHp ?? 0);
          const currentHp = Math.max(
            0,
            participant.currentHp ?? (maxHp > 1 ? maxHp : 0),
          );
          const hpPercent = Math.max(
            0,
            Math.min(100, (currentHp / maxHp) * 100),
          );
          return (
            <View key={participant.playerId} style={[styles.card, isMe && styles.cardMe]}>
              <View style={styles.memberTopRow}>
                <Text style={styles.rank}>{medal}</Text>
                <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
                  {participant.nickname}
                </Text>
                <Text
                  style={[
                    styles.aliveState,
                    !isAlive && styles.aliveStateDead,
                  ]}
                >
                  {isAlive ? 'HP' : '☠'}
                </Text>
              </View>
              <View style={styles.memberBottomRow}>
                <View style={styles.hpTrack}>
                  <View
                    style={[
                      styles.hpFill,
                      !isAlive && styles.hpFillDead,
                      { width: `${hpPercent}%` },
                    ]}
                  />
                </View>
                <Text style={[styles.hpText, !isAlive && styles.hpTextDead]}>
                  {isAlive
                    ? `${formatHp(currentHp)} / ${formatHp(maxHp)}`
                    : 'DEAD'}
                </Text>
              </View>
              <Text style={[styles.damage, isMe && styles.damageMe]}>
                DMG {formatDamage(participant.totalDamage)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(15, 10, 46, 0.8)',
    paddingVertical: 4,
  },
  scrollContent: {
    paddingHorizontal: 8,
    gap: 6,
  },
  card: {
    width: 116,
    backgroundColor: 'rgba(30, 27, 75, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardMe: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  rank: {
    fontSize: 12,
    minWidth: 18,
    textAlign: 'center',
  },
  memberTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  nameMe: {
    color: '#a5b4fc',
  },
  aliveState: {
    color: '#86efac',
    fontSize: 9,
    fontWeight: '900',
    minWidth: 18,
    textAlign: 'right',
  },
  aliveStateDead: {
    color: '#fca5a5',
    fontSize: 12,
  },
  memberBottomRow: {
    gap: 2,
  },
  hpTrack: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,23,42,0.92)',
  },
  hpFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
  hpFillDead: {
    backgroundColor: '#64748b',
  },
  hpText: {
    color: '#cbd5e1',
    fontSize: 8,
    fontWeight: '800',
  },
  hpTextDead: {
    color: '#fca5a5',
  },
  damage: {
    color: '#f87171',
    fontSize: 9,
    fontWeight: '800',
  },
  damageMe: {
    color: '#fbbf24',
  },
});
