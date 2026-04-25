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
          return (
            <View key={participant.playerId} style={[styles.card, isMe && styles.cardMe]}>
              <Text style={styles.rank}>{medal}</Text>
              <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
                {participant.nickname}
              </Text>
              <Text style={[styles.damage, isMe && styles.damageMe]}>
                {formatDamage(participant.totalDamage)}
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 27, 75, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  name: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 60,
  },
  nameMe: {
    color: '#a5b4fc',
  },
  damage: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '800',
  },
  damageMe: {
    color: '#fbbf24',
  },
});
