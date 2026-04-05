import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Alert, ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BackImageButton from '../components/BackImageButton';
import {t} from '../i18n';
import {getPlayerId} from '../stores/gameStore';
import {
  searchPlayers, sendFriendRequest, acceptFriendRequest,
  rejectFriendRequest, getFriendList, getPendingRequests, removeFriend,
} from '../services/friendService';

type Tab = 'friends' | 'requests' | 'search';

interface FriendItem {
  id: string;
  nickname: string;
  friendshipId: string;
  isOnline: boolean;
}

interface RequestItem {
  friendshipId: string;
  requesterId: string;
  nickname: string;
}

export default function FriendsScreen({navigation}: any) {
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{id: string; nickname: string}[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playerId, setPlayerId] = useState('');

  const loadData = useCallback(async () => {
    const pid = await getPlayerId();
    setPlayerId(pid);

    const {data: friendData} = await getFriendList(pid);
    setFriends(friendData || []);

    const {data: requestData} = await getPendingRequests(pid);
    setRequests(requestData || []);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    const {data} = await searchPlayers(searchQuery.trim(), playerId);
    setSearchResults(data || []);
    setSearching(false);
  };

  const handleSendRequest = async (targetId: string) => {
    const {error} = await sendFriendRequest(playerId, targetId);
    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      Alert.alert(t('common.notice'), t('friends.requestSent'));
      setSearchResults(prev => prev.filter(r => r.id !== targetId));
    }
  };

  const handleAccept = async (friendshipId: string) => {
    await acceptFriendRequest(friendshipId);
    loadData();
  };

  const handleReject = async (friendshipId: string) => {
    await rejectFriendRequest(friendshipId);
    setRequests(prev => prev.filter(r => r.friendshipId !== friendshipId));
  };

  const handleRemove = async (friendshipId: string) => {
    Alert.alert(t('friends.removeFriend'), t('friends.removeConfirm'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: async () => {
          await removeFriend(friendshipId);
          setFriends(prev => prev.filter(f => f.friendshipId !== friendshipId));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackImageButton onPress={() => navigation.goBack()} size={42} />
        <Text style={styles.title}>{t('friends.title')}</Text>
        <View style={{width: 40}} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['friends', 'requests', 'search'] as Tab[]).map(tb => (
          <TouchableOpacity
            key={tb}
            style={[styles.tab, tab === tb && styles.tabActive]}
            onPress={() => setTab(tb)}>
            <Text style={[styles.tabText, tab === tb && styles.tabTextActive]}>
              {tb === 'friends' ? `${t('friends.list')} (${friends.length})`
                : tb === 'requests' ? `${t('friends.requests')} (${requests.length})`
                : t('friends.search')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Friends tab */}
      {tab === 'friends' && (
        loading ? (
          <View style={styles.center}><ActivityIndicator color="#6366f1" /></View>
        ) : friends.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>{t('friends.noFriends')}</Text>
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({item}) => (
              <View style={styles.friendRow}>
                <View style={[
                  styles.onlineDot,
                  {backgroundColor: item.isOnline ? '#22c55e' : '#64748b'},
                ]} />
                <Text style={styles.friendName}>{item.nickname}</Text>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemove(item.friendshipId)}>
                  <Text style={styles.removeBtnText}>{t('friends.remove')}</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )
      )}

      {/* Requests tab */}
      {tab === 'requests' && (
        requests.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>{t('friends.noRequests')}</Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={item => item.friendshipId}
            contentContainerStyle={styles.listContent}
            renderItem={({item}) => (
              <View style={styles.friendRow}>
                <Text style={[styles.friendName, {flex: 1}]}>{item.nickname}</Text>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleAccept(item.friendshipId)}>
                  <Text style={styles.acceptBtnText}>{t('friends.accept')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleReject(item.friendshipId)}>
                  <Text style={styles.rejectBtnText}>{t('friends.reject')}</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )
      )}

      {/* Search tab */}
      {tab === 'search' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('friends.searchPlaceholder')}
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={handleSearch}
              disabled={searching}>
              {searching ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.searchBtnText}>{t('friends.search')}</Text>
              )}
            </TouchableOpacity>
          </View>
          <FlatList
            data={searchResults}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              searchQuery ? (
                <Text style={styles.emptyText}>{t('friends.noResults')}</Text>
              ) : null
            }
            renderItem={({item}) => {
              const alreadyFriend = friends.some(f => f.id === item.id);
              return (
                <View style={styles.friendRow}>
                  <Text style={[styles.friendName, {flex: 1}]}>{item.nickname}</Text>
                  {alreadyFriend ? (
                    <Text style={styles.alreadyFriend}>{t('friends.alreadyFriend')}</Text>
                  ) : (
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => handleSendRequest(item.id)}>
                      <Text style={styles.addBtnText}>{t('friends.addFriend')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0f0a2e'},
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10,
  },
  title: {color: '#e2e8f0', fontSize: 18, fontWeight: '800'},
  tabRow: {
    flexDirection: 'row', paddingHorizontal: 12, gap: 6, marginBottom: 8,
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: 'rgba(30,27,75,0.6)',
  },
  tabActive: {backgroundColor: '#6366f1'},
  tabText: {color: '#94a3b8', fontSize: 12, fontWeight: '700'},
  tabTextActive: {color: '#fff'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  emptyText: {color: '#64748b', fontSize: 14},
  listContent: {padding: 12, gap: 6},
  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(30,27,75,0.6)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  onlineDot: {width: 10, height: 10, borderRadius: 5},
  friendName: {color: '#e2e8f0', fontSize: 15, fontWeight: '600'},
  removeBtn: {paddingHorizontal: 10, paddingVertical: 4},
  removeBtnText: {color: '#f87171', fontSize: 12, fontWeight: '700'},
  acceptBtn: {
    backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  acceptBtnText: {color: '#fff', fontSize: 13, fontWeight: '700'},
  rejectBtn: {
    backgroundColor: '#374151', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  rejectBtnText: {color: '#e2e8f0', fontSize: 13, fontWeight: '700'},
  addBtn: {
    backgroundColor: '#6366f1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  addBtnText: {color: '#fff', fontSize: 13, fontWeight: '700'},
  alreadyFriend: {color: '#22c55e', fontSize: 12, fontWeight: '600'},
  searchContainer: {flex: 1},
  searchBar: {
    flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8,
  },
  searchInput: {
    flex: 1, backgroundColor: '#1e1b4b', color: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  searchBtn: {
    backgroundColor: '#6366f1', paddingHorizontal: 16, borderRadius: 10,
    justifyContent: 'center',
  },
  searchBtnText: {color: '#fff', fontSize: 14, fontWeight: '700'},
});
