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
import {t} from '../i18n';

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
          {backgroundColor: candidate.isOnline ? '#2da8ff' : 'rgba(255,255,255,0.24)'},
        ]}
      />
      <View style={styles.identityBlock}>
        <Text style={styles.name}>{candidate.nickname}</Text>
        <Text style={styles.idText}>{candidate.id}</Text>
      </View>
      <TouchableOpacity
        style={[styles.inviteBtn, !candidate.isOnline && styles.inviteBtnDisabled]}
        disabled={!candidate.isOnline}
        onPress={() => onInvite(candidate.id)}>
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
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>PARTY INVITE</Text>
          <Text style={styles.title}>{title || t('party.inviteFriend')}</Text>

          <View style={styles.searchRow}>
            <TextInput
              value={searchQuery}
              onChangeText={onChangeSearchQuery}
              placeholder="닉네임 또는 ID 검색"
              placeholderTextColor="#b7a8e6"
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
              onPress={onSearch}>
              {searching ? (
                <ActivityIndicator size="small" color="#ffffff" />
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
                  검색한 플레이어가 여기에 표시됩니다.
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
    backgroundColor: 'rgba(10, 7, 28, 0.74)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#23134e',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    maxHeight: '78%',
    borderWidth: 2,
    borderColor: '#e2a94d',
    shadowColor: '#0b0419',
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 12,
  },
  eyebrow: {
    color: '#ffd88b',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 4,
  },
  title: {
    color: '#fff6da',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 14,
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(12, 7, 36, 0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    color: '#fff7de',
    fontSize: 14,
  },
  searchBtn: {
    minWidth: 74,
    borderRadius: 14,
    backgroundColor: '#2da8ff',
    borderWidth: 1.5,
    borderColor: '#dff5ff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  searchBtnDisabled: {
    opacity: 0.5,
  },
  searchBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  list: {
    maxHeight: 360,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    alignSelf: 'flex-start',
    color: '#fff1c7',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(75, 43, 155, 0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(232, 178, 90, 0.72)',
  },
  emptyText: {
    color: '#d4c6ff',
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  identityBlock: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: '#fff7de',
    fontSize: 15,
    fontWeight: '800',
  },
  idText: {
    color: '#d4c6ff',
    fontSize: 11,
  },
  inviteBtn: {
    backgroundColor: 'rgba(108, 58, 214, 0.96)',
    borderWidth: 1.5,
    borderColor: 'rgba(235, 184, 92, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  inviteBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  inviteBtnText: {
    color: '#fff7de',
    fontSize: 12,
    fontWeight: '900',
  },
  closeBtn: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  closeBtnText: {
    color: '#fff4d7',
    fontSize: 15,
    fontWeight: '900',
  },
});
