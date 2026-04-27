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
  partyPassword: string;
  onChangeJoinCode: (value: string) => void;
  onChangePartyPassword: (value: string) => void;
  onCreateParty: () => void;
  onPostRecruitment: () => void;
  onJoinByCode: () => void;
  onJoinParty: (partyId: string) => void;
  onRandomJoin: () => void;
  onInviteFriends: () => void;
  onLeaveParty: () => void;
  onDisbandParty: () => void;
  onClose: () => void;
}

export default function RaidPartyManagerModal({
  visible,
  target: nullableTarget,
  partyId,
  members,
  isLeader,
  myPlayerId,
  listings,
  loading,
  actionLoading,
  joinCode,
  partyPassword,
  onChangeJoinCode,
  onChangePartyPassword,
  onCreateParty,
  onPostRecruitment,
  onJoinByCode,
  onJoinParty,
  onRandomJoin,
  onInviteFriends,
  onLeaveParty,
  onDisbandParty,
  onClose,
}: RaidPartyManagerModalProps) {
  if (!nullableTarget) {
    return null;
  }

  const target = nullableTarget;
  const canInvite = Boolean(
    partyId && isLeader && members.length < MAX_PARTY_SIZE,
  );
  const joinDisabled = actionLoading || joinCode.trim().length < 6;
  const hasParty = Boolean(partyId);
  const displayPartyId = partyId ?? '';

  // RAID_FIX: simplified mobile-first raid recruitment layout. Existing
  // actions stay wired, but noisy copy and stacked decorations are removed.
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.panel, styles.simplePanel, { borderColor: `${target.color}AA` }]}>
          <View style={styles.simpleHeader}>
            <View style={[styles.simpleBossIcon, { borderColor: target.color }]}>
              <Text style={styles.simpleBossIconText}>{target.emoji}</Text>
            </View>
            <View style={styles.simpleTitleBlock}>
              <Text style={styles.simpleTitle}>{target.name}</Text>
              <Text style={styles.simpleMeta}>
                {target.raidType === 'normal' ? '일반 레이드' : '보스 레이드'} · 난이도 {target.bossStage}
              </Text>
            </View>
            <TouchableOpacity style={styles.simpleCloseBtn} onPress={onClose}>
              <Text style={styles.simpleCloseText}>닫기</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.simpleBody}
            contentContainerStyle={styles.simpleBodyContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.simpleSection}>
              <View style={styles.simpleSectionHeader}>
                <Text style={styles.simpleSectionTitle}>
                  파티원 {members.length}/{MAX_PARTY_SIZE}
                </Text>
                {partyId ? (
                  <Text style={styles.simplePartyCode}>코드 {displayPartyId.slice(0, 8)}</Text>
                ) : null}
              </View>

              {members.length === 0 ? (
                <View style={styles.simpleEmptyMemberCard}>
                  <Text style={styles.simpleEmptyText}>파티를 만들거나 참가해 주세요.</Text>
                </View>
              ) : (
                members.map((member, index) => {
                  const isMe = member.playerId === myPlayerId;
                  const isMemberLeader = index === 0;
                  return (
                    <View key={member.playerId} style={styles.simpleMemberCard}>
                      <View style={[styles.simpleAvatar, isMe && styles.simpleAvatarMe]}>
                        <Text style={styles.simpleAvatarText}>
                          {member.nickname.trim().slice(0, 1) || '?'}
                        </Text>
                      </View>
                      <View style={styles.simpleMemberInfo}>
                        <Text style={[styles.simpleMemberName, isMe && styles.simpleMemberNameMe]} numberOfLines={1}>
                          {member.nickname}
                        </Text>
                        <Text style={styles.simpleMemberRole}>
                          {isMemberLeader ? '방장' : '파티원'} · Lv -
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.simpleStatusBadge,
                          isMemberLeader && styles.simpleStatusBadgeHost,
                        ]}
                      >
                        {isMemberLeader ? '방장' : '대기 중'}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>

            <View style={styles.simpleSection}>
              <Text style={styles.simpleSectionTitle}>참가</Text>
              {!hasParty ? (
                <TextInput
                  value={partyPassword}
                  onChangeText={onChangePartyPassword}
                  placeholder="파티 비밀번호 (만들기/참가 선택)"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  maxLength={24}
                  style={styles.passwordInput}
                />
              ) : null}
              <View style={styles.joinInputRow}>
                <TextInput
                  value={joinCode}
                  onChangeText={onChangeJoinCode}
                  placeholder="파티 코드"
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
                  <Text style={styles.loadingText}>모집 목록 확인 중</Text>
                </View>
              ) : listings.length > 0 ? (
                listings.slice(0, 4).map(listing => (
                  <View key={listing.id} style={styles.listingRow}>
                    <View style={styles.listingInfo}>
                      <Text style={styles.listingTitle}>
                        {listing.leaderNickname} 파티
                        {listing.hasPassword ? ' · 비공개' : ''}
                      </Text>
                      <Text style={styles.listingMeta}>
                        {listing.memberCount}/{MAX_PARTY_SIZE}명 · 코드 {listing.id.slice(0, 8)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.smallJoinBtn, { borderColor: target.color }]}
                      disabled={actionLoading}
                      onPress={() => onJoinParty(listing.id)}
                    >
                      <Text style={[styles.smallJoinBtnText, { color: target.color }]}>참가</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>현재 모집 중인 파티가 없습니다.</Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.simpleFooter}>
            {hasParty ? (
              <>
                {isLeader ? (
                  <>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: target.color }]}
                      disabled={actionLoading}
                      onPress={onPostRecruitment}
                    >
                      <Text style={styles.primaryBtnText}>모집</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.secondaryBtn, !canInvite && styles.disabledBtn]}
                      disabled={!canInvite || actionLoading}
                      onPress={onInviteFriends}
                    >
                      <Text style={styles.secondaryBtnText}>초대</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  disabled={actionLoading}
                  onPress={isLeader ? onDisbandParty : onLeaveParty}
                >
                  <Text style={styles.secondaryBtnText}>
                    {isLeader ? '해산' : '나가기'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: target.color }]}
                  disabled={actionLoading}
                  onPress={onCreateParty}
                >
                  <Text style={styles.primaryBtnText}>파티 만들기</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  disabled={actionLoading || loading}
                  onPress={onRandomJoin}
                >
                  <Text style={styles.secondaryBtnText}>빠른 참가</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
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
  passwordInput: {
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
  simplePanel: {
    maxHeight: '88%',
    borderRadius: 16,
  },
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.16)',
  },
  simpleBossIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  simpleBossIconText: {
    fontSize: 22,
  },
  simpleTitleBlock: {
    flex: 1,
  },
  simpleTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '900',
  },
  simpleMeta: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  simpleCloseBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.22)',
  },
  simpleCloseText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '900',
  },
  simpleBody: {
    maxHeight: 560,
  },
  simpleBodyContent: {
    padding: 12,
    gap: 10,
  },
  simpleSection: {
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.58)',
    padding: 10,
    gap: 8,
  },
  simpleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  simpleSectionTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },
  simplePartyCode: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
  },
  simpleMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  simpleEmptyMemberCard: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
  },
  simpleEmptyText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  simpleAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(165, 180, 252, 0.42)',
  },
  simpleAvatarMe: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: 'rgba(245, 158, 11, 0.62)',
  },
  simpleAvatarText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },
  simpleMemberInfo: {
    flex: 1,
  },
  simpleMemberName: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '900',
  },
  simpleMemberNameMe: {
    color: '#fbbf24',
  },
  simpleMemberRole: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  simpleStatusBadge: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '900',
    borderRadius: 999,
    backgroundColor: 'rgba(51, 65, 85, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  simpleStatusBadgeHost: {
    color: '#fde68a',
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
  },
  simpleFooter: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.16)',
  },
  disabledBtn: {
    opacity: 0.45,
  },
});
