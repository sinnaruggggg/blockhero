import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MAX_PARTY_SIZE } from '../constants/raidConfig';
import type { RaidPartyListing, RaidPartyType } from '../services/partyService';

export interface RaidPartyModalTarget {
  raidType: RaidPartyType;
  bossStage: number;
  name: string;
  color: string;
  emoji: string;
}

interface PartyMember {
  playerId: string;
  nickname: string;
}

interface RaidPartyManagerModalProps {
  visible: boolean;
  target: RaidPartyModalTarget | null;
  partyId: string | null;
  members: PartyMember[];
  isLeader: boolean;
  myPlayerId: string;
  listings: RaidPartyListing[];
  loading: boolean;
  actionLoading: boolean;
  joinCode: string;
  onChangeJoinCode: (value: string) => void;
  onCreateParty: () => void;
  onPostRecruitment: () => void;
  onJoinByCode: () => void;
  onJoinParty: (partyId: string) => void;
  onRandomJoin: () => void;
  onRefreshParties: () => void;
  onInviteFriends: () => void;
  onLeaveParty: () => void;
  onDisbandParty: () => void;
  onClose: () => void;
}

export default function RaidPartyManagerModal({
  visible,
  target,
  partyId,
  members,
  isLeader,
  myPlayerId,
  listings,
  loading,
  actionLoading,
  joinCode,
  onChangeJoinCode,
  onCreateParty,
  onPostRecruitment,
  onJoinByCode,
  onJoinParty,
  onRandomJoin,
  onRefreshParties,
  onInviteFriends,
  onLeaveParty,
  onDisbandParty,
  onClose,
}: RaidPartyManagerModalProps) {
  if (!target) {
    return null;
  }

  const canInvite = Boolean(
    partyId && isLeader && members.length < MAX_PARTY_SIZE,
  );
  const joinDisabled = actionLoading || joinCode.trim().length < 6;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.panel, { borderColor: `${target.color}AA` }]}>
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <Text style={styles.eyebrow}>
                {target.raidType === 'normal'
                  ? '일반 레이드 파티'
                  : '보스 레이드 파티'}
              </Text>
              <Text style={styles.title}>
                {target.emoji} {target.name}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {partyId ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    현재 파티 ({members.length}/{MAX_PARTY_SIZE})
                  </Text>
                  <Text style={styles.partyCode}>
                    코드 {partyId.slice(0, 8)}
                  </Text>
                </View>
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
                <View style={styles.actionRow}>
                  {isLeader ? (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.primaryBtn,
                          { backgroundColor: target.color },
                        ]}
                        disabled={actionLoading}
                        onPress={onPostRecruitment}
                      >
                        <Text style={styles.primaryBtnText}>모집글 올리기</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.secondaryBtn,
                          !canInvite && styles.disabledBtn,
                        ]}
                        disabled={!canInvite || actionLoading}
                        onPress={onInviteFriends}
                      >
                        <Text style={styles.secondaryBtnText}>친구 초대</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.dangerBtn}
                  disabled={actionLoading}
                  onPress={isLeader ? onDisbandParty : onLeaveParty}
                >
                  <Text style={styles.dangerBtnText}>
                    {isLeader ? '파티 해산' : '파티 나가기'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>파티 생성</Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: target.color }]}
                  disabled={actionLoading}
                  onPress={onCreateParty}
                >
                  <Text style={styles.primaryBtnText}>
                    이 레이드 파티 만들기
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>파티 참가</Text>
                <TouchableOpacity disabled={loading} onPress={onRefreshParties}>
                  <Text style={[styles.refreshText, { color: target.color }]}>
                    새로고침
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.joinInputRow}>
                <TextInput
                  value={joinCode}
                  onChangeText={onChangeJoinCode}
                  placeholder="파티 코드 또는 전체 ID"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.joinInput}
                />
                <TouchableOpacity
                  style={[styles.joinBtn, joinDisabled && styles.disabledBtn]}
                  disabled={joinDisabled}
                  onPress={onJoinByCode}
                >
                  <Text style={styles.joinBtnText}>참가</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={target.color} />
                  <Text style={styles.loadingText}>
                    참가 가능한 파티 확인 중
                  </Text>
                </View>
              ) : listings.length === 0 ? (
                <Text style={styles.emptyText}>
                  현재 목록에는 모집 중인 파티가 없습니다. 채팅 모집글의 파티
                  참가 버튼도 사용할 수 있습니다.
                </Text>
              ) : (
                listings.map(listing => (
                  <View key={listing.id} style={styles.listingRow}>
                    <View style={styles.listingInfo}>
                      <Text style={styles.listingTitle}>
                        {listing.leaderNickname} 파티
                      </Text>
                      <Text style={styles.listingMeta}>
                        {listing.memberCount}/{MAX_PARTY_SIZE}명 · 코드{' '}
                        {listing.id.slice(0, 8)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.smallJoinBtn,
                        { borderColor: target.color },
                      ]}
                      disabled={actionLoading}
                      onPress={() => onJoinParty(listing.id)}
                    >
                      <Text
                        style={[
                          styles.smallJoinBtnText,
                          { color: target.color },
                        ]}
                      >
                        참가
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>랜덤 참가</Text>
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  listings.length === 0 && styles.disabledBtn,
                ]}
                disabled={actionLoading || listings.length === 0}
                onPress={onRandomJoin}
              >
                <Text style={styles.secondaryBtnText}>
                  모집 중 파티에 랜덤 참가
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.76)',
    paddingHorizontal: 18,
  },
  panel: {
    maxHeight: '86%',
    borderWidth: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.18)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  titleBlock: { flex: 1 },
  eyebrow: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  closeBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.24)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  closeBtnText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '800',
  },
  body: { maxHeight: 620 },
  bodyContent: {
    padding: 14,
    gap: 12,
  },
  section: {
    borderRadius: 14,
    backgroundColor: 'rgba(30, 41, 59, 0.72)',
    padding: 12,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },
  partyCode: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
  },
  memberRow: {
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  memberName: {
    color: '#c4b5fd',
    fontSize: 13,
    fontWeight: '800',
  },
  memberNameMe: {
    color: '#fbbf24',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryBtnText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '900',
  },
  dangerBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dangerBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '900',
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '900',
  },
  joinInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  joinInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  joinBtn: {
    minWidth: 68,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  listingInfo: { flex: 1 },
  listingTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '900',
  },
  listingMeta: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  smallJoinBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  smallJoinBtnText: {
    fontSize: 12,
    fontWeight: '900',
  },
  disabledBtn: {
    opacity: 0.45,
  },
});
