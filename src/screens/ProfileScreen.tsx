import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ViewShot, {captureRef} from 'react-native-view-shot';
import GamePanel from '../components/GamePanel';
import MenuScreenFrame from '../components/MenuScreenFrame';
import {openGameDialog} from '../services/gameDialogService';
import {supabase, getCurrentUserId, getProfile} from '../services/supabase';
import {updateOwnProfile} from '../services/playerState';
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
import {
  MAX_HEARTS,
  formatHeartStatus,
  getConfiguredMaxHearts,
} from '../constants';
import {CHARACTER_CLASSES} from '../constants/characters';
import {
  changeNicknameWithServerCharge,
  getEconomyErrorCode,
} from '../services/economyService';
import {ACTIVE_ITEM_KEYS, ITEM_DEFINITIONS} from '../constants/itemCatalog';

const CHARACTER_OPTIONS = CHARACTER_CLASSES.map(character => ({
  id: character.id,
  name: character.name,
  emoji: character.emoji,
}));

const ITEM_SUMMARY = ACTIVE_ITEM_KEYS.map(itemKey => ({
  key: itemKey,
  emoji: ITEM_DEFINITIONS[itemKey].emoji,
  label: ITEM_DEFINITIONS[itemKey].label,
}));

const AVATAR_MAX_BYTES = 100 * 1024;
const AVATAR_CAPTURE_SIZES = [420, 360, 320, 280, 240];
const AVATAR_CAPTURE_QUALITIES = [0.92, 0.86, 0.8, 0.74, 0.68, 0.6, 0.52, 0.44];
const AVATAR_PREVIEW_SIZE = 420;

function estimateBase64Bytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarSourceUri, setAvatarSourceUri] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarStatusText, setAvatarStatusText] = useState('');
  const [stats, setStats] = useState({
    totalGames: 0,
    highScore: 0,
    levelsCleared: 0,
    maxCombo: 0,
  });

  const avatarShotRef = useRef<ViewShot | null>(null);
  const avatarLoadResolveRef = useRef<(() => void) | null>(null);
  const avatarLoadRejectRef = useRef<((error: Error) => void) | null>(null);
  const avatarLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedCharacterMeta = useMemo(
    () =>
      CHARACTER_OPTIONS.find(character => character.id === selectedCharacter) ??
      CHARACTER_OPTIONS[0],
    [selectedCharacter],
  );

  const clearPendingAvatarLoad = useCallback(() => {
    if (avatarLoadTimeoutRef.current) {
      clearTimeout(avatarLoadTimeoutRef.current);
      avatarLoadTimeoutRef.current = null;
    }
    avatarLoadResolveRef.current = null;
    avatarLoadRejectRef.current = null;
  }, []);

  const waitForAvatarPreviewLoad = useCallback(() => {
    clearPendingAvatarLoad();

    return new Promise<void>((resolve, reject) => {
      avatarLoadResolveRef.current = () => {
        clearPendingAvatarLoad();
        resolve();
      };
      avatarLoadRejectRef.current = (error: Error) => {
        clearPendingAvatarLoad();
        reject(error);
      };
      avatarLoadTimeoutRef.current = setTimeout(() => {
        avatarLoadRejectRef.current?.(
          new Error('프로필 사진을 불러오는 데 시간이 너무 오래 걸립니다.'),
        );
      }, 8000);
    });
  }, [clearPendingAvatarLoad]);

  const handleAvatarSourceLoaded = useCallback(() => {
    avatarLoadResolveRef.current?.();
  }, []);

  const handleAvatarSourceError = useCallback(() => {
    avatarLoadRejectRef.current?.(
      new Error('프로필 사진을 불러오지 못했습니다. 다른 이미지를 선택해 주세요.'),
    );
  }, []);

  const compressAvatarFromPreview = useCallback(async () => {
    if (!avatarShotRef.current) {
      throw new Error('프로필 사진 압축 캔버스를 준비하지 못했습니다.');
    }

    let bestBase64 = '';
    let bestBytes = Number.POSITIVE_INFINITY;

    for (const size of AVATAR_CAPTURE_SIZES) {
      for (const quality of AVATAR_CAPTURE_QUALITIES) {
        const base64 = await captureRef(avatarShotRef.current, {
          format: 'jpg',
          quality,
          result: 'base64',
          width: size,
          height: size,
        });
        const bytes = estimateBase64Bytes(base64);

        if (bytes < bestBytes) {
          bestBase64 = base64;
          bestBytes = bytes;
        }

        if (bytes <= AVATAR_MAX_BYTES) {
          return {
            dataUri: `data:image/jpeg;base64,${base64}`,
            bytes,
          };
        }
      }
    }

    if (!bestBase64) {
      throw new Error('프로필 사진 압축에 실패했습니다.');
    }

    return {
      dataUri: `data:image/jpeg;base64,${bestBase64}`,
      bytes: bestBytes,
    };
  }, []);

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
    if (typeof profile?.avatar_url === 'string' && profile.avatar_url.length > 0) {
      setAvatarUrl(profile.avatar_url);
    } else {
      setAvatarUrl(null);
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
    return () => clearPendingAvatarLoad();
  }, [clearPendingAvatarLoad, loadAll]);

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
      openGameDialog({
        title: '알림',
        message: '닉네임은 2자 이상이어야 합니다.',
      });
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
        openGameDialog({
          title: '알림',
          message: '닉네임이 변경되었습니다.',
        });
        return;
      } catch (error) {
        const code = getEconomyErrorCode(error);
        if (code === 'not_enough_diamonds_for_nickname') {
          openGameDialog({
            title: '알림',
            message: '다이아가 부족합니다. (200 다이아 필요)',
          });
          return;
        }
        if (code === 'nickname_taken') {
          openGameDialog({
            title: '알림',
            message: '이미 사용 중인 닉네임입니다.',
          });
          return;
        }

        openGameDialog({
          title: '알림',
          message: '닉네임을 변경하지 못했습니다.',
        });
        return;
      }
    }

    if (data && data.length > 0) {
      openGameDialog({
        title: '알림',
        message: '이미 사용 중인 닉네임입니다.',
      });
      return;
    }

    if (nameChanged) {
      if (!gameData || gameData.diamonds < 200) {
        openGameDialog({
          title: '알림',
          message: '다이아가 부족합니다. (200 다이아 필요)',
        });
        return;
      }

      const updatedGameData = await spendDiamonds(gameData, 200);
      if (!updatedGameData) {
        openGameDialog({
          title: '알림',
          message: '다이아가 부족합니다.',
        });
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
    openGameDialog({
      title: '알림',
      message: '닉네임이 변경되었습니다.',
    });
  }, [gameData, nameChanged, nameInput, userId]);

  const handlePickAvatar = useCallback(async () => {
    if (avatarUploading) {
      return;
    }

    try {
      if (!userId) {
        throw new Error('프로필 사진 업로드는 로그인 후 사용할 수 있습니다.');
      }

      setAvatarUploading(true);
      setAvatarStatusText('사진을 선택하는 중...');

      const {launchImageLibrary} = require('react-native-image-picker') as {
        launchImageLibrary: (options: Record<string, unknown>) => Promise<any>;
      };
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: false,
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 1,
        assetRepresentationMode: 'compatible',
        conversionQuality: 1,
      });

      if (result.didCancel) {
        setAvatarStatusText('');
        setAvatarUploading(false);
        return;
      }

      if (result.errorMessage) {
        throw new Error(result.errorMessage);
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        throw new Error('선택한 이미지를 불러오지 못했습니다.');
      }

      setAvatarStatusText('사진을 불러오는 중...');
      setAvatarSourceUri(asset.uri);
      await waitForAvatarPreviewLoad();

      setAvatarStatusText('사진을 100KB 이하로 최적화하는 중...');
      const compressed = await compressAvatarFromPreview();

      setAvatarStatusText('프로필에 저장하는 중...');
      const updatedProfile = await updateOwnProfile({
        avatar_url: compressed.dataUri,
      });
      const nextAvatarUrl =
        typeof updatedProfile?.avatar_url === 'string'
          ? updatedProfile.avatar_url
          : compressed.dataUri;
      setAvatarUrl(nextAvatarUrl);
      setAvatarSourceUri(null);
      setAvatarStatusText('');
      openGameDialog({
        title: '알림',
        message: `프로필 사진이 저장되었습니다. (${Math.ceil(
          compressed.bytes / 1024,
        )}KB)`,
      });
    } catch (error: any) {
      setAvatarSourceUri(null);
      setAvatarStatusText('');
      openGameDialog({
        title: '프로필 사진 업로드 실패',
        message: error?.message ?? '프로필 사진을 저장하지 못했습니다.',
      });
    } finally {
      clearPendingAvatarLoad();
      setAvatarUploading(false);
    }
  }, [
    avatarUploading,
    clearPendingAvatarLoad,
    compressAvatarFromPreview,
    userId,
    waitForAvatarPreviewLoad,
  ]);

  if (!gameData) {
    return null;
  }

  return (
    <MenuScreenFrame
      title="프로필"
      subtitle="영웅 상태와 기록, 아이템과 프로필 사진을 관리합니다."
      onBack={() => navigation.goBack()}>
      <GamePanel style={styles.heroPanel}>
        {avatarUrl ? (
          <View style={styles.avatarImageFrame}>
            <Image source={{uri: avatarUrl}} style={styles.avatarImage} />
          </View>
        ) : (
          <View style={styles.avatarBadge}>
            <Text style={styles.avatarText}>
              {(nickname.charAt(0) || 'P').toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.nickname}>{nickname}</Text>
        {email ? <Text style={styles.email}>{email}</Text> : null}
        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaChip}>
            <Text style={styles.heroMetaLabel}>현재 직업</Text>
            <Text style={styles.heroMetaValue}>
              {selectedCharacterMeta.emoji} {selectedCharacterMeta.name}
            </Text>
          </View>
          <View style={styles.heroMetaChip}>
            <Text style={styles.heroMetaLabel}>하트 상태</Text>
            <Text style={styles.heroMetaValue}>
              {formatHeartStatus(
                gameData.hearts,
                getConfiguredMaxHearts(MAX_HEARTS),
              )}
            </Text>
          </View>
        </View>
        <View style={styles.heroActionRow}>
          <TouchableOpacity
            style={[styles.primaryButton, styles.flexButton]}
            onPress={() => {
              setNameInput(nickname);
              setNameAvailable(null);
              setEditingName(true);
            }}>
            <Text style={styles.primaryButtonText}>
              닉네임 변경 {nameChanged ? '(200 다이아)' : '(무료)'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              styles.flexButton,
              avatarUploading && styles.disabledButton,
            ]}
            disabled={avatarUploading}
            onPress={handlePickAvatar}>
            <Text style={styles.secondaryButtonText}>
              {avatarUrl ? '프로필 사진 변경' : '프로필 사진 업로드'}
            </Text>
          </TouchableOpacity>
        </View>
        {avatarUploading ? (
          <View style={styles.avatarUploadingRow}>
            <ActivityIndicator color="#7f5a32" size="small" />
            <Text style={styles.avatarUploadingText}>
              {avatarStatusText || '프로필 사진을 처리하는 중...'}
            </Text>
          </View>
        ) : (
          <Text style={styles.avatarHint}>
            큰 사진은 자동으로 고화질을 유지하면서 100KB 이하로 압축해 저장합니다.
          </Text>
        )}
      </GamePanel>

      {editingName ? (
        <GamePanel>
          <Text style={styles.sectionTitle}>닉네임 변경</Text>
          <Text style={styles.sectionHint}>
            2~10자까지 사용할 수 있습니다. 저장 전 중복 확인을 해주세요.
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
              {formatHeartStatus(
                gameData.hearts,
                getConfiguredMaxHearts(MAX_HEARTS),
              )}
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

      <View pointerEvents="none" style={styles.hiddenCaptureRoot}>
        <ViewShot ref={avatarShotRef} style={styles.hiddenCaptureFrame}>
          {avatarSourceUri ? (
            <View style={styles.hiddenCaptureInner}>
              <Image
                source={{uri: avatarSourceUri}}
                style={styles.hiddenCaptureImage}
                resizeMode="cover"
                onLoad={handleAvatarSourceLoaded}
                onError={handleAvatarSourceError}
              />
            </View>
          ) : (
            <View style={styles.hiddenCaptureInner} />
          )}
        </ViewShot>
      </View>
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
  avatarImageFrame: {
    width: 92,
    height: 92,
    borderRadius: 46,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#f7d6a0',
    backgroundColor: '#d3b184',
    marginBottom: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
  heroActionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  avatarUploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  avatarUploadingText: {
    color: '#7b5a39',
    fontSize: 13,
    fontWeight: '700',
  },
  avatarHint: {
    color: '#856348',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 12,
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
    textAlign: 'center',
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
    textAlign: 'center',
  },
  flexButton: {
    flex: 1,
  },
  disabledButton: {
    opacity: 0.6,
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
  hiddenCaptureRoot: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: AVATAR_PREVIEW_SIZE,
    height: AVATAR_PREVIEW_SIZE,
  },
  hiddenCaptureFrame: {
    width: AVATAR_PREVIEW_SIZE,
    height: AVATAR_PREVIEW_SIZE,
  },
  hiddenCaptureInner: {
    width: AVATAR_PREVIEW_SIZE,
    height: AVATAR_PREVIEW_SIZE,
    backgroundColor: '#0f1728',
    borderRadius: AVATAR_PREVIEW_SIZE / 2,
    overflow: 'hidden',
  },
  hiddenCaptureImage: {
    width: '100%',
    height: '100%',
  },
});
