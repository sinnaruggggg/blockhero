import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { t } from '../i18n';
import { MAX_PARTY_SIZE } from '../constants/raidConfig';

interface PartyMember {
  playerId: string;
  nickname: string;
}

interface PartyPanelProps {
  partyId: string | null;
  members: PartyMember[];
  isLeader: boolean;
  myPlayerId: string;
  onCreateParty: () => void;
  onLeaveParty: () => void;
  onDisbandParty: () => void;
  onInviteFriends: () => void;
}

export default function PartyPanel({
  partyId,
  members,
  isLeader,
  myPlayerId,
  onCreateParty,
  onLeaveParty,
  onDisbandParty,
  onInviteFriends,
}: PartyPanelProps) {
  if (!partyId) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.createBtn} onPress={onCreateParty}>
          <Text style={styles.createBtnText}>{t('party.create')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('party.title')} ({members.length}/{MAX_PARTY_SIZE})
        </Text>
        {isLeader && members.length < MAX_PARTY_SIZE && (
          <TouchableOpacity style={styles.inviteBtn} onPress={onInviteFriends}>
            <Text style={styles.inviteBtnText}>{t('party.invite')}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.memberList}>
        {members.map(member => (
          <View key={member.playerId} style={styles.memberRow}>
            <Text
              style={[
                styles.memberName,
                member.playerId === myPlayerId && styles.memberNameMe,
              ]}
            >
              {member.nickname}
              {member.playerId === myPlayerId ? ' (나)' : ''}
            </Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={styles.leaveBtn}
        onPress={isLeader ? onDisbandParty : onLeaveParty}
      >
        <Text style={styles.leaveBtnText}>
          {isLeader ? t('party.disband') : t('party.leave')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(30, 27, 75, 0.6)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '800',
  },
  inviteBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inviteBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  memberList: {
    gap: 4,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  memberName: {
    color: '#a5b4fc',
    fontSize: 13,
    fontWeight: '600',
  },
  memberNameMe: {
    color: '#fbbf24',
  },
  createBtn: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  createBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  leaveBtn: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 6,
  },
  leaveBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
  },
});
