import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import GamePanel from '../components/GamePanel';
import MenuScreenFrame from '../components/MenuScreenFrame';
import {openGameDialog} from '../services/gameDialogService';
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
  emoji: character.emoji,
}));

const ITEM_SUMMARY = [
  {key: 'hammer', emoji: '🔨', label: '망치'},
  {key: 'refresh', emoji: '🔄', label: '새로고침'},
  {key: 'bomb', emoji: '💣', label: '폭탄'},
  {key: 'addTurns', emoji: '➕', label: '턴 추가'},
] as const;

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

  const selectedCharacterMeta = useMemo(
    () =>
      CHARACTER_OPTIONS.find(character => character.id === selectedCharacter) ??
      CHARACTER_OPTIONS[0],
    [selectedCharacter],
  );

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

  const checkNickname = useCallback(
    async (value: string) => {
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
    },
    [userId],
  );

  const handleSaveName = useCallback(async () => {
    if (nameInput.trim().length < 2) {
      openGameDialog({title: '알림', message: '닉네임은 2자 이상이어야 합니다.'});
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
        openGameDialog({title: '알림', message: '닉네임이 변경되었습니다.'});
        return;
      } catch (error) {
        const code = getEconomyErrorCode(error);
        if (code === 'not_enough_diamonds_for_nickname') {
          openGameDialog({title: '알림', message: '다이아가 부족합니다. (200 다이아 필요)'});
          return;
        }
        if (code === 'nickname_taken') {
          openGameDialog({title: '알림', message: '이미 사용 중인 닉네임입니다.'});
          return;
        }

        openGameDialog({title: '알림', message: '닉네임이 변경되지 않았습니다.'});
        return;
      }
    }

    if (data && data.length > 0) {
      openGameDialog({title: '알림', message: '이미 사용 중인 닉네임입니다.'});
      return;
    }

    if (nameChanged) {
      if (!gameData || gameData.diamonds < 200) {
        openGameDialog({title: '알림', message: '다이아가 부족합니다. (200 다이아 필요)'});
        return;
      }

      const updatedGameData = await spendDiamonds(gameData, 200);
      if (!updatedGameData) {
        openGameDialog({title: '알림', message: '다이아가 부족합니다.'});
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
    openGameDialog({title: '알림', message: '닉네임이 변경되었습니다.'});
  }, [gameData, nameChanged, nameInput, userId]);

  if (!gameData) {
    return null;
  }

  return (
    <MenuScreenFrame
      title="프로필"
      subtitle="내 대표 캐릭터, 자원, 전적을 한 눈에 확인합니다."
      onBack={() => navigation.goBack()}>
      <GamePanel style={styles.heroPanel}>
        <View style={styles.avatarBadge}>
          <Text style={styles.avatarText}>
            {(nickname.charAt(0) || 'P').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.nickname}>{nickname}</Text>
        {email ? <Text style={styles.email}>{email}</Text> : null}
        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaChip}>
            <Text style={styles.heroMetaLabel}>대표 직업</Text>
            <Text style={styles.heroMetaValue}>
              {selectedCharacterMeta.emoji} {selectedCharacterMeta.name}
            </Text>
          </View>
          <View style={styles.heroMetaChip}>
            <Text style={styles.heroMetaLabel}>하트 상태</Text>
            <Text style={styles.heroMetaValue}>
              {formatHeartStatus(gameData.hearts, getConfiguredMaxHearts(MAX_HEARTS))}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            setNameInput(nickname);
            setNameAvailable(null);
            setEditingName(true);
          }}>
          <Text style={styles.primaryButtonText}>
            닉네임 변경 {nameChanged ? '(200 다이아)' : '(무료)'}
          </Text>
        </TouchableOpacity>
      </GamePanel>

      {editingName ? (
        <GamePanel>
          <Text style={styles.sectionTitle}>닉네임 변경</Text>
          <Text style={styles.sectionHint}>
            2~10자까지 사용할 수 있습니다. 중복 확인 후 저장하세요.
          </Text>
          {nameChanged ? (
            <Text style={styles.warningText}>
              다음부터는 변경 시 200 다이아가 소모됩니다.
            </Text>
          ) : null}
          <TextInput
            autoFocus
            maxLength={10}
            placeholder="새 닉네임 입력"
            placeholderTextColor="#9a7b58"
            style={styles.nameInput}
            value={nameInput}
            onChangeText={value => {
              setNameInput(value);
              setNameAvailable(null);
            }}
            onEndEditing={() => checkNickname(nameInput)}
          />
          {checking ? <Text style={styles.infoText}>중복 확인 중...</Text> : null}
          {nameAvailable === true ? (
            <Text style={styles.successText}>사용 가능한 닉네임입니다.</Text>
          ) : null}
          {nameAvailable === false ? (
            <Text style={styles.warningText}>이미 사용 중인 닉네임입니다.</Text>
          ) : null}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.secondaryButton, styles.flexButton]}
              onPress={() => setEditingName(false)}>
              <Text style={styles.secondaryButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, styles.flexButton]}
              onPress={() => checkNickname(nameInput)}>
              <Text style={styles.secondaryButtonText}>중복 확인</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, styles.flexButton]}
              onPress={handleSaveName}>
              <Text style={styles.primaryButtonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </GamePanel>
      ) : null}

      <GamePanel>
        <Text style={styles.sectionTitle}>캐릭터 선택</Text>
        <View style={styles.characterGrid}>
          {CHARACTER_OPTIONS.map(character => {
            const active = selectedCharacter === character.id;
            return (
              <TouchableOpacity
                key={character.id}
                style={[styles.characterCard, active && styles.characterCardActive]}
                onPress={async () => {
                  setSelectedCharacterState(character.id);
                  await setSelectedCharacter(character.id);
                  openGameDialog({
                    title: '알림',
                    message: `${character.name}로 변경되었습니다.`,
                  });
                }}>
                <Text style={styles.characterEmoji}>{character.emoji}</Text>
                <Text
                  style={[
                    styles.characterName,
                    active && styles.characterNameActive,
                  ]}>
                  {character.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </GamePanel>

      <GamePanel>
        <Text style={styles.sectionTitle}>보유 재화</Text>
        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricEmoji}>❤️</Text>
            <Text style={styles.metricValue}>
              {formatHeartStatus(gameData.hearts, getConfiguredMaxHearts(MAX_HEARTS))}
            </Text>
            <Text style={styles.metricLabel}>하트</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricEmoji}>🪙</Text>
            <Text style={styles.metricValue}>{gameData.gold}</Text>
            <Text style={styles.metricLabel}>골드</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricEmoji}>💎</Text>
            <Text style={styles.metricValue}>{gameData.diamonds}</Text>
            <Text style={styles.metricLabel}>다이아</Text>
          </View>
        </View>
      </GamePanel>

      <GamePanel>
        <Text style={styles.sectionTitle}>기록</Text>
        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{stats.totalGames}</Text>
            <Text style={styles.metricLabel}>총 게임</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{stats.levelsCleared}</Text>
            <Text style={styles.metricLabel}>클리어 스테이지</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{stats.highScore.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>최고 점수</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{stats.maxCombo}</Text>
            <Text style={styles.metricLabel}>최대 콤보</Text>
          </View>
        </View>
      </GamePanel>

      <GamePanel>
        <Text style={styles.sectionTitle}>보유 아이템</Text>
        <View style={styles.metricGrid}>
          {ITEM_SUMMARY.map(item => (
            <View key={item.key} style={styles.metricCard}>
              <Text style={styles.metricEmoji}>{item.emoji}</Text>
              <Text style={styles.metricValue}>{gameData.items[item.key]}</Text>
              <Text style={styles.metricLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </GamePanel>
    </MenuScreenFrame>
  );
}

const styles = StyleSheet.create({
  heroPanel: {
    alignItems: 'center',
  },
  avatarBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7f5a32',
    borderWidth: 3,
    borderColor: '#f7d6a0',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff7ec',
    fontSize: 34,
    fontWeight: '900',
  },
  nickname: {
    color: '#4b2f18',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  email: {
    color: '#7f6248',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 16,
    width: '100%',
  },
  heroMetaChip: {
    flex: 1,
    backgroundColor: '#f9ecd5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d2b089',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  heroMetaLabel: {
    color: '#8d6947',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroMetaValue: {
    color: '#5c391d',
    fontSize: 15,
    fontWeight: '900',
  },
  primaryButton: {
    backgroundColor: '#7f5a32',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4f3118',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#fff6ea',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    backgroundColor: '#f5e8d0',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#b38961',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#714c29',
    fontSize: 15,
    fontWeight: '900',
  },
  flexButton: {
    flex: 1,
  },
  sectionTitle: {
    color: '#50321a',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  sectionHint: {
    color: '#886447',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  warningText: {
    color: '#b34b39',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    color: '#7f6248',
    fontSize: 13,
    marginTop: 8,
  },
  successText: {
    color: '#2d7d4c',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  nameInput: {
    backgroundColor: '#fff9ef',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#d4b48d',
    color: '#4f3118',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  characterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  characterCard: {
    width: '31%',
    minWidth: 92,
    backgroundColor: '#fff8ec',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#d6b48d',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  characterCardActive: {
    backgroundColor: '#7f5a32',
    borderColor: '#4f3118',
  },
  characterEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  characterName: {
    color: '#613d20',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  characterNameActive: {
    color: '#fff5e7',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    minWidth: 132,
    backgroundColor: '#f8ebd3',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d1ab7f',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  metricEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  metricValue: {
    color: '#4d2f17',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  metricLabel: {
    color: '#866347',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 5,
  },
});
