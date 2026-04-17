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
import { t } from '../i18n';

export interface InviteCandidate {
  id: string;
  nickname: string;
  isOnline: boolean;
}

interface FriendInviteModalProps {
  visible: boolean;
  friends: InviteCandidate[];
  searchQuery: string;
  searchResults: InviteCandidate[];
  searching: boolean;
  onChangeSearchQuery: (text: string) => void;
  onSearch: () => void;
  onInvite: (playerId: string) => void;
  onClose: () => void;
  title?: string;
}

function CandidateRow({
  candidate,
  onInvite,
}: {
  candidate: InviteCandidate;
  onInvite: (playerId: string) => void;
}) {
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.onlineDot,
          { backgroundColor: candidate.isOnline ? '#22c55e' : '#64748b' },
        ]}
      />
      <View style={styles.identityBlock}>
        <Text style={styles.name}>{candidate.nickname}</Text>
        <Text style={styles.idText}>{candidate.id}</Text>
      </View>
      <TouchableOpacity
        style={[
          styles.inviteBtn,
          !candidate.isOnline && styles.inviteBtnDisabled,
        ]}
        disabled={!candidate.isOnline}
        onPress={() => onInvite(candidate.id)}
      >
        <Text style={styles.inviteBtnText}>
          {candidate.isOnline ? t('party.invite') : '오프라인'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function FriendInviteModal({
  visible,
  friends,
  searchQuery,
  searchResults,
  searching,
  onChangeSearchQuery,
  onSearch,
  onInvite,
  onClose,
  title,
}: FriendInviteModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{title || t('party.inviteFriend')}</Text>

          <View style={styles.searchRow}>
            <TextInput
              value={searchQuery}
              onChangeText={onChangeSearchQuery}
              placeholder="닉네임 또는 ID 검색"
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={onSearch}
            />
            <TouchableOpacity
              style={[
                styles.searchBtn,
                (!searchQuery.trim() || searching) && styles.searchBtnDisabled,
              ]}
              disabled={!searchQuery.trim() || searching}
              onPress={onSearch}
            >
              {searching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.searchBtnText}>검색</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>온라인 친구</Text>
              {friends.length === 0 ? (
                <Text style={styles.emptyText}>
                  초대 가능한 온라인 친구가 없습니다.
                </Text>
              ) : (
                friends.map(candidate => (
                  <CandidateRow
                    key={`friend-${candidate.id}`}
                    candidate={candidate}
                    onInvite={onInvite}
                  />
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>검색 결과</Text>
              {searchResults.length === 0 ? (
                <Text style={styles.emptyText}>
                  검색 후 온라인 유저가 여기에 표시됩니다.
                </Text>
              ) : (
                searchResults.map(candidate => (
                  <CandidateRow
                    key={`search-${candidate.id}`}
                    candidate={candidate}
                    onInvite={onInvite}
                  />
                ))
              )}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 20,
    maxHeight: '78%',
  },
  title: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    color: '#e2e8f0',
    fontSize: 14,
  },
  searchBtn: {
    minWidth: 72,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  searchBtnDisabled: {
    opacity: 0.5,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  list: {
    maxHeight: 360,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#cbd5f5',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: 8,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  identityBlock: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '600',
  },
  idText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  inviteBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inviteBtnDisabled: {
    backgroundColor: '#475569',
  },
  inviteBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#374151',
    borderRadius: 10,
  },
  closeBtnText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
  },
});
