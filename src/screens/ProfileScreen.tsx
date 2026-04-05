import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BackImageButton from '../components/BackImageButton';
import {supabase, getCurrentUserId, getProfile} from '../services/supabase';
import {
  GameData,
  getNickname,
  getSelectedCharacter,
  loadEndlessStats,
  loadGameData,
  loadLevelProgress,
  setNickname as saveNickname,
  setSelectedCharacter,
  useDiamonds as spendDiamonds,
} from '../stores/gameStore';
import {MAX_HEARTS, formatHeartStatus, getConfiguredMaxHearts} from '../constants';
import {CHARACTER_CLASSES} from '../constants/characters';
import {
  changeNicknameWithServerCharge,
  getEconomyErrorCode,
} from '../services/economyService';

const CHARACTER_OPTIONS = CHARACTER_CLASSES.map(character => ({
  id: character.id,
  name: character.name,
}));

export default function ProfileScreen({navigation}: any) {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [nickname, setNicknameState] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameChanged, setNameChanged] = useState(false);
  const [checking, setChecking] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [selectedCharacter, setSelectedCharacterState] = useState('knight');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalGames: 0,
    highScore: 0,
    levelsCleared: 0,
    maxCombo: 0,
  });

  const loadAll = useCallback(async () => {
    const [loadedGameData, savedNickname, endlessStats, levelProgress, charId] =
      await Promise.all([
        loadGameData(),
        getNickname(),
        loadEndlessStats(),
        loadLevelProgress(),
        getSelectedCharacter(),
      ]);

    setGameData(loadedGameData);
    setNicknameState(savedNickname);
    if (charId) {
      setSelectedCharacterState(charId);
    }

    const clearedLevels = Object.values(levelProgress).filter(
      progress => progress.cleared,
    ).length;
    setStats({
      totalGames: endlessStats.totalGames,
      highScore: endlessStats.highScore,
      levelsCleared: clearedLevels,
      maxCombo: endlessStats.maxCombo,
    });

    const currentUserId = await getCurrentUserId();
    setUserId(currentUserId);

    if (!currentUserId) {
      return;
    }

    const {data: profile} = await getProfile(currentUserId);
    if (profile?.nickname) {
      setNicknameState(profile.nickname);
    }
    if (profile?.nickname_changed) {
      setNameChanged(true);
    }

    const {
      data: {user},
    } = await supabase.auth.getUser();
    if (user?.email) {
      setEmail(user.email);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const checkNickname = async (value: string) => {
    if (value.trim().length < 2) {
      setNameAvailable(null);
      return;
    }

    setChecking(true);
    const {data} = await supabase
      .from('profiles')
      .select('id')
      .eq('nickname', value.trim())
      .neq('id', userId || '')
      .limit(1);
    setNameAvailable(!data || data.length === 0);
    setChecking(false);
  };

  const handleSaveName = async () => {
    if (nameInput.trim().length < 2) {
      Alert.alert('알림', '닉네임은 2자 이상이어야 합니다.');
      return;
    }

    const {data} = await supabase
      .from('profiles')
      .select('id')
      .eq('nickname', nameInput.trim())
      .neq('id', userId || '')
      .limit(1);

    if (!(data && data.length > 0)) {
      try {
        const result = await changeNicknameWithServerCharge(nameInput.trim());
        setGameData(result.gameData);
        setNicknameState(result.nickname);
        setNameChanged(result.nicknameChanged);
        setEditingName(false);
        Alert.alert('?뚮┝', '?됰꽕?꾩씠 蹂寃쎈릺?덉뒿?덈떎.');
        return;
      } catch (error) {
        const code = getEconomyErrorCode(error);
        if (code === 'not_enough_diamonds_for_nickname') {
          Alert.alert('?뚮┝', '?ㅼ씠?꾧? 遺議깊빀?덈떎. (200 ?ㅼ씠???꾩슂)');
          return;
        }
        if (code === 'nickname_taken') {
          Alert.alert('?뚮┝', '?대? ?ъ슜 以묒씤 ?됰꽕?꾩엯?덈떎.');
          return;
        }

        Alert.alert('?뚮┝', '?됰꽕?꾩씠 蹂寃쎄릺吏 ?딆븯?듬땲??');
        return;
      }
    }

    if (data && data.length > 0) {
      Alert.alert('알림', '이미 사용 중인 닉네임입니다.');
      return;
    }

    if (nameChanged) {
      if (!gameData || gameData.diamonds < 200) {
        Alert.alert('알림', '다이아가 부족합니다. (200 다이아 필요)');
        return;
      }

      const updatedGameData = await spendDiamonds(gameData, 200);
      if (!updatedGameData) {
        Alert.alert('알림', '다이아가 부족합니다.');
        return;
      }
      setGameData(updatedGameData);
    }

    await saveNickname(nameInput.trim());
    setNicknameState(nameInput.trim());

    if (userId) {
      await supabase
        .from('profiles')
        .update({
          nickname: nameInput.trim(),
          nickname_changed: true,
        })
        .eq('id', userId);
    }

    setNameChanged(true);
    setEditingName(false);
    Alert.alert('알림', '닉네임이 변경되었습니다.');
  };

  if (!gameData) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.backBtn}>
            <BackImageButton onPress={() => navigation.goBack()} size={42} />
          </View>
          <Text style={styles.title}>프로필</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.card}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(nickname.charAt(0) || 'P').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.nickname}>{nickname}</Text>
          {email ? <Text style={styles.email}>{email}</Text> : null}

          <TouchableOpacity
            style={styles.editNameBtn}
            onPress={() => {
              setNameInput(nickname);
              setNameAvailable(null);
              setEditingName(true);
            }}>
            <Text style={styles.editNameText}>
              닉네임 변경 {nameChanged ? '(200 다이아)' : '(무료)'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>캐릭터 선택</Text>
          <View style={styles.resourceRow}>
            {CHARACTER_OPTIONS.map(character => (
              <TouchableOpacity
                key={character.id}
                style={[
                  styles.charItem,
                  selectedCharacter === character.id && styles.charItemActive,
                ]}
                onPress={async () => {
                  setSelectedCharacterState(character.id);
                  await setSelectedCharacter(character.id);
                  Alert.alert('알림', `${character.name}로 변경되었습니다.`);
                }}>
                <Text style={styles.charName}>{character.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {editingName && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>닉네임 변경</Text>
            {nameChanged && (
              <Text style={styles.costNotice}>
                다음부터는 변경 시 200 다이아가 소모됩니다.
              </Text>
            )}
            <TextInput
              autoFocus
              maxLength={10}
              placeholder="새 닉네임을 입력하세요 (2~10자)"
              placeholderTextColor="#999"
              style={styles.nameInput}
              value={nameInput}
              onChangeText={value => {
                setNameInput(value);
                setNameAvailable(null);
              }}
              onEndEditing={() => checkNickname(nameInput)}
            />
            {checking && <Text style={styles.checkText}>중복 확인 중...</Text>}
            {nameAvailable === true && (
              <Text style={styles.availableText}>사용 가능한 닉네임입니다.</Text>
            )}
            {nameAvailable === false && (
              <Text style={styles.unavailableText}>
                이미 사용 중인 닉네임입니다.
              </Text>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditingName(false)}>
                <Text style={styles.btnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkBtn}
                onPress={() => checkNickname(nameInput)}>
                <Text style={styles.btnText}>중복 확인</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveName}>
                <Text style={styles.btnText}>변경</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>보유 재화</Text>
          <View style={styles.resourceRow}>
            <View style={styles.resourceItem}>
              <Text style={styles.resourceEmoji}>❤️</Text>
              <Text style={styles.resourceValue}>
                {formatHeartStatus(gameData.hearts, getConfiguredMaxHearts(MAX_HEARTS))}
              </Text>
              <Text style={styles.resourceLabel}>하트</Text>
            </View>
            <View style={styles.resourceItem}>
              <Text style={styles.resourceEmoji}>🪙</Text>
              <Text style={styles.resourceValue}>{gameData.gold}</Text>
              <Text style={styles.resourceLabel}>골드</Text>
            </View>
            <View style={styles.resourceItem}>
              <Text style={styles.resourceEmoji}>💎</Text>
              <Text style={styles.resourceValue}>{gameData.diamonds}</Text>
              <Text style={styles.resourceLabel}>다이아</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>기록</Text>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalGames}</Text>
              <Text style={styles.statLabel}>총 게임</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.levelsCleared}</Text>
              <Text style={styles.statLabel}>클리어 스테이지</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.highScore.toLocaleString()}</Text>
              <Text style={styles.statLabel}>최고 점수</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.maxCombo}</Text>
              <Text style={styles.statLabel}>최대 콤보</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>보유 아이템</Text>
          <View style={styles.resourceRow}>
            <View style={styles.resourceItem}>
              <Text style={styles.resourceEmoji}>🔨</Text>
              <Text style={styles.resourceValue}>{gameData.items.hammer}</Text>
              <Text style={styles.resourceLabel}>망치</Text>
            </View>
            <View style={styles.resourceItem}>
              <Text style={styles.resourceEmoji}>🔄</Text>
              <Text style={styles.resourceValue}>{gameData.items.refresh}</Text>
              <Text style={styles.resourceLabel}>새로고침</Text>
            </View>
            <View style={styles.resourceItem}>
              <Text style={styles.resourceEmoji}>💣</Text>
              <Text style={styles.resourceValue}>{gameData.items.bomb}</Text>
              <Text style={styles.resourceLabel}>폭탄</Text>
            </View>
            <View style={styles.resourceItem}>
              <Text style={styles.resourceEmoji}>➕</Text>
              <Text style={styles.resourceValue}>{gameData.items.addTurns}</Text>
              <Text style={styles.resourceLabel}>턴 추가</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {backgroundColor: '#f0edf5', flex: 1},
  scroll: {padding: 16, paddingBottom: 40},
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {width: 60},
  backText: {color: '#6366f1', fontSize: 16, fontWeight: '700'},
  title: {color: '#333', fontSize: 20, fontWeight: '800'},
  headerSpacer: {width: 60},
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 2,
    marginBottom: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  avatarCircle: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    marginBottom: 12,
    width: 72,
  },
  avatarText: {color: '#fff', fontSize: 32, fontWeight: '800'},
  nickname: {color: '#333', fontSize: 22, fontWeight: '800', textAlign: 'center'},
  email: {color: '#888', fontSize: 13, marginTop: 4, textAlign: 'center'},
  editNameBtn: {
    alignSelf: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editNameText: {color: '#6366f1', fontSize: 14, fontWeight: '700'},
  sectionTitle: {color: '#333', fontSize: 16, fontWeight: '800', marginBottom: 12},
  costNotice: {color: '#ef4444', fontSize: 12, marginBottom: 8},
  nameInput: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
    borderRadius: 10,
    borderWidth: 1,
    color: '#333',
    fontSize: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  checkText: {color: '#888', fontSize: 12, marginBottom: 4},
  availableText: {color: '#22c55e', fontSize: 12, fontWeight: '600', marginBottom: 4},
  unavailableText: {color: '#ef4444', fontSize: 12, fontWeight: '600', marginBottom: 4},
  btnRow: {flexDirection: 'row', gap: 8, marginTop: 8},
  cancelBtn: {
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 10,
  },
  checkBtn: {
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 10,
  },
  confirmBtn: {
    alignItems: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 10,
  },
  btnText: {color: '#fff', fontSize: 14, fontWeight: '700'},
  resourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 12,
  },
  resourceItem: {alignItems: 'center', minWidth: 60},
  resourceEmoji: {fontSize: 28},
  resourceValue: {color: '#333', fontSize: 18, fontWeight: '800', marginTop: 4},
  resourceLabel: {color: '#888', fontSize: 11, marginTop: 2},
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 12,
  },
  statItem: {alignItems: 'center', minWidth: 70},
  statValue: {color: '#6366f1', fontSize: 18, fontWeight: '800'},
  statLabel: {color: '#888', fontSize: 11, marginTop: 2},
  charItem: {
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderColor: '#e0e0e0',
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 80,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  charItemActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  charName: {color: '#333', fontSize: 15, fontWeight: '700'},
});
