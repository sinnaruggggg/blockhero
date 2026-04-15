import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import MageSprite from '../components/MageSprite';
import KnightSprite from '../components/KnightSprite';
import GameBottomNav from '../components/GameBottomNav';
import MenuFloatingBlocks from '../components/MenuFloatingBlocks';
import {CHARACTER_CLASSES, getCharacterAtk, getCharacterHp} from '../constants/characters';
import {loadCharacterData, CharacterData} from '../stores/gameStore';
import {
  getCharacterSkillEffects,
  getDynamicHeartCap,
  getDynamicHeartRegenMs,
} from '../game/characterSkillEffects';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  StatusBar,
  Modal,
  ScrollView,
  Animated,
  unstable_batchedUpdates,
  useWindowDimensions,
} from 'react-native';
import {
  accelerometer,
  SensorTypes,
  setUpdateIntervalForType,
} from 'react-native-sensors';
import {SafeAreaView} from 'react-native-safe-area-context';
import {fetchAnnouncements, claimPendingGrants} from '../services/adminSync';
import {
  getEconomyErrorCode,
  purchaseShopItem,
} from '../services/economyService';
import {t} from '../i18n';
import {
  loadGameData,
  getSelectedCharacter,
  setSelectedCharacter,
  GameData,
} from '../stores/gameStore';
import {
  HEART_REGEN_MS,
  INFINITE_HEARTS_VALUE,
  MAX_HEARTS,
  formatHeartStatus,
  getConfiguredMaxHearts,
} from '../constants';
import {
  getCachedCharacterVisualTunings,
  loadCharacterVisualTunings,
  subscribeCharacterVisualTunings,
} from '../stores/characterVisualTuning';

const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');
const W = SCREEN_W;
const H = SCREEN_H;
const HOME_BACKGROUND_SCALE = 1.1;
const ANNOUNCE_SLOT_HEIGHT = 34;

const IMG_BG = require('../assets/ui/background.jpg');
const IMG_TITLE = require('../assets/ui/title.png');
const IMG_PROFILE = require('../assets/ui/profile.png');
const IMG_SETTINGS = require('../assets/ui/settings.png');
const IMG_REWARD = require('../assets/ui/reward.png');
const IMG_LEVEL = require('../assets/ui/level.png');
const IMG_ENDLESS = require('../assets/ui/endless.png');
const IMG_RANKING = require('../assets/ui/ranking.png');
const IMG_BATTLE = require('../assets/ui/battle.png');
const IMG_RAID = require('../assets/ui/raid.png');
const IMG_CURRENCY = require('../assets/ui/currency_bar.png');

const MODE_BTN_SIZE = W * 0.23;
const TOP_ICON_SIZE = W * 0.12;
const KNIGHT_SIZE = W * 0.57 * 1.5;
const MAGE_SIZE = KNIGHT_SIZE / 1.3;
const KNIGHT_DISPLAY_SIZE = KNIGHT_SIZE / 1.3;

const CHARACTERS = CHARACTER_CLASSES.map(characterClass => ({
  id: characterClass.id,
  name: characterClass.name,
  emoji: characterClass.emoji,
  description: characterClass.description,
}));

const CHARACTER_THEMES: Record<
  string,
  {
    accent: string;
    accentSoft: string;
    ink: string;
    frame: string;
  }
> = {
  knight: {
    accent: '#d67f39',
    accentSoft: '#f6d4a8',
    ink: '#5f381c',
    frame: '#8f5732',
  },
  mage: {
    accent: '#6c7df2',
    accentSoft: '#d9ddff',
    ink: '#29337d',
    frame: '#5464c7',
  },
  archer: {
    accent: '#4aa65e',
    accentSoft: '#d8f2cc',
    ink: '#265a2d',
    frame: '#4f8751',
  },
  rogue: {
    accent: '#c85a64',
    accentSoft: '#ffd7d8',
    ink: '#742c34',
    frame: '#95444e',
  },
  healer: {
    accent: '#f0b84b',
    accentSoft: '#fff0c8',
    ink: '#83561c',
    frame: '#b47c2e',
  },
};

export default function HomeScreen({navigation}: any) {
  const windowSize = useWindowDimensions();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [timerText, setTimerText] = useState('');
  const [announcement, setAnnouncement] = useState<{
    title: string;
    content: string;
    imageUrl?: string | null;
  } | null>(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [selectedChar, setSelectedCharState] = useState<string | null>(null);
  const [showCharSelect, setShowCharSelect] = useState(false);
  const [charData, setCharData] = useState<CharacterData | null>(null);
  const [charDataMap, setCharDataMap] = useState<Record<string, CharacterData>>(
    {},
  );
  const [characterVisualTunings, setCharacterVisualTunings] = useState(
    getCachedCharacterVisualTunings(),
  );
  const pendingGrantsCheckedRef = useRef(false);
  const announcementsLoadedRef = useRef(false);
  const characterRows = useMemo(() => {
    const rows: Array<(typeof CHARACTERS)[number][]> = [];

    for (let index = 0; index < CHARACTERS.length; index += 2) {
      rows.push(CHARACTERS.slice(index, index + 2));
    }

    return rows;
  }, []);

  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;

  const heartEffects =
    selectedChar && charData
      ? getCharacterSkillEffects(selectedChar, charData, {mode: 'level'})
      : getCharacterSkillEffects(null, null);
  const hasInfiniteHearts = (gameData?.hearts ?? 0) >= INFINITE_HEARTS_VALUE;
  const maxHearts = getConfiguredMaxHearts(
    getDynamicHeartCap(MAX_HEARTS, heartEffects),
    hasInfiniteHearts,
  );
  const heartRegenMs = getDynamicHeartRegenMs(HEART_REGEN_MS, heartEffects);
  const selectedCharacterClass =
    CHARACTER_CLASSES.find(characterClass => characterClass.id === selectedChar) ??
    CHARACTER_CLASSES[0];
  const selectedCharacterTheme =
    CHARACTER_THEMES[selectedCharacterClass.id] ?? CHARACTER_THEMES.knight;
  const selectedCharacterTuning =
    characterVisualTunings[selectedCharacterClass.id as keyof typeof characterVisualTunings] ??
    characterVisualTunings.knight;
  const mainCharacterBaseWidth =
    selectedCharacterClass.id === 'mage'
      ? MAGE_SIZE
      : selectedCharacterClass.id === 'knight'
        ? KNIGHT_DISPLAY_SIZE
        : KNIGHT_DISPLAY_SIZE * 0.58;
  const mainCharacterBaseHeight =
    selectedCharacterClass.id === 'mage'
      ? Math.round(MAGE_SIZE * (1088 / 720))
      : selectedCharacterClass.id === 'knight'
        ? Math.round(KNIGHT_DISPLAY_SIZE * (956 / 700))
        : KNIGHT_DISPLAY_SIZE * 0.72;
  const mainCharacterDisplayWidth = Math.max(
    mainCharacterBaseWidth * selectedCharacterTuning.showcaseScaleMultiplier,
    120,
  );
  const mainCharacterDisplayHeight = Math.max(
    mainCharacterBaseHeight * selectedCharacterTuning.showcaseScaleMultiplier,
    170,
  );
  const mainCharacterTapWidth = Math.round(mainCharacterDisplayWidth * 0.5);
  const mainCharacterTapHeight = Math.round(mainCharacterDisplayHeight * 0.86);
  const selectedCharacterLevel =
    charDataMap[selectedCharacterClass.id]?.level ?? charData?.level ?? 1;
  const selectedCharacterAtk = getCharacterAtk(
    selectedCharacterClass.id,
    selectedCharacterLevel,
  );
  const selectedCharacterHp = getCharacterHp(
    selectedCharacterClass.id,
    selectedCharacterLevel,
  );

  useEffect(() => {
    setUpdateIntervalForType(SensorTypes.accelerometer, 50);
    const subscription = accelerometer.subscribe(({x, y}) => {
      const clampedX = Math.max(-3, Math.min(3, x));
      const clampedY = Math.max(-3, Math.min(3, y));
      Animated.spring(tiltX, {
        toValue: clampedX,
        useNativeDriver: true,
        friction: 10,
        tension: 40,
      }).start();
      Animated.spring(tiltY, {
        toValue: clampedY,
        useNativeDriver: true,
        friction: 10,
        tension: 40,
      }).start();
    });

    return () => subscription.unsubscribe();
  }, [tiltX, tiltY]);

  useEffect(() => {
    let active = true;
    loadCharacterVisualTunings().then(nextTunings => {
      if (active) {
        setCharacterVisualTunings(nextTunings);
      }
    });
    const unsubscribe = subscribeCharacterVisualTunings(nextTunings => {
      if (active) {
        setCharacterVisualTunings(nextTunings);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const parallax = useCallback(
    (depth: number) => ({
      transform: [
        {
          translateX: tiltX.interpolate({
            inputRange: [-3, 3],
            outputRange: [-depth, depth],
          }),
        },
        {
          translateY: tiltY.interpolate({
            inputRange: [-3, 3],
            outputRange: [depth, -depth],
          }),
        },
      ],
    }),
    [tiltX, tiltY],
  );

  const backgroundParallaxStyle = useCallback(
    () => ({
      transform: [
        {scale: HOME_BACKGROUND_SCALE},
        {
          translateX: tiltX.interpolate({
            inputRange: [-3, 3],
            outputRange: [-8, 8],
          }),
        },
        {
          translateY: tiltY.interpolate({
            inputRange: [-3, 3],
            outputRange: [8, -8],
          }),
        },
      ],
    }),
    [tiltX, tiltY],
  );

  const renderCharacterPreview = useCallback(
    (characterId: string, size: number, compact: boolean = false) => {
      const visual =
        CHARACTER_CLASSES.find(characterClass => characterClass.id === characterId) ??
        CHARACTER_CLASSES[0];
      const theme = CHARACTER_THEMES[characterId] ?? CHARACTER_THEMES.knight;
      const tuning =
        characterVisualTunings[
          characterId as keyof typeof characterVisualTunings
        ] ?? characterVisualTunings.knight;
      const showcaseTransform = {
        transform: [
          {translateX: tuning.showcaseOffsetX},
          {translateY: tuning.showcaseOffsetY},
          {scale: tuning.showcaseScaleMultiplier * (compact ? 0.8 : 1)},
        ],
      };

      if (characterId === 'mage') {
        return (
          <View style={[styles.modalSpriteWrap, showcaseTransform]}>
            <View style={styles.mageFlip}>
              <MageSprite size={size} />
            </View>
          </View>
        );
      }

      if (characterId === 'knight') {
        return (
          <View style={[styles.modalSpriteWrap, showcaseTransform]}>
            <KnightSprite size={size} />
          </View>
        );
      }

      const badgeSize = compact ? size * 0.54 : size * 0.62;
      return (
        <View
          style={[
            styles.charPreviewBadgeWrap,
            styles.charEmojiBadge,
            showcaseTransform,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: theme.accentSoft,
              borderColor: theme.frame,
            },
          ]}>
          <Text style={[styles.charEmojiBadgeText, {fontSize: badgeSize * 0.46}]}>
            {visual.emoji}
          </Text>
        </View>
      );
    },
    [characterVisualTunings],
  );

  const renderSelectedCharacterShowcase = useCallback(() => {
    const showcaseTransform = {
      transform: [
        {translateX: selectedCharacterTuning.showcaseOffsetX},
        {translateY: selectedCharacterTuning.showcaseOffsetY},
        {scale: selectedCharacterTuning.showcaseScaleMultiplier},
      ],
    };

    if (selectedCharacterClass.id === 'mage') {
      return (
        <View style={[styles.mainCharacterSpriteWrap, showcaseTransform]}>
          <View style={styles.mageFlip}>
            <MageSprite size={MAGE_SIZE} />
          </View>
          <View style={styles.mageShadow} />
        </View>
      );
    }

    if (selectedCharacterClass.id === 'knight') {
      return (
        <View style={[styles.mainCharacterSpriteWrap, showcaseTransform]}>
          <View style={styles.knightWrap}>
            <View style={styles.knightShadow} />
            <KnightSprite size={KNIGHT_DISPLAY_SIZE} />
          </View>
        </View>
      );
    }

    const badgeSize = KNIGHT_DISPLAY_SIZE * 0.6;
    return (
      <View style={[styles.mainCharacterSpriteWrap, showcaseTransform]}>
        <View
          style={[
            styles.mainCharacterEmojiBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: selectedCharacterTheme.accentSoft,
              borderColor: selectedCharacterTheme.frame,
            },
          ]}>
          <Text
            style={[
              styles.mainCharacterEmojiText,
              {
                color: selectedCharacterTheme.ink,
                fontSize: badgeSize * 0.46,
              },
            ]}>
            {selectedCharacterClass.emoji}
          </Text>
        </View>
        <View style={styles.mainCharacterEmojiShadow} />
      </View>
    );
  }, [
    selectedCharacterClass.emoji,
    selectedCharacterClass.id,
    selectedCharacterTheme.accentSoft,
    selectedCharacterTheme.frame,
    selectedCharacterTheme.ink,
    selectedCharacterTuning.showcaseOffsetX,
    selectedCharacterTuning.showcaseOffsetY,
    selectedCharacterTuning.showcaseScaleMultiplier,
  ]);

  const loadData = useCallback(async () => {
    const [data, charId] = await Promise.all([
      loadGameData(),
      getSelectedCharacter(),
    ]);

    unstable_batchedUpdates(() => {
      setGameData(data);
      if (!charId) {
        setShowCharSelect(true);
        setSelectedCharState(null);
        setCharData(null);
      } else {
        setSelectedCharState(charId);
      }
    });

    if (charId) {
      const hydrateSelectedCharacter = async () => {
        try {
          const loadedCharData = await loadCharacterData(charId);
          unstable_batchedUpdates(() => {
            setCharDataMap(previous => ({
              ...previous,
              [charId]: loadedCharData,
            }));
            setCharData(loadedCharData);
          });
        } catch {}
      };
      hydrateSelectedCharacter().catch(() => {});
    }

    const hydrateCharacterRoster = async () => {
      try {
        const rosterEntries = await Promise.all(
          CHARACTER_CLASSES.map(async characterClass => [
            characterClass.id,
            await loadCharacterData(characterClass.id),
          ] as const),
        );
        const nextCharDataMap = Object.fromEntries(rosterEntries);
        unstable_batchedUpdates(() => {
          setCharDataMap(nextCharDataMap);
          if (charId) {
            setCharData(nextCharDataMap[charId] ?? null);
          }
        });
      } catch {}
    };
    hydrateCharacterRoster().catch(() => {});

    if (!pendingGrantsCheckedRef.current) {
      pendingGrantsCheckedRef.current = true;
      const claimGrants = async () => {
        try {
          const result = await claimPendingGrants();
          if (result.claimed.length > 0) {
            const summary = result.claimed
              .map(grant => `${grant.type} x${grant.amount}`)
              .join(', ');
            setGameData(result.gameData);
            Alert.alert(t('common.notice'), `보상이 지급되었습니다.\n${summary}`);
          }
        } catch {
          pendingGrantsCheckedRef.current = false;
        }
      };
      claimGrants().catch(() => {});
    }

    if (!announcementsLoadedRef.current) {
      announcementsLoadedRef.current = true;
      const hydrateAnnouncements = async () => {
        try {
          const announcements = await fetchAnnouncements();
          if (announcements.length > 0) {
            setAnnouncement(announcements[0]);
          }
        } catch {
          announcementsLoadedRef.current = false;
        }
      };
      hydrateAnnouncements().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [loadData, navigation]);

  useEffect(() => {
    if (hasInfiniteHearts || !gameData || gameData.hearts >= maxHearts) {
      setTimerText('');
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - gameData.lastHeartTime;
      const remaining = Math.max(0, heartRegenMs - (elapsed % heartRegenMs));
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimerText(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      if (remaining <= 0) {
        loadData();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameData, hasInfiniteHearts, heartRegenMs, loadData, maxHearts]);

  const handleRefillHearts = useCallback(async () => {
    if (!gameData) {
      return;
    }

    if (hasInfiniteHearts) {
      Alert.alert(t('common.notice'), '하트 무제한 모드가 활성화되어 있습니다.');
      return;
    }

    if (gameData.hearts >= maxHearts) {
      Alert.alert(t('common.notice'), t('home.heartsFull'));
      return;
    }

    Alert.alert(t('home.refillHearts'), t('home.refillConfirm'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('home.refill'),
        onPress: async () => {
          try {
            const updated = await purchaseShopItem('hearts', 'gold');
            setGameData(updated);
          } catch (error) {
            const code = getEconomyErrorCode(error);
            if (code === 'not_enough_gold') {
              Alert.alert(t('common.notice'), t('home.notEnoughStars'));
              return;
            }

            Alert.alert(t('common.notice'), t('game.tryAgain'));
          }
        },
      },
    ]);
  }, [gameData, hasInfiniteHearts, maxHearts]);

  const handleSelectCharacter = useCallback(async (characterId: string) => {
    setSelectedCharState(characterId);
    await setSelectedCharacter(characterId);
    const loadedCharData =
      charDataMap[characterId] ?? (await loadCharacterData(characterId));
    setCharDataMap(previous => ({
      ...previous,
      [characterId]: loadedCharData,
    }));
    setCharData(loadedCharData);
    setShowCharSelect(false);
  }, [charDataMap]);

  if (!gameData || (selectedChar === null && !showCharSelect)) {
    return (
      <View style={styles.container}>
        <Animated.Image
          source={IMG_BG}
          style={[
            styles.bgImage,
            backgroundParallaxStyle(),
            {
              height: windowSize.height,
              width: windowSize.width,
            },
          ]}
          resizeMode="cover"
        />
        <View pointerEvents="none" style={styles.bgVignette} />
        <View pointerEvents="none" style={styles.bgTopGlow} />
        <View pointerEvents="none" style={styles.bgBottomGlow} />
        <MenuFloatingBlocks />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.Image
        source={IMG_BG}
        style={[
          styles.bgImage,
          backgroundParallaxStyle(),
          {
            height: windowSize.height,
            width: windowSize.width,
          },
        ]}
        resizeMode="cover"
      />
      <View pointerEvents="none" style={styles.bgVignette} />
      <View pointerEvents="none" style={styles.bgTopGlow} />
      <View pointerEvents="none" style={styles.bgBottomGlow} />
      <MenuFloatingBlocks />
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />

        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topIconButton}
            onPress={() => navigation.navigate('Profile')}>
            <Image source={IMG_PROFILE} style={styles.topIcon} resizeMode="contain" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topIconButton}
            onPress={() => navigation.navigate('Settings')}>
            <Image source={IMG_SETTINGS} style={styles.topIcon} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        <View style={styles.titleStack}>
          <Image source={IMG_TITLE} style={styles.titleImage} resizeMode="contain" />
          <View style={styles.titleRibbon}>
            <Text style={styles.titleRibbonText}>MAGICAL HERO COMMAND</Text>
          </View>
        </View>

        <View style={styles.announceSlot}>
          {announcement ? (
            <TouchableOpacity
              style={styles.announceBanner}
              onPress={() => {
                setShowAnnouncementModal(true);
              }}>
              <View style={styles.announceBadge}>
                <Text style={styles.announceBadgeText}>NOTICE</Text>
              </View>
              <Text style={styles.announceText}>공지 · {announcement.title}</Text>
            </TouchableOpacity>
          ) : (
            <View pointerEvents="none" style={styles.announceBannerPlaceholder}>
              <View style={styles.announceBannerPlaceholderInner} />
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.currencyBarWrapper}
          onPress={handleRefillHearts}>
          <Image
            source={IMG_CURRENCY}
            style={styles.currencyBarImage}
            resizeMode="stretch"
          />
          <View style={styles.currencyOverlay}>
            <View style={styles.currencySlot}>
              <View style={styles.currencyIconSpace} />
              <Text style={styles.currencyText}>
                {formatHeartStatus(gameData.hearts, maxHearts, hasInfiniteHearts)}
                {timerText ? ` ${timerText}` : ''}
              </Text>
            </View>
            <View style={styles.currencySlot}>
              <View style={styles.currencyIconSpace} />
              <Text style={styles.currencyText}>{gameData.gold}</Text>
            </View>
            <View style={styles.currencySlot}>
              <View style={styles.currencyIconSpace} />
              <Text style={styles.currencyText}>{gameData.diamonds}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.centerArea}>
          <View pointerEvents="none" style={styles.heroSceneDecor}>
            <View style={styles.heroAura} />
            <View style={styles.heroSpotlight} />
            <View style={styles.heroPedestal} />
          </View>
          <Animated.View
            style={[styles.knightContainer, parallax(18)]}
            pointerEvents="box-none">
            <View
              pointerEvents="none"
              style={[
                styles.characterDisplayWrap,
                {
                  width: mainCharacterDisplayWidth * 1.18,
                  height: mainCharacterDisplayHeight,
                },
              ]}>
              {renderSelectedCharacterShowcase()}
            </View>
            <TouchableOpacity
              style={[
                styles.characterTapTarget,
                {
                  width: mainCharacterTapWidth,
                  height: mainCharacterTapHeight,
                  marginLeft: -mainCharacterTapWidth / 2,
                  marginTop: -mainCharacterTapHeight / 2,
                  transform: [
                    {translateX: selectedCharacterTuning.showcaseOffsetX},
                    {translateY: selectedCharacterTuning.showcaseOffsetY},
                  ],
                },
              ]}
              activeOpacity={0.92}
              onPress={() => setShowCharSelect(true)}
            />
            <View pointerEvents="none" style={styles.characterTapHint}>
              <Text style={styles.characterTapHintText}>캐릭터 선택</Text>
            </View>
            <View pointerEvents="none" style={styles.heroBanner}>
              <Text style={styles.heroBannerEyebrow}>MAIN HERO</Text>
              <Text style={styles.heroBannerTitle}>{selectedCharacterClass.name}</Text>
              <View style={styles.heroBannerStats}>
                <View style={styles.heroStatChip}>
                  <Text style={styles.heroStatLabel}>Lv.</Text>
                  <Text style={styles.heroStatValue}>{selectedCharacterLevel}</Text>
                </View>
                <View style={styles.heroStatChip}>
                  <Text style={styles.heroStatLabel}>ATK</Text>
                  <Text style={styles.heroStatValue}>{selectedCharacterAtk}</Text>
                </View>
                <View style={styles.heroStatChip}>
                  <Text style={styles.heroStatLabel}>HP</Text>
                  <Text style={styles.heroStatValue}>{selectedCharacterHp}</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={styles.modeBtnWrapper}
              onPress={() => navigation.navigate('Missions')}>
              <View style={styles.modeBtnShell} />
              <Image source={IMG_REWARD} style={styles.modeIcon} resizeMode="contain" />
              <Text style={styles.modeLabel}>보상</Text>
            </TouchableOpacity>
            <View style={styles.characterSpace} />
            <TouchableOpacity
              style={styles.modeBtnWrapper}
              onPress={() => navigation.navigate('Ranking')}>
              <View style={styles.modeBtnShell} />
              <Image source={IMG_RANKING} style={styles.modeIcon} resizeMode="contain" />
              <Text style={styles.modeLabel}>랭킹</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={styles.modeBtnWrapper}
              onPress={() => navigation.navigate('Levels')}>
              <View style={styles.modeBtnShell} />
              <Image source={IMG_LEVEL} style={styles.modeIcon} resizeMode="contain" />
              <Text style={styles.modeLabel}>레벨 모드</Text>
            </TouchableOpacity>
            <View style={styles.characterSpace} />
            <TouchableOpacity
              style={styles.modeBtnWrapper}
              onPress={() => navigation.navigate('Lobby')}>
              <View style={styles.modeBtnShell} />
              <Image source={IMG_BATTLE} style={styles.modeIcon} resizeMode="contain" />
              <Text style={styles.modeLabel}>대전 모드</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={styles.modeBtnWrapper}
              onPress={() => navigation.navigate('Endless')}>
              <View style={styles.modeBtnShell} />
              <Image source={IMG_ENDLESS} style={styles.modeIcon} resizeMode="contain" />
              <Text style={styles.modeLabel}>무한 모드</Text>
            </TouchableOpacity>
            <View style={styles.characterSpace} />
            <TouchableOpacity
              style={styles.modeBtnWrapper}
              onPress={() => navigation.navigate('RaidLobby')}>
              <View style={styles.modeBtnShell} />
              <Image source={IMG_RAID} style={styles.modeIcon} resizeMode="contain" />
              <View style={styles.modeAlertDot}>
                <Text style={styles.modeAlertDotText}>!</Text>
              </View>
              <Text style={styles.modeLabel}>레이드 모드</Text>
            </TouchableOpacity>
          </View>
        </View>

        <GameBottomNav
          navigation={navigation}
          activeItem="home"
          selectedCharacterId={selectedChar}
          onOpenCharacterPicker={() => setShowCharSelect(true)}
        />

        <Modal
          visible={showAnnouncementModal && !!announcement}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAnnouncementModal(false)}>
          <View style={styles.announcementModalOverlay}>
            <View style={styles.announcementModalCard}>
              <ScrollView
                style={styles.announcementModalScroll}
                showsVerticalScrollIndicator={false}>
                <Text style={styles.announcementModalEyebrow}>NOTICE</Text>
                <Text style={styles.announcementModalTitle}>
                  {announcement?.title}
                </Text>
                {announcement?.imageUrl ? (
                  <Image
                    source={{uri: announcement.imageUrl}}
                    style={styles.announcementModalImage}
                    resizeMode="cover"
                  />
                ) : null}
                <Text style={styles.announcementModalContent}>
                  {announcement?.content}
                </Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.announcementModalClose}
                onPress={() => setShowAnnouncementModal(false)}>
                <Text style={styles.announcementModalCloseText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showCharSelect} transparent animationType="fade">
          <View style={styles.charSelectOverlay}>
            <View style={styles.charSelectModal}>
              <View style={styles.charSelectHeader}>
                <Text style={styles.charSelectEyebrow}>CHARACTER LOUNGE</Text>
                <Text style={styles.charSelectTitle}>캐릭터 선택</Text>
                <Text style={styles.charSelectSubtitle}>
                  메인 화면의 캐릭터를 터치해서 언제든 교체할 수 있습니다.
                </Text>
              </View>

              <View
                style={[
                  styles.charFeaturedCard,
                  {
                    borderColor: '#e2a94d',
                    backgroundColor: 'rgba(33, 20, 82, 0.94)',
                  },
                ]}>
                <View
                  style={[
                    styles.charFeaturedPortrait,
                    {backgroundColor: 'rgba(255,255,255,0.08)'},
                  ]}>
                  {renderCharacterPreview(selectedCharacterClass.id, 118)}
                </View>
                <View style={styles.charFeaturedInfo}>
                  <Text
                    style={[
                      styles.charFeaturedName,
                      {color: '#fff5d8'},
                    ]}>
                    {selectedCharacterClass.name}
                  </Text>
                  <Text style={styles.charFeaturedDesc}>
                    {selectedCharacterClass.description}
                  </Text>
                  <View style={styles.charFeaturedStats}>
                    <View
                      style={[
                        styles.charFeaturedStatChip,
                        {backgroundColor: 'rgba(255,255,255,0.1)'},
                      ]}>
                      <Text style={styles.charFeaturedStatLabel}>Lv.</Text>
                      <Text style={styles.charFeaturedStatValue}>
                        {selectedCharacterLevel}
                      </Text>
                    </View>
                    <View style={styles.charFeaturedStatChip}>
                      <Text style={styles.charFeaturedStatLabel}>ATK</Text>
                      <Text style={styles.charFeaturedStatValue}>{selectedCharacterAtk}</Text>
                    </View>
                    <View style={styles.charFeaturedStatChip}>
                      <Text style={styles.charFeaturedStatLabel}>HP</Text>
                      <Text style={styles.charFeaturedStatValue}>{selectedCharacterHp}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <ScrollView
                style={styles.charSelectList}
                contentContainerStyle={styles.charSelectGrid}
                showsVerticalScrollIndicator={false}>
                {characterRows.map((row, rowIndex) => (
                  <View key={`char-row-${rowIndex}`} style={styles.charSelectGridRow}>
                    {row.map(characterClass => {
                      const currentData = charDataMap[characterClass.id];
                      const level = currentData?.level ?? 1;
                      const atk = getCharacterAtk(characterClass.id, level);
                      const hp = getCharacterHp(characterClass.id, level);
                      const theme =
                        CHARACTER_THEMES[characterClass.id] ?? CHARACTER_THEMES.knight;
                      const isSelected = selectedChar === characterClass.id;

                      return (
                        <TouchableOpacity
                          key={characterClass.id}
                          style={[
                            styles.charSelectTile,
                            {
                              borderColor: isSelected
                                ? '#f2bb5f'
                                : 'rgba(242, 187, 95, 0.2)',
                              backgroundColor: isSelected
                                ? 'rgba(77, 49, 155, 0.98)'
                                : 'rgba(30, 19, 67, 0.92)',
                            },
                          ]}
                          onPress={() => handleSelectCharacter(characterClass.id)}>
                          <View
                            style={[
                              styles.charSelectTilePortrait,
                              {backgroundColor: 'rgba(255,255,255,0.07)'},
                            ]}>
                            {renderCharacterPreview(characterClass.id, 76, true)}
                          </View>
                          <View style={styles.charSelectTileInfo}>
                            <View style={styles.charSelectTileHeader}>
                              <Text
                                style={[
                                  styles.charSelectName,
                                  {color: isSelected ? '#fff7de' : '#f0e9ff'},
                                ]}>
                                {characterClass.name}
                              </Text>
                              {isSelected ? (
                                <View
                                  style={[
                                    styles.charSelectActivePill,
                                    {backgroundColor: theme.accent},
                                  ]}>
                                  <Text style={styles.charSelectActivePillText}>선택 중</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={styles.charSelectDesc}>
                              {characterClass.description}
                            </Text>
                            <View style={styles.charStatRow}>
                              <Text
                                style={[
                                  styles.charStat,
                                  {color: isSelected ? '#fff6de' : '#d8cbff'},
                                ]}>
                                Lv.{level}
                              </Text>
                              <Text
                                style={[
                                  styles.charStat,
                                  {color: isSelected ? '#fff6de' : '#d8cbff'},
                                ]}>
                                ATK {atk}
                              </Text>
                              <Text
                                style={[
                                  styles.charStat,
                                  {color: isSelected ? '#fff6de' : '#d8cbff'},
                                ]}>
                                HP {hp}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    {row.length === 1 ? (
                      <View
                        style={[styles.charSelectTile, styles.charSelectTilePlaceholder]}
                      />
                    ) : null}
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[
                  styles.charSelectCloseBtn,
                  !selectedChar && styles.charSelectCloseBtnDisabled,
                ]}
                onPress={() => {
                  if (selectedChar) {
                    setShowCharSelect(false);
                  }
                }}>
                <Text style={styles.charSelectCloseText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#120f33',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  bgVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 4, 28, 0.24)',
  },
  bgTopGlow: {
    position: 'absolute',
    top: -H * 0.08,
    left: W * 0.1,
    width: W * 0.8,
    height: H * 0.28,
    borderRadius: 999,
    backgroundColor: 'rgba(176, 110, 255, 0.2)',
  },
  bgBottomGlow: {
    position: 'absolute',
    bottom: H * 0.06,
    left: W * 0.12,
    width: W * 0.76,
    height: H * 0.24,
    borderRadius: 999,
    backgroundColor: 'rgba(53, 170, 255, 0.12)',
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: W * 0.04,
    paddingTop: H * 0.008,
  },
  topIconButton: {
    width: TOP_ICON_SIZE + 10,
    height: TOP_ICON_SIZE + 10,
    borderRadius: (TOP_ICON_SIZE + 10) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(36, 30, 93, 0.72)',
    borderWidth: 1.5,
    borderColor: 'rgba(236, 183, 96, 0.65)',
    shadowColor: '#080311',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  topIcon: {
    width: TOP_ICON_SIZE,
    height: TOP_ICON_SIZE,
  },
  titleStack: {
    alignItems: 'center',
    marginTop: -H * 0.004,
  },
  titleImage: {
    width: W * 0.84,
    height: H * 0.12,
    alignSelf: 'center',
  },
  titleRibbon: {
    marginTop: -H * 0.012,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(108, 58, 214, 0.88)',
    borderWidth: 2,
    borderColor: 'rgba(235, 184, 92, 0.9)',
    shadowColor: '#19082b',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  titleRibbonText: {
    color: '#fff0bb',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  currencyBarWrapper: {
    alignSelf: 'center',
    width: W * 0.68 * 1.5,
    height: H * 0.052 * 1.5,
    marginTop: H * 0.012,
    marginBottom: H * 0.008,
    shadowColor: '#12071d',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  currencyBarImage: {
    width: '100%',
    height: '100%',
  },
  currencyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: W * 0.04,
  },
  currencySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  currencyIconSpace: {
    width: W * 0.08,
  },
  currencyText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: W * 0.02,
    paddingTop: H * 0.02,
    gap: H * 0.012,
  },
  heroSceneDecor: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAura: {
    position: 'absolute',
    top: H * 0.08,
    width: W * 0.56,
    height: W * 0.56,
    borderRadius: W * 0.28,
    backgroundColor: 'rgba(128, 96, 255, 0.32)',
  },
  heroSpotlight: {
    position: 'absolute',
    top: H * 0.12,
    width: W * 0.4,
    height: H * 0.28,
    borderRadius: 999,
    backgroundColor: 'rgba(94, 220, 255, 0.14)',
  },
  heroPedestal: {
    position: 'absolute',
    bottom: H * 0.14,
    width: W * 0.48,
    height: H * 0.06,
    borderRadius: 999,
    backgroundColor: 'rgba(11, 10, 40, 0.7)',
    borderWidth: 2,
    borderColor: 'rgba(229, 174, 90, 0.4)',
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  modeBtnWrapper: {
    width: MODE_BTN_SIZE,
    height: MODE_BTN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#140916',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.26,
    shadowRadius: 10,
    elevation: 8,
  },
  modeBtnShell: {
    position: 'absolute',
    top: MODE_BTN_SIZE * 0.08,
    right: MODE_BTN_SIZE * 0.08,
    bottom: MODE_BTN_SIZE * 0.08,
    left: MODE_BTN_SIZE * 0.08,
    borderRadius: 24,
    backgroundColor: 'rgba(58, 39, 118, 0.72)',
    borderWidth: 2,
    borderColor: 'rgba(232, 178, 90, 0.72)',
  },
  modeIcon: {
    width: '92%',
    height: '92%',
    position: 'absolute',
  },
  modeLabel: {
    position: 'absolute',
    bottom: MODE_BTN_SIZE * 0.12,
    color: '#fff4da',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(31, 14, 61, 0.9)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  modeAlertDot: {
    position: 'absolute',
    top: MODE_BTN_SIZE * 0.11,
    right: MODE_BTN_SIZE * 0.12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#db3f52',
    borderWidth: 2,
    borderColor: '#fff4d8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeAlertDotText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  characterSpace: {
    width: W * 0.44,
  },
  knightContainer: {
    position: 'absolute',
    left: W * 0.18,
    right: W * 0.18,
    top: '7%',
    bottom: H * 0.08,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    overflow: 'visible',
  },
  characterDisplayWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  characterTapTarget: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -1,
    marginTop: -1,
  },
  characterTapHint: {
    marginTop: -4,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(67, 46, 136, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(236, 182, 92, 0.8)',
  },
  characterTapHintText: {
    color: '#fff1cb',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  heroBanner: {
    marginTop: 10,
    minWidth: W * 0.58,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderRadius: 22,
    backgroundColor: 'rgba(28, 18, 76, 0.9)',
    borderWidth: 2,
    borderColor: 'rgba(235, 182, 95, 0.9)',
    alignItems: 'center',
    shadowColor: '#0f0620',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 10,
  },
  heroBannerEyebrow: {
    color: '#ffd88a',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  heroBannerTitle: {
    color: '#fff7e1',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  heroBannerStats: {
    flexDirection: 'row',
    gap: 8,
  },
  heroStatChip: {
    minWidth: 64,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 236, 188, 0.14)',
  },
  heroStatLabel: {
    color: '#d6c6ff',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroStatValue: {
    color: '#fff4d4',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 1,
  },
  knightShadow: {
    position: 'absolute',
    bottom: KNIGHT_DISPLAY_SIZE * 0.01,
    width: KNIGHT_DISPLAY_SIZE * 0.27 * 1.44,
    height: KNIGHT_DISPLAY_SIZE * 0.27,
    borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.22)',
    transform: [{translateX: KNIGHT_DISPLAY_SIZE * 0.065}],
  },
  knightWrap: {
    alignItems: 'center',
  },
  mainCharacterSpriteWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mageFlip: {
    transform: [{scaleX: -1}],
  },
  mageShadow: {
    width: MAGE_SIZE * 0.55,
    height: MAGE_SIZE * 0.55 * 0.35,
    borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.22)',
    marginTop: -MAGE_SIZE * 0.06,
  },
  mainCharacterEmojiBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  mainCharacterEmojiText: {
    includeFontPadding: false,
  },
  mainCharacterEmojiShadow: {
    width: KNIGHT_DISPLAY_SIZE * 0.34,
    height: KNIGHT_DISPLAY_SIZE * 0.12,
    borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.22)',
    marginTop: 10,
  },
  announceSlot: {
    height: ANNOUNCE_SLOT_HEIGHT + 10,
    marginHorizontal: W * 0.04,
    marginTop: 2,
  },
  announceBanner: {
    flex: 1,
    backgroundColor: 'rgba(65, 40, 144, 0.82)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: 'rgba(237, 183, 98, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#160624',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  announceBannerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
  },
  announceBannerPlaceholderInner: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(237, 183, 98, 0.18)',
    backgroundColor: 'rgba(54, 32, 110, 0.24)',
  },
  announceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  announceBadgeText: {
    color: '#ffe19b',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  announceText: {
    flex: 1,
    color: '#fff2cb',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(22, 7, 36, 0.8)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  announcementModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 7, 27, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  announcementModalCard: {
    width: W * 0.9,
    maxHeight: H * 0.72,
    backgroundColor: '#251550',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#e2a94d',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: '#0b0419',
    shadowOffset: {width: 0, height: 14},
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },
  announcementModalScroll: {
    flexGrow: 0,
  },
  announcementModalEyebrow: {
    color: '#ffd98c',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
    textAlign: 'center',
    marginBottom: 6,
  },
  announcementModalTitle: {
    color: '#fff5d7',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  announcementModalImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: '#d8c39d',
    marginBottom: 14,
  },
  announcementModalContent: {
    color: '#ece4ff',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'left',
    marginBottom: 14,
  },
  announcementModalClose: {
    alignSelf: 'center',
    minWidth: 128,
    borderRadius: 999,
    backgroundColor: '#2da8ff',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderWidth: 2,
    borderColor: '#dff5ff',
  },
  announcementModalCloseText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  charSelectOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 7, 28, 0.74)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  charSelectModal: {
    backgroundColor: '#23134e',
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    width: W * 0.92,
    alignItems: 'stretch',
    maxHeight: H * 0.84,
    borderWidth: 3,
    borderColor: '#e2a94d',
    shadowColor: '#0b0419',
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 18,
  },
  charSelectHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  charSelectEyebrow: {
    color: '#ffd88b',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  charSelectTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: '#fff6da',
    textAlign: 'center',
  },
  charSelectSubtitle: {
    fontSize: 12,
    color: '#d8cbff',
    textAlign: 'center',
    lineHeight: 18,
  },
  charFeaturedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  charFeaturedPortrait: {
    width: 112,
    height: 118,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  charFeaturedInfo: {
    flex: 1,
  },
  charFeaturedName: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 2,
  },
  charFeaturedDesc: {
    color: '#dbd0ff',
    fontSize: 12,
    lineHeight: 17,
  },
  charFeaturedStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  charFeaturedStatChip: {
    minWidth: 64,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  charFeaturedStatLabel: {
    color: '#d4c6ff',
    fontSize: 10,
    fontWeight: '800',
  },
  charFeaturedStatValue: {
    color: '#fff5d7',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 1,
  },
  charSelectList: {
    flexGrow: 0,
  },
  charSelectGrid: {
    gap: 10,
    paddingBottom: 4,
  },
  charSelectGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  charSelectTile: {
    flex: 1,
    minWidth: 0,
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 12,
    shadowColor: '#090416',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  charSelectTilePlaceholder: {
    opacity: 0,
  },
  charSelectTilePortrait: {
    height: 82,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  charSelectTileInfo: {
    gap: 5,
  },
  charSelectTileHeader: {
    alignItems: 'flex-start',
    gap: 4,
  },
  charSelectName: {
    fontSize: 15,
    fontWeight: '900',
    width: '100%',
  },
  charSelectActivePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  charSelectActivePillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  charSelectDesc: {
    fontSize: 11,
    color: '#dcd1ff',
    lineHeight: 16,
  },
  charStatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  charStat: {
    fontSize: 11,
    fontWeight: '900',
  },
  charSelectCloseBtn: {
    backgroundColor: '#2da8ff',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dff5ff',
  },
  charSelectCloseText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  charSelectCloseBtnDisabled: {
    opacity: 0.4,
  },
  modalSpriteWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  charPreviewBadgeWrap: {
    alignSelf: 'center',
  },
  modalSpriteWrapCompact: {
    transform: [{scale: 0.8}],
  },
  charEmojiBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  charEmojiBadgeText: {
    includeFontPadding: false,
  },
});
