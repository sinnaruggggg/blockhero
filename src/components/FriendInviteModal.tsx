import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Modal, FlatList} from 'react-native';
import {t} from '../i18n';

interface Friend {
  id: string;
  nickname: string;
  isOnline: boolean;
}

interface FriendInviteModalProps {
  visible: boolean;
  friends: Friend[];
  onInvite: (friendId: string) => void;
  onClose: () => void;
  title?: string;
}

export default function FriendInviteModal({
  visible,
  friends,
  onInvite,
  onClose,
  title,
}: FriendInviteModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{title || t('party.inviteFriend')}</Text>

          {friends.length === 0 ? (
            <Text style={styles.emptyText}>{t('friends.noFriends')}</Text>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={item => item.id}
              style={styles.list}
              renderItem={({item}) => (
                <View style={styles.row}>
                  <View style={[
                    styles.onlineDot,
                    {backgroundColor: item.isOnline ? '#22c55e' : '#64748b'},
                  ]} />
                  <Text style={styles.name}>{item.nickname}</Text>
                  <TouchableOpacity
                    style={styles.inviteBtn}
                    onPress={() => onInvite(item.id)}>
                    <Text style={styles.inviteBtnText}>{t('party.invite')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

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
    maxHeight: '70%',
  },
  title: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  list: {
    maxHeight: 300,
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
  name: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  inviteBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inviteBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: {
    marginTop: 16,
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
