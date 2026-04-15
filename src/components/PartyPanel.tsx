import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {t} from '../i18n';
import {MAX_PARTY_SIZE} from '../constants/raidConfig';

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
        <Text style={styles.sectionEyebrow}>PARTY FORGE</Text>
        <Text style={styles.emptyTitle}>파티를 만들고 레이드를 준비하세요</Text>
        <Text style={styles.emptyText}>
          파티를 만들면 친구를 초대하고 같은 레이드 인스턴스로 함께 진입할 수
          있습니다.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={onCreateParty}>
          <Text style={styles.primaryButtonText}>{t('party.create')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionEyebrow}>PARTY FORGE</Text>
          <Text style={styles.title}>
            {t('party.title')} {members.length}/{MAX_PARTY_SIZE}
          </Text>
        </View>
        {isLeader && members.length < MAX_PARTY_SIZE ? (
          <TouchableOpacity style={styles.inviteButton} onPress={onInviteFriends}>
            <Text style={styles.inviteButtonText}>{t('party.invite')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.memberList}>
        {Array.from({length: MAX_PARTY_SIZE}, (_, index) => {
          const member = members[index] ?? null;
          const isMe = member?.playerId === myPlayerId;

          return (
            <View
              key={member?.playerId || `party-slot-${index}`}
              style={[styles.memberCard, !member && styles.memberCardEmpty]}>
              <View style={[styles.memberAvatar, !member && styles.memberAvatarEmpty]}>
                <Text style={styles.memberAvatarText}>{member ? index + 1 : '+'}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, !member && styles.memberNameEmpty]}>
                  {member ? member.nickname : '빈 슬롯'}
                </Text>
                <Text style={styles.memberMeta}>
                  {member
                    ? isMe
                      ? isLeader
                        ? '파티장 · 나'
                        : '파티원 · 나'
                      : isLeader && index === 0
                        ? '파티장'
                        : '파티원'
                    : '초대 가능'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={isLeader ? onDisbandParty : onLeaveParty}>
        <Text style={styles.secondaryButtonText}>
          {isLeader ? t('party.disband') : t('party.leave')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(33, 20, 82, 0.94)',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(226, 169, 77, 0.78)',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    marginTop: 12,
    shadowColor: '#0b0419',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionEyebrow: {
    color: '#ffd88a',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 3,
  },
  title: {
    color: '#fff7de',
    fontSize: 17,
    fontWeight: '900',
  },
  emptyTitle: {
    color: '#fff7de',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptyText: {
    color: '#ddd0ff',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  memberList: {
    gap: 8,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  memberCardEmpty: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderStyle: 'dashed',
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(108, 58, 214, 0.96)',
    borderWidth: 2,
    borderColor: 'rgba(235, 184, 92, 0.9)',
  },
  memberAvatarEmpty: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  memberAvatarText: {
    color: '#fff8e1',
    fontSize: 14,
    fontWeight: '900',
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    color: '#fff5d7',
    fontSize: 14,
    fontWeight: '800',
  },
  memberNameEmpty: {
    color: '#d4c6ff',
  },
  memberMeta: {
    color: '#d4c6ff',
    fontSize: 11,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#2da8ff',
    borderWidth: 2,
    borderColor: '#dff5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  inviteButton: {
    borderRadius: 14,
    backgroundColor: 'rgba(108, 58, 214, 0.96)',
    borderWidth: 1.5,
    borderColor: 'rgba(235, 184, 92, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inviteButtonText: {
    color: '#fff6da',
    fontSize: 12,
    fontWeight: '900',
  },
  secondaryButton: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#fff4d7',
    fontSize: 13,
    fontWeight: '900',
  },
});
