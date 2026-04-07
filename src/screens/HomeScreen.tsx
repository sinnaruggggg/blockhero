import React, {useCallback, useEffect, useRef, useState} from 'react';
import MageSprite from '../components/MageSprite';
import KnightSprite from '../components/KnightSprite';
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
  INFINITE_HEARTS_ENABLED,
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
const IMG_MISSIONS = require('../assets/ui/missions.png');
const IMG_SHOP = require('../assets/ui/shop.png');
const IMG_FRIENDS = require('../assets/ui/friends.png');
const IMG_SKIN = require('../assets/ui/skin.png');
const IMG_CODEX = require('../assets/ui/codex.png');

const MODE_BTN_SIZE = W * 0.23;
const NAV_ICON_SIZE = W * 0.16;
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

function OutlinedText({
  style,
  children,
}: {
  style?: any;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text style={[style, styles.outlinedTextShadow]}>{children}</Text>
    </View>
  );
}

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

  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;

  const heartEffects =
    selectedChar && charData
      ? getCharacterSkillEffects(selectedChar, charData, {mode: 'level'})
      : getCharacterSkillEffects(null, null);
  const maxHearts = getConfiguredMaxHearts(
    getDynamicHeartCap(MAX_HEARTS, heartEffects),
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
    const rosterEntries = await Promise.all(
      CHARACTER_CLASSES.map(async characterClass => [
        characterClass.id,
        await loadCharacterData(characterClass.id),
      ] as const),
    );
    const nextCharDataMap = Object.fromEntries(rosterEntries);

    unstable_batchedUpdates(() => {
      setGameData(data);
      setCharDataMap(nextCharDataMap);
      if (!charId) {
        setShowCharSelect(true);
      } else {
        setSelectedCharState(charId);
        setCharData(nextCharDataMap[charId] ?? null);
      }
    });

    if (!pendingGrantsCheckedRef.current) {
      pendingGrantsCheckedRef.current = true;
      void (async () => {
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
      })();
    }

    if (!announcementsLoadedRef.current) {
      announcementsLoadedRef.current = true;
      void (async () => {
        try {
          const announcements = await fetchAnnouncements();
          if (announcements.length > 0) {
            setAnnouncement(announcements[0]);
          }
        } catch {
          announcementsLoadedRef.current = false;
        }
      })();
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [loadData, navigation]);

  useEffect(() => {
    if (INFINITE_HEARTS_ENABLED || !gameData || gameData.hearts >= maxHearts) {
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
  }, [gameData, heartRegenMs, loadData, maxHearts]);

  const handleRefillHearts = useCallback(async () => {
    if (!gameData) {
      return;
    }

    if (INFINITE_HEARTS_ENABLED) {
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
  }, [gameData, maxHearts]);

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
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="dark-content"
        />

        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Image source={IMG_PROFILE} style={styles.topIcon} resizeMode="contain" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Image source={IMG_SETTINGS} style={styles.topIcon} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        <Image source={IMG_TITLE} style={styles.titleImage} resizeMode="contain" />

        {announcement && (
          <TouchableOpacity
            style={styles.announceBanner}
            onPress={() => {
              setShowAnnouncementModal(true);
            }}>
            <Text style={styles.announceText}>공지 · {announcement.title}</Text>
          </TouchableOpacity>
        )}

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
                {formatHeartStatus(gameData.hearts, maxHearts)}
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
              <Text style={styles.characterTapHintText}>캐릭터 터치</Text>
            </View>
          </Animated.View>

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={styles.modeBtnWrapper}
              onPress={() => navigation.navigate('Missions')}>
              <Image source={IMG_REWARD} style={styles.modeIcon} resizeMode="contain" />
              <Text style={styles.modeLabel}>보상</Text>
            </TouchableOpacity>
            <View style={styles.characterSpace} />
            <TouchableOpacity style={styles.modeBtnWrapper}>
              <Image source={IMG_RANKING} style={styles.modeIcon} resizeMode="contain" />
              <Text style={styles.modeLabel}>랭킹</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={styles.modeBtnWrapper}
              onPress={() => navigation.navigate('Levels')}>
              <Image source={IMG_LEVEL} style={styles.modeIcon} resizeMode="contain" />
              <Text style={styles.modeLabel}>레벨 모드</Text>
            </TouchableOpacity>
            <View style={styles.characterSpace} />
            <TouchableOpacity
              style={styles.modeBtnWrapper}
              onPress={() => navigation.navigate('Lobby')}>
              <Image source={IMG_BATTLE} style={styles.modeIcon} resizeMode="contain" />
              <Text style={styles.modeLabel}>대전 모드</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={styles.modeBtnWrapper}
              onPress={() => navigation.navigate('Endless')}>
              <Image source={IMG_ENDLESS} style={styles.modeIcon} resizeMode="contain" />
              <Text style={styles.modeLabel}>무한 모드</Text>
            </TouchableOpacity>
            <View style={styles.characterSpace} />
            <TouchableOpacity
              style={styles.modeBtnWrapper}
              onPress={() => navigation.navigate('RaidLobby')}>
              <Image source={IMG_RAID} style={styles.modeIcon} resizeMode="contain" />
              <Text style={styles.modeLabel}>레이드 모드</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('Missions')}>
            <Image source={IMG_MISSIONS} style={styles.navIcon} resizeMode="contain" />
            <OutlinedText style={styles.navLabel}>미션</OutlinedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('Shop')}>
            <Image source={IMG_SHOP} style={styles.navIcon} resizeMode="contain" />
            <OutlinedText style={styles.navLabel}>상점</OutlinedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('Friends')}>
            <Image source={IMG_FRIENDS} style={styles.navIcon} resizeMode="contain" />
            <OutlinedText style={styles.navLabel}>친구</OutlinedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('SkinCollection')}>
            <Image source={IMG_SKIN} style={styles.navIcon} resizeMode="contain" />
            <OutlinedText style={styles.navLabel}>스킨</OutlinedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              if (selectedChar) {
                navigation.navigate('SkillTree', {characterId: selectedChar});
              } else {
                setShowCharSelect(true);
              }
            }}>
            <Text style={styles.navIconEmoji}>✨</Text>
            <OutlinedText style={styles.navLabel}>스킬</OutlinedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('BossCodex')}>
            <Image source={IMG_CODEX} style={styles.navIcon} resizeMode="contain" />
            <OutlinedText style={styles.navLabel}>도감</OutlinedText>
          </TouchableOpacity>
        </View>

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
                    borderColor: selectedCharacterTheme.frame,
                    backgroundColor: selectedCharacterTheme.accentSoft,
                  },
                ]}>
                <View
                  style={[
                    styles.charFeaturedPortrait,
                    {backgroundColor: `${selectedCharacterTheme.accent}22`},
                  ]}>
                  {renderCharacterPreview(selectedCharacterClass.id, 118)}
                </View>
                <View style={styles.charFeaturedInfo}>
                  <Text
                    style={[
                      styles.charFeaturedName,
                      {color: selectedCharacterTheme.ink},
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
                        {backgroundColor: `${selectedCharacterTheme.accent}22`},
                      ]}>
                      <Text style={styles.charFeaturedStatLabel}>Lv.</Text>
                      <Text style={styles.charFeaturedStatValue}>
                        {charDataMap[selectedCharacterClass.id]?.level ?? charData?.level ?? 1}
                      </Text>
                    </View>
                    <View style={styles.charFeaturedStatChip}>
                      <Text style={styles.charFeaturedStatLabel}>ATK</Text>
                      <Text style={styles.charFeaturedStatValue}>
                        {getCharacterAtk(
                          selectedCharacterClass.id,
                          charDataMap[selectedCharacterClass.id]?.level ??
                            charData?.level ??
                            1,
                        )}
                      </Text>
                    </View>
                    <View style={styles.charFeaturedStatChip}>
                      <Text style={styles.charFeaturedStatLabel}>HP</Text>
                      <Text style={styles.charFeaturedStatValue}>
                        {getCharacterHp(
                          selectedCharacterClass.id,
                          charDataMap[selectedCharacterClass.id]?.level ??
                            charData?.level ??
                            1,
                        )}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <ScrollView
                style={styles.charSelectList}
                contentContainerStyle={styles.charSelectGrid}
                showsVerticalScrollIndicator={false}>
                {CHARACTERS.map(characterClass => {
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
                          borderColor: isSelected ? theme.frame : 'rgba(132, 94, 57, 0.28)',
                          backgroundColor: isSelected ? '#fff6e7' : 'rgba(255, 247, 233, 0.94)',
                        },
                      ]}
                      onPress={() => handleSelectCharacter(characterClass.id)}>
                      <View
                        style={[
                          styles.charSelectTilePortrait,
                          {backgroundColor: `${theme.accent}20`},
                        ]}>
                        {renderCharacterPreview(characterClass.id, 76, true)}
                      </View>
                      <View style={styles.charSelectTileInfo}>
                        <View style={styles.charSelectTileHeader}>
                          <Text
                            style={[
                              styles.charSelectName,
                              {color: isSelected ? theme.ink : '#53361f'},
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
                        <Text style={styles.charSelectDesc}>{characterClass.description}</Text>
                        <View style={styles.charStatRow}>
                          <Text style={[styles.charStat, {color: theme.ink}]}>Lv.{level}</Text>
                          <Text style={[styles.charStat, {color: theme.ink}]}>ATK {atk}</Text>
                          <Text style={[styles.charStat, {color: theme.ink}]}>HP {hp}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
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
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  outlinedTextShadow: {
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: W * 0.035,
    paddingTop: H * 0.005,
  },
  topIcon: {
    width: TOP_ICON_SIZE,
    height: TOP_ICON_SIZE,
  },
  titleImage: {
    width: W * 0.9,
    height: H * 0.13,
    alignSelf: 'center',
    marginTop: -H * 0.01,
  },
  currencyBarWrapper: {
    alignSelf: 'center',
    width: W * 0.68 * 1.5,
    height: H * 0.052 * 1.5,
    marginTop: H * 0.01,
    marginBottom: H * 0.002,
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
    paddingHorizontal: W * 0.01,
    gap: H * 0.008,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeBtnWrapper: {
    width: MODE_BTN_SIZE,
    height: MODE_BTN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIcon: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  modeLabel: {
    position: 'absolute',
    bottom: MODE_BTN_SIZE * 0.12,
    color: '#5a4a6a',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  characterSpace: {
    width: W * 0.46,
  },
  knightContainer: {
    position: 'absolute',
    left: W * 0.35,
    right: W * 0.35,
    top: '10%',
    bottom: 0,
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
    marginTop: -8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(74, 45, 19, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 180, 0.4)',
  },
  characterTapHintText: {
    color: '#fff2d0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
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
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingBottom: H * 0.01,
    paddingHorizontal: W * 0.025,
  },
  navItem: {
    width: NAV_ICON_SIZE,
    alignItems: 'center',
  },
  navIcon: {
    width: NAV_ICON_SIZE,
    height: NAV_ICON_SIZE,
  },
  navIconEmoji: {
    fontSize: NAV_ICON_SIZE * 0.65,
    width: NAV_ICON_SIZE,
    height: NAV_ICON_SIZE,
    textAlign: 'center',
    lineHeight: NAV_ICON_SIZE,
  },
  navLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },
  announceBanner: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 10,
    padding: 8,
    marginHorizontal: W * 0.04,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  announceText: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  announcementModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 12, 7, 0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  announcementModalCard: {
    width: W * 0.9,
    maxHeight: H * 0.72,
    backgroundColor: '#f4e2c0',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#9a6139',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: '#2b1608',
    shadowOffset: {width: 0, height: 14},
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },
  announcementModalScroll: {
    flexGrow: 0,
  },
  announcementModalEyebrow: {
    color: '#8a5b2e',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
    textAlign: 'center',
    marginBottom: 6,
  },
  announcementModalTitle: {
    color: '#4f2c10',
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
    color: '#5d3a1f',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'left',
    marginBottom: 14,
  },
  announcementModalClose: {
    alignSelf: 'center',
    minWidth: 128,
    borderRadius: 999,
    backgroundColor: '#8f5732',
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  announcementModalCloseText: {
    color: '#fff7ea',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  charSelectOverlay: {
    flex: 1,
    backgroundColor: 'rgba(21,16,10,0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  charSelectModal: {
    backgroundColor: '#f4e2c0',
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    width: W * 0.92,
    alignItems: 'stretch',
    maxHeight: H * 0.84,
    borderWidth: 3,
    borderColor: '#9a6139',
    shadowColor: '#2b1608',
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
    color: '#9b6a3f',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  charSelectTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: '#5a3316',
    textAlign: 'center',
  },
  charSelectSubtitle: {
    fontSize: 12,
    color: '#7a5a3d',
    textAlign: 'center',
    lineHeight: 18,
  },
  charFeaturedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 2,
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
    color: '#73563c',
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
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(122, 86, 51, 0.18)',
  },
  charFeaturedStatLabel: {
    color: '#8d6847',
    fontSize: 10,
    fontWeight: '800',
  },
  charFeaturedStatValue: {
    color: '#553319',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 1,
  },
  charSelectList: {
    flexGrow: 0,
  },
  charSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    paddingBottom: 4,
  },
  charSelectTile: {
    width: '48.4%',
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  charSelectName: {
    fontSize: 15,
    fontWeight: '900',
    flex: 1,
  },
  charSelectActivePill: {
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
    color: '#73563c',
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
    backgroundColor: '#8f5732',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6e3f20',
  },
  charSelectCloseText: {
    color: '#fff7ea',
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
