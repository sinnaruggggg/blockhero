import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BackImageButton from '../components/BackImageButton';
import {getAdminStatus} from '../services/adminSync';
import {supabase} from '../services/supabase';
import {
  buildAnnouncementContent,
  parseAnnouncementContent,
} from '../game/announcementContent';

type Tab = 'dashboard' | 'users' | 'grants' | 'announcements' | 'battles';

interface UserItem {
  id: string;
  nickname: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

interface GrantItem {
  id: number;
  nickname: string;
  grant_type: string;
  amount: number;
  reason: string | null;
  status: string;
  created_at: string;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  is_active: boolean;
  created_at: string;
}

interface Room {
  code: string;
  status: string;
  created_at: string;
}

const GRANT_TYPES = [
  {value: 'gold', label: '🪙 골드'},
  {value: 'diamonds', label: '💎 다이아'},
  {value: 'hearts', label: '❤️ 하트'},
  {value: 'hammer', label: '🔨 해머'},
  {value: 'refresh', label: '🔄 새로고침'},
  {value: 'addTurns', label: '➕ 턴 추가'},
  {value: 'bomb', label: '💣 폭탄'},
];

export default function AdminScreen({navigation}: any) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  // Dashboard
  const [stats, setStats] = useState({totalUsers: 0, todaySignups: 0, activeRooms: 0, queueSize: 0});

  // Users tab
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [userTabSearch, setUserTabSearch] = useState('');

  // Grants
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [grantType, setGrantType] = useState('gold');
  const [grantAmount, setGrantAmount] = useState('100');
  const [grantReason, setGrantReason] = useState('');
  const [grantHistory, setGrantHistory] = useState<GrantItem[]>([]);
  const [grantLoading, setGrantLoading] = useState(false);

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annImageUrl, setAnnImageUrl] = useState('');
  const [annLoading, setAnnLoading] = useState(false);
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<number | null>(
    null,
  );

  // Battles
  const [rooms, setRooms] = useState<Room[]>([]);
  const [queueList, setQueueList] = useState<any[]>([]);

  const loadDashboard = useCallback(async () => {
    const {data, error} = await supabase.rpc('get_admin_stats');
    if (error) {
      Alert.alert('오류', 'DB 권한 문제입니다.\nSupabase에서 is_admin = true 설정을 확인하세요.\n\n' + error.message);
      return;
    }
    const s = data?.[0] ?? data;
    setStats({
      totalUsers: Number(s?.total_users ?? 0),
      todaySignups: Number(s?.today_signups ?? 0),
      activeRooms: Number(s?.active_rooms ?? 0),
      queueSize: Number(s?.queue_size ?? 0),
    });
  }, []);

  const loadUsers = useCallback(async () => {
    const {data, error} = await supabase.rpc('get_admin_users');
    if (error) {
      Alert.alert('오류', error.message);
      return;
    }
    setUsers(data ?? []);
    setAllUsers(data ?? []);
  }, []);

  const loadGrantHistory = useCallback(async () => {
    const {data} = await supabase
      .from('resource_grants')
      .select('id, grant_type, amount, reason, status, created_at, profiles(nickname)')
      .order('created_at', {ascending: false})
      .limit(30);
    if (data) {
      setGrantHistory(data.map((g: any) => ({
        ...g,
        nickname: g.profiles?.nickname ?? '?',
      })));
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    const {data} = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', {ascending: false});
    setAnnouncements(
      (data ?? []).map((row: any) => {
        const parsed = parseAnnouncementContent(row.content, row.image_url);
        return {
          id: row.id,
          title: row.title,
          content: parsed.content,
          imageUrl: parsed.imageUrl,
          is_active: row.is_active,
          created_at: row.created_at,
        };
      }),
    );
  }, []);

  const loadBattles = useCallback(async () => {
    const [{data: roomData}, {data: queueData}] = await Promise.all([
      supabase.from('rooms').select('code, status, created_at').order('created_at', {ascending: false}).limit(20),
      supabase.from('matching_queue').select('player_id, nickname, status, created_at').order('created_at', {ascending: false}).limit(20),
    ]);
    setRooms(roomData ?? []);
    setQueueList(queueData ?? []);
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      const isAdmin = await getAdminStatus();
      if (!active) {
        return;
      }

      setHasAdminAccess(isAdmin);
      setAccessChecked(true);

      if (!isAdmin) {
        Alert.alert('접근 제한', '관리자만 접근할 수 있습니다.', [
          {text: '확인', onPress: () => navigation.goBack()},
        ]);
        return;
      }

      loadDashboard();
    })();

    return () => {
      active = false;
    };
  }, [loadDashboard, navigation]);

  useEffect(() => {
    if (!hasAdminAccess) {
      return;
    }

    if (tab === 'users') {
      loadUsers();
    } else if (tab === 'grants') {
      loadUsers();
      loadGrantHistory();
    } else if (tab === 'announcements') {
      loadAnnouncements();
    } else if (tab === 'battles') {
      loadBattles();
    }
  }, [hasAdminAccess, tab, loadUsers, loadGrantHistory, loadAnnouncements, loadBattles]);

  const filteredUsers = users.filter(u =>
    u.nickname?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()),
  );

  if (!accessChecked) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </SafeAreaView>
    );
  }

  if (!hasAdminAccess) {
    return null;
  }

  const handleGrant = async (targetUserId?: string) => {
    const userId = targetUserId ?? selectedUser?.id;
    if (!userId) {
      Alert.alert('오류', '유저를 선택하세요.');
      return;
    }
    const amount = parseInt(grantAmount, 10);
    if (!amount || amount <= 0) {
      Alert.alert('오류', '수량을 올바르게 입력하세요.');
      return;
    }
    setGrantLoading(true);
    try {
      const {error} = await supabase.from('resource_grants').insert({
        user_id: userId,
        grant_type: grantType,
        amount,
        reason: grantReason || null,
        status: 'pending',
      });
      if (error) throw error;
      Alert.alert('완료', '지급 완료!');
      setSelectedUser(null);
      setGrantReason('');
      loadGrantHistory();
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setGrantLoading(false);
    }
  };

  const handleBulkGrant = async () => {
    const amount = parseInt(grantAmount, 10);
    if (!amount || amount <= 0) {
      Alert.alert('오류', '수량을 올바르게 입력하세요.');
      return;
    }
    Alert.alert(
      '전체 지급',
      `모든 유저에게 ${GRANT_TYPES.find(g => g.value === grantType)?.label} x${amount} 지급합니까?`,
      [
        {text: '취소', style: 'cancel'},
        {
          text: '지급',
          onPress: async () => {
            setGrantLoading(true);
            try {
              const rows = users.map(u => ({
                user_id: u.id,
                grant_type: grantType,
                amount,
                reason: grantReason || '전체 지급',
                status: 'pending',
              }));
              const {error} = await supabase.from('resource_grants').insert(rows);
              if (error) throw error;
              Alert.alert('완료', `${users.length}명에게 지급 완료!`);
              loadGrantHistory();
            } catch (e: any) {
              Alert.alert('오류', e.message);
            } finally {
              setGrantLoading(false);
            }
          },
        },
      ],
    );
  };

  const resetAnnouncementForm = useCallback(() => {
    setEditingAnnouncementId(null);
    setAnnTitle('');
    setAnnContent('');
    setAnnImageUrl('');
    setShowAnnForm(false);
  }, []);

  const startEditAnnouncement = useCallback((announcement: Announcement) => {
    setEditingAnnouncementId(announcement.id);
    setAnnTitle(announcement.title);
    setAnnContent(announcement.content);
    setAnnImageUrl(announcement.imageUrl ?? '');
    setShowAnnForm(true);
  }, []);

  const handleSaveAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim()) {
      Alert.alert('오류', '제목과 내용을 입력하세요.');
      return;
    }
    setAnnLoading(true);
    try {
      const payload = {
        title: annTitle.trim(),
        content: buildAnnouncementContent(annContent, annImageUrl),
        is_active: true,
      };
      const {error} = editingAnnouncementId
        ? await supabase
            .from('announcements')
            .update(payload)
            .eq('id', editingAnnouncementId)
        : await supabase.from('announcements').insert(payload);
      if (error) throw error;
      resetAnnouncementForm();
      loadAnnouncements();
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setAnnLoading(false);
    }
  };

  const handlePickAnnouncementImage = async () => {
    try {
      const {launchImageLibrary} = require('react-native-image-picker') as {
        launchImageLibrary: (options: Record<string, unknown>) => Promise<any>;
      };
      const result = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: true,
        selectionLimit: 1,
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.7,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorMessage) {
        throw new Error(result.errorMessage);
      }

      const asset = result.assets?.[0];
      if (!asset?.base64 || !asset.type) {
        throw new Error('이미지 데이터를 불러오지 못했습니다.');
      }

      setAnnImageUrl(`data:${asset.type};base64,${asset.base64}`);
    } catch (error: any) {
      Alert.alert('이미지 첨부 실패', error?.message ?? '이미지를 선택하지 못했습니다.');
    }
  };

  const toggleAnnouncement = async (id: number, current: boolean) => {
    await supabase.from('announcements').update({is_active: !current}).eq('id', id);
    loadAnnouncements();
  };

  const deleteAnnouncement = async (id: number) => {
    Alert.alert('삭제', '공지를 삭제하시겠습니까?', [
      {text: '취소', style: 'cancel'},
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('announcements').delete().eq('id', id);
          loadAnnouncements();
        },
      },
    ]);
  };

  const cleanupRooms = async () => {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const {error} = await supabase.from('rooms').delete().lt('created_at', cutoff);
    if (!error) {
      Alert.alert('완료', '오래된 방 정리 완료');
      loadBattles();
    }
  };

  const cleanupQueue = async () => {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const {error} = await supabase.from('matching_queue').delete().lt('created_at', cutoff);
    if (!error) {
      Alert.alert('완료', '대기열 정리 완료');
      loadBattles();
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.backBtn}>
          <BackImageButton onPress={() => navigation.goBack()} size={42} />
        </View>
        <Text style={styles.title}>관리자</Text>
        <View style={{width: 60}} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {([['dashboard', '대시보드'], ['users', '유저'], ['grants', '재화지급'], ['announcements', '공지'], ['battles', '대전']] as [Tab, string][]).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, tab === key && styles.tabActive]}
            onPress={() => setTab(key)}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{paddingBottom: 40}}>

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <View>
            <View style={styles.statGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{stats.totalUsers}</Text>
                <Text style={styles.statLabel}>총 유저</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNum, {color: '#4ade80'}]}>{stats.todaySignups}</Text>
                <Text style={styles.statLabel}>오늘 가입</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNum, {color: '#facc15'}]}>{stats.activeRooms}</Text>
                <Text style={styles.statLabel}>활성 방</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNum, {color: '#c084fc'}]}>{stats.queueSize}</Text>
                <Text style={styles.statLabel}>매칭 대기</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={loadDashboard}>
              <Text style={styles.refreshBtnText}>새로고침</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolCard}
              onPress={() => navigation.navigate('KnightSpriteTuner')}>
              <Text style={styles.toolCardTitle}>직업 스프라이트 튜너</Text>
              <Text style={styles.toolCardDescription}>
                관리자 전용 비주얼 조정 화면으로 이동합니다.
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <View>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>전체 가입자 ({allUsers.length}명)</Text>
                <TouchableOpacity style={styles.smallBtn} onPress={loadUsers}>
                  <Text style={styles.smallBtnText}>새로고침</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="닉네임 / 이메일 검색"
                placeholderTextColor="#888"
                value={userTabSearch}
                onChangeText={setUserTabSearch}
              />
              {allUsers
                .filter(u =>
                  u.nickname?.toLowerCase().includes(userTabSearch.toLowerCase()) ||
                  u.email?.toLowerCase().includes(userTabSearch.toLowerCase()),
                )
                .map(u => (
                  <View key={u.id} style={styles.userRow}>
                    <View style={{flex: 1}}>
                      <Text style={styles.userRowName}>{u.nickname || '(없음)'}</Text>
                      <Text style={styles.userRowEmail}>{u.email}</Text>
                    </View>
                    <View style={{alignItems: 'flex-end'}}>
                      {u.is_admin && (
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminBadgeText}>관리자</Text>
                        </View>
                      )}
                      <Text style={styles.userRowDate}>{formatDate(u.created_at)}</Text>
                    </View>
                  </View>
                ))}
              {allUsers.length === 0 && <Text style={styles.emptyText}>유저 없음</Text>}
            </View>
          </View>
        )}

        {/* GRANTS */}
        {tab === 'grants' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>재화 지급</Text>

              {/* User search */}
              <TextInput
                style={styles.input}
                placeholder="닉네임 또는 이메일 검색"
                placeholderTextColor="#888"
                value={userSearch}
                onChangeText={setUserSearch}
              />
              {userSearch.length > 0 && (
                <View style={styles.userList}>
                  {filteredUsers.slice(0, 5).map(u => (
                    <TouchableOpacity
                      key={u.id}
                      style={[styles.userItem, selectedUser?.id === u.id && styles.userItemSelected]}
                      onPress={() => {setSelectedUser(u); setUserSearch(u.nickname || u.email);}}>
                      <Text style={styles.userItemText}>{u.nickname || '(닉네임 없음)'}</Text>
                      <Text style={styles.userItemSub}>{u.email}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {selectedUser && (
                <View style={styles.selectedUserBadge}>
                  <Text style={styles.selectedUserText}>선택됨: {selectedUser.nickname || selectedUser.email}</Text>
                  <TouchableOpacity onPress={() => {setSelectedUser(null); setUserSearch('');}}>
                    <Text style={{color: '#f87171', marginLeft: 8}}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Grant type */}
              <Text style={styles.fieldLabel}>지급 유형</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {GRANT_TYPES.map(g => (
                  <TouchableOpacity
                    key={g.value}
                    style={[styles.typeChip, grantType === g.value && styles.typeChipActive]}
                    onPress={() => setGrantType(g.value)}>
                    <Text style={[styles.typeChipText, grantType === g.value && styles.typeChipTextActive]}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Amount */}
              <Text style={styles.fieldLabel}>수량</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={grantAmount}
                onChangeText={setGrantAmount}
                placeholderTextColor="#888"
              />

              {/* Reason */}
              <Text style={styles.fieldLabel}>사유 (선택)</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 이벤트 보상"
                placeholderTextColor="#888"
                value={grantReason}
                onChangeText={setGrantReason}
              />

              <TouchableOpacity
                style={[styles.grantBtn, grantLoading && {opacity: 0.5}]}
                onPress={() => handleGrant()}
                disabled={grantLoading}>
                {grantLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.grantBtnText}>지급하기</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bulkBtn, grantLoading && {opacity: 0.5}]}
                onPress={handleBulkGrant}
                disabled={grantLoading}>
                <Text style={styles.bulkBtnText}>전체 유저에게 지급</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>최근 지급 내역</Text>
              {grantHistory.map(g => (
                <View key={g.id} style={styles.historyItem}>
                  <View style={{flex: 1}}>
                    <Text style={styles.historyUser}>{g.nickname}</Text>
                    <Text style={styles.historyDetail}>
                      {GRANT_TYPES.find(t => t.value === g.grant_type)?.label ?? g.grant_type} x{g.amount}
                      {g.reason ? `  (${g.reason})` : ''}
                    </Text>
                  </View>
                  <View style={{alignItems: 'flex-end'}}>
                    <Text style={[styles.historyStatus, g.status === 'claimed' ? styles.statusClaimed : styles.statusPending]}>
                      {g.status === 'claimed' ? '수령' : '대기'}
                    </Text>
                    <Text style={styles.historyDate}>{formatDate(g.created_at)}</Text>
                  </View>
                </View>
              ))}
              {grantHistory.length === 0 && <Text style={styles.emptyText}>내역 없음</Text>}
            </View>
          </View>
        )}

        {/* ANNOUNCEMENTS */}
        {tab === 'announcements' && (
          <View>
            <TouchableOpacity
              style={styles.newAnnBtn}
              onPress={() => {
                if (showAnnForm) {
                  resetAnnouncementForm();
                } else {
                  setShowAnnForm(true);
                }
              }}>
              <Text style={styles.newAnnBtnText}>
                {showAnnForm ? '취소' : '+ 새 공지'}
              </Text>
            </TouchableOpacity>

            {showAnnForm && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {editingAnnouncementId ? '공지 수정' : '공지 작성'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="제목"
                  placeholderTextColor="#888"
                  value={annTitle}
                  onChangeText={setAnnTitle}
                />
                <TextInput
                  style={[styles.input, {height: 100, textAlignVertical: 'top'}]}
                  placeholder="내용"
                  placeholderTextColor="#888"
                  value={annContent}
                  onChangeText={setAnnContent}
                  multiline
                />
                <TextInput
                  style={styles.input}
                  placeholder="이미지 URL 입력 또는 갤러리 첨부"
                  placeholderTextColor="#888"
                  value={annImageUrl.startsWith('data:') ? '' : annImageUrl}
                  onChangeText={setAnnImageUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.annActions}>
                  <TouchableOpacity
                    style={styles.annActionBtn}
                    onPress={handlePickAnnouncementImage}
                    disabled={annLoading}>
                    <Text style={styles.annActionText}>갤러리에서 첨부</Text>
                  </TouchableOpacity>
                  {annImageUrl.trim().length > 0 ? (
                    <TouchableOpacity
                      style={[styles.annActionBtn, styles.annDeleteBtn]}
                      onPress={() => setAnnImageUrl('')}
                      disabled={annLoading}>
                      <Text style={styles.annActionText}>이미지 제거</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {annImageUrl.trim().length > 0 ? (
                  <Image
                    source={{uri: annImageUrl.trim()}}
                    style={styles.announcementPreview}
                    resizeMode="cover"
                  />
                ) : null}
                <View style={styles.annActions}>
                  <TouchableOpacity
                    style={[styles.annActionBtn, styles.annDeleteBtn]}
                    onPress={resetAnnouncementForm}
                    disabled={annLoading}>
                    <Text style={styles.annActionText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.annActionBtn,
                      styles.newAnnBtn,
                      {marginBottom: 0},
                      annLoading && {opacity: 0.5},
                    ]}
                    onPress={handleSaveAnnouncement}
                    disabled={annLoading}>
                    {annLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.newAnnBtnText}>
                        {editingAnnouncementId ? '공지 수정 저장' : '공지 등록'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {announcements.map(a => (
              <View key={a.id} style={styles.annCard}>
                <View style={styles.annHeader}>
                  <Text style={styles.annTitle}>{a.title}</Text>
                  <View style={[styles.annBadge, a.is_active ? styles.annActive : styles.annInactive]}>
                    <Text style={styles.annBadgeText}>{a.is_active ? '활성' : '비활성'}</Text>
                  </View>
                </View>
                {a.imageUrl ? (
                  <Image
                    source={{uri: a.imageUrl}}
                    style={styles.annImage}
                    resizeMode="cover"
                  />
                ) : null}
                <Text style={styles.annContent}>{a.content}</Text>
                <Text style={styles.annDate}>{formatDate(a.created_at)}</Text>
                <View style={styles.annActions}>
                  <TouchableOpacity
                    style={styles.annActionBtn}
                    onPress={() => startEditAnnouncement(a)}>
                    <Text style={styles.annActionText}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.annActionBtn}
                    onPress={() => toggleAnnouncement(a.id, a.is_active)}>
                    <Text style={styles.annActionText}>{a.is_active ? '비활성화' : '활성화'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.annActionBtn, styles.annDeleteBtn]}
                    onPress={() => deleteAnnouncement(a.id)}>
                    <Text style={[styles.annActionText, {color: '#f87171'}]}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {announcements.length === 0 && <Text style={styles.emptyText}>공지사항 없음</Text>}
          </View>
        )}

        {/* BATTLES */}
        {tab === 'battles' && (
          <View>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>활성 방 ({rooms.length})</Text>
                <View style={{flexDirection: 'row', gap: 8}}>
                  <TouchableOpacity style={styles.smallBtn} onPress={loadBattles}>
                    <Text style={styles.smallBtnText}>새로고침</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.smallBtn, {backgroundColor: '#7f1d1d'}]} onPress={cleanupRooms}>
                    <Text style={styles.smallBtnText}>오래된방 정리</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {rooms.map(r => (
                <View key={r.code} style={styles.battleItem}>
                  <Text style={styles.battleCode}>{r.code}</Text>
                  <Text style={styles.battleStatus}>{r.status}</Text>
                  <Text style={styles.battleDate}>{formatDate(r.created_at)}</Text>
                </View>
              ))}
              {rooms.length === 0 && <Text style={styles.emptyText}>활성 방 없음</Text>}
            </View>

            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>매칭 대기 ({queueList.length})</Text>
                <TouchableOpacity style={[styles.smallBtn, {backgroundColor: '#7f1d1d'}]} onPress={cleanupQueue}>
                  <Text style={styles.smallBtnText}>대기열 정리</Text>
                </TouchableOpacity>
              </View>
              {queueList.map((q, i) => (
                <View key={i} style={styles.battleItem}>
                  <Text style={styles.battleCode}>{q.nickname || '?'}</Text>
                  <Text style={styles.battleStatus}>{q.status}</Text>
                  <Text style={styles.battleDate}>{formatDate(q.created_at)}</Text>
                </View>
              ))}
              {queueList.length === 0 && <Text style={styles.emptyText}>대기 없음</Text>}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0f0a2e'},
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1b4b',
  },
  backBtn: {width: 60},
  backText: {color: '#818cf8', fontSize: 16, fontWeight: '700'},
  title: {fontSize: 18, fontWeight: '800', color: '#fff'},
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1b4b',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
  },
  tabActive: {backgroundColor: '#6366f1'},
  tabText: {color: '#818cf8', fontSize: 12, fontWeight: '600'},
  tabTextActive: {color: '#fff'},
  content: {flex: 1, padding: 12},
  statGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12},
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNum: {fontSize: 28, fontWeight: '800', color: '#fff'},
  statLabel: {fontSize: 12, color: '#818cf8', marginTop: 4},
  refreshBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  refreshBtnText: {color: '#fff', fontWeight: '700'},
  toolCard: {
    marginTop: 12,
    backgroundColor: '#1f1446',
    borderWidth: 1,
    borderColor: '#5b4bda',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toolCardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  toolCardDescription: {
    color: '#b8b5ff',
    fontSize: 12,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1e1b4b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 12},
  cardRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  input: {
    backgroundColor: '#0f0a2e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#e2e8f0',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#312e81',
    marginBottom: 10,
  },
  fieldLabel: {color: '#818cf8', fontSize: 12, marginBottom: 6},
  typeScroll: {marginBottom: 10},
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#312e81',
    marginRight: 6,
  },
  typeChipActive: {backgroundColor: '#6366f1'},
  typeChipText: {color: '#818cf8', fontSize: 13},
  typeChipTextActive: {color: '#fff', fontWeight: '700'},
  userList: {
    backgroundColor: '#0f0a2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#312e81',
    marginBottom: 10,
    overflow: 'hidden',
  },
  userItem: {paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#312e81'},
  userItemSelected: {backgroundColor: '#312e81'},
  userItemText: {color: '#e2e8f0', fontSize: 14, fontWeight: '600'},
  userItemSub: {color: '#818cf8', fontSize: 12},
  selectedUserBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#312e81',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  selectedUserText: {color: '#a5b4fc', fontSize: 13, flex: 1},
  grantBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
  },
  grantBtnText: {color: '#fff', fontWeight: '800', fontSize: 15},
  bulkBtn: {
    backgroundColor: '#d97706',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bulkBtnText: {color: '#fff', fontWeight: '700'},
  historyItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#312e81',
  },
  historyUser: {color: '#e2e8f0', fontSize: 13, fontWeight: '600'},
  historyDetail: {color: '#818cf8', fontSize: 12, marginTop: 2},
  historyStatus: {fontSize: 11, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4},
  statusClaimed: {backgroundColor: '#14532d', color: '#4ade80'},
  statusPending: {backgroundColor: '#78350f', color: '#fbbf24'},
  historyDate: {color: '#4b5563', fontSize: 11, marginTop: 4},
  emptyText: {color: '#4b5563', textAlign: 'center', paddingVertical: 20},
  newAnnBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  newAnnBtnText: {color: '#fff', fontWeight: '700'},
  announcementPreview: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#0f172a',
  },
  annCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  annHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6},
  annTitle: {color: '#fff', fontSize: 14, fontWeight: '800', flex: 1},
  annBadge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6},
  annActive: {backgroundColor: '#14532d'},
  annInactive: {backgroundColor: '#374151'},
  annBadgeText: {color: '#fff', fontSize: 11, fontWeight: '700'},
  annImage: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#0f172a',
  },
  annContent: {color: '#a5b4fc', fontSize: 13, marginBottom: 6},
  annDate: {color: '#4b5563', fontSize: 11, marginBottom: 8},
  annActions: {flexDirection: 'row', gap: 8},
  annActionBtn: {
    flex: 1,
    backgroundColor: '#312e81',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  annDeleteBtn: {backgroundColor: '#1f1414'},
  annActionText: {color: '#a5b4fc', fontSize: 13, fontWeight: '600'},
  battleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#312e81',
    gap: 8,
  },
  battleCode: {color: '#e2e8f0', fontSize: 14, fontWeight: '700', width: 80},
  battleStatus: {color: '#818cf8', fontSize: 13, flex: 1},
  battleDate: {color: '#4b5563', fontSize: 12},
  smallBtn: {
    backgroundColor: '#312e81',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallBtnText: {color: '#fff', fontSize: 12, fontWeight: '600'},
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#312e81',
  },
  userRowName: {color: '#e2e8f0', fontSize: 14, fontWeight: '600'},
  userRowEmail: {color: '#818cf8', fontSize: 12, marginTop: 2},
  userRowDate: {color: '#4b5563', fontSize: 11, marginTop: 4},
  adminBadge: {
    backgroundColor: '#4f46e5',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  adminBadgeText: {color: '#fff', fontSize: 10, fontWeight: '700'},
});
