import React, {useCallback, useEffect, useRef, useState} from 'react';
import CharacterSprite from '../components/CharacterSprite';
import MageSprite from '../components/MageSprite';
import KnightSprite from '../components/KnightSprite';
import ItemLoadoutModal from '../components/ItemLoadoutModal';
import {
  CHARACTER_CLASSES,
  getCharacterAtk,
  getCharacterHp,
  xpToNextLevel,
} from '../constants/characters';
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
  Pressable,
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
import {getPendingRequests} from '../services/friendService';
import {
  getEconomyErrorCode,
  purchaseShopItem,
} from '../services/economyService';
import {t} from '../i18n';
import {
  loadGameData,
  loadDailyStats,
  loadMissionData,
  loadAchievements,
  loadEndlessStats,
  loadLevelProgress,
  getPlayerId,
  getSelectedCharacter,
  setSelectedCharacter,
  GameData,
  loadLastPlayedWorldId,
  saveStartingItemLoadout,
} from '../stores/gameStore';
import {getWorldBackgroundSource} from '../assets/worldBackgrounds';
import {
  HEART_REGEN_MS,
  INFINITE_HEARTS_VALUE,
  MAX_HEARTS,
  ACHIEVEMENTS,
  DAILY_MISSIONS,
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

const IMG_TITLE = require('../assets/ui/title.png');
const IMG_PROFILE = require('../assets/ui/profile.png');
const IMG_SETTINGS = require('../assets/ui/settings.png');
const IMG_SHOP = require('../assets/ui/shop.png');
const IMG_FRIENDS = require('../assets/ui/friends.png');
const IMG_REWARD = require('../assets/ui/reward.png');
const IMG_MISSIONS = require('../assets/ui/missions.png');
const IMG_LEVEL = require('../assets/ui/level.png');
const IMG_ENDLESS = require('../assets/ui/endless.png');
const IMG_RANKING = require('../assets/ui/ranking.png');
const IMG_BATTLE = require('../assets/ui/battle.png');
const IMG_RAID = require('../assets/ui/raid.png');
const IMG_CURRENCY = require('../assets/ui/currency_bar.png');
const IMG_CLEAN_BACKGROUND = require('../assets/ui/home_split/background_clean.png');
const IMG_CLEAN_PROFILE = {
  normal: require('../assets/ui/home_split/profile_card.png'),
  pressed: require('../assets/ui/home_split/profile_card_pressed.png'),
};
const IMG_CLEAN_ENERGY = {
  normal: require('../assets/ui/home_split/energy_pill.png'),
  pressed: require('../assets/ui/home_split/energy_pill_pressed.png'),
};
const IMG_CLEAN_GOLD = {
  normal: require('../assets/ui/home_split/gold_pill.png'),
  pressed: require('../assets/ui/home_split/gold_pill_pressed.png'),
};
const IMG_CLEAN_GEM = {
  normal: require('../assets/ui/home_split/gem_pill.png'),
  pressed: require('../assets/ui/home_split/gem_pill_pressed.png'),
};
const IMG_CLEAN_SETTINGS = {
  normal: require('../assets/ui/home_split/settings_button.png'),
  pressed: require('../assets/ui/home_split/settings_button_pressed.png'),
};
const IMG_CLEAN_LOGO = {
  normal: require('../assets/ui/home_split/logo.png'),
};
const IMG_CLEAN_EVENT = {
  normal: require('../assets/ui/home_split/side_event.png'),
  pressed: require('../assets/ui/home_split/side_event_pressed.png'),
  alert: require('../assets/ui/home_split/side_event_alert.png'),
  alertPressed: require('../assets/ui/home_split/side_event_alert_pressed.png'),
};
const IMG_CLEAN_QUEST = {
  normal: require('../assets/ui/home_split/side_quest.png'),
  pressed: require('../assets/ui/home_split/side_quest_pressed.png'),
  alert: require('../assets/ui/home_split/side_quest_alert.png'),
  alertPressed: require('../assets/ui/home_split/side_quest_alert_pressed.png'),
};
const IMG_CLEAN_ACHIEVEMENT = {
  normal: require('../assets/ui/home_split/side_achievement.png'),
  pressed: require('../assets/ui/home_split/side_achievement_pressed.png'),
  alert: require('../assets/ui/home_split/side_achievement_alert.png'),
  alertPressed: require('../assets/ui/home_split/side_achievement_alert_pressed.png'),
};
const IMG_CLEAN_MAIL = {
  normal: require('../assets/ui/home_split/side_mail.png'),
  pressed: require('../assets/ui/home_split/side_mail_pressed.png'),
  alert: require('../assets/ui/home_split/side_mail_alert.png'),
  alertPressed: require('../assets/ui/home_split/side_mail_alert_pressed.png'),
};
const IMG_CLEAN_SHOP = {
  normal: require('../assets/ui/home_split/side_shop.png'),
  pressed: require('../assets/ui/home_split/side_shop_pressed.png'),
  alert: require('../assets/ui/home_split/side_shop_alert.png'),
  alertPressed: require('../assets/ui/home_split/side_shop_alert_pressed.png'),
};
const IMG_CLEAN_PASS = {
  normal: require('../assets/ui/home_split/side_pass.png'),
  pressed: require('../assets/ui/home_split/side_pass_pressed.png'),
  alert: require('../assets/ui/home_split/side_pass_alert.png'),
  alertPressed: require('../assets/ui/home_split/side_pass_alert_pressed.png'),
};
const IMG_CLEAN_FRIENDS = {
  normal: require('../assets/ui/home_split/side_friends.png'),
  pressed: require('../assets/ui/home_split/side_friends_pressed.png'),
  alert: require('../assets/ui/home_split/side_friends_alert.png'),
  alertPressed: require('../assets/ui/home_split/side_friends_alert_pressed.png'),
};
const IMG_CLEAN_PLAY_PANEL = require('../assets/ui/home_split/play_panel.png');
const IMG_CLEAN_PRIMARY_PLAY = {
  normal: require('../assets/ui/home_split/primary_play.png'),
  pressed: require('../assets/ui/home_split/primary_play_pressed.png'),
};
const IMG_CLEAN_MODE_BATTLE = {
  normal: require('../assets/ui/home_split/mode_battle.png'),
  pressed: require('../assets/ui/home_split/mode_battle_pressed.png'),
  alert: require('../assets/ui/home_split/mode_battle_alert.png'),
  alertPressed: require('../assets/ui/home_split/mode_battle_alert_pressed.png'),
};
const IMG_CLEAN_MODE_RAID = {
  normal: require('../assets/ui/home_split/mode_raid.png'),
  pressed: require('../assets/ui/home_split/mode_raid_pressed.png'),
  alert: require('../assets/ui/home_split/mode_raid_alert.png'),
  alertPressed: require('../assets/ui/home_split/mode_raid_alert_pressed.png'),
};
const IMG_CLEAN_MODE_ENDLESS = {
  normal: require('../assets/ui/home_split/mode_endless.png'),
  pressed: require('../assets/ui/home_split/mode_endless_pressed.png'),
  alert: require('../assets/ui/home_split/mode_endless_alert.png'),
  alertPressed: require('../assets/ui/home_split/mode_endless_alert_pressed.png'),
};
const IMG_CLEAN_MODE_RANKING = {
  normal: require('../assets/ui/home_split/mode_ranking.png'),
  pressed: require('../assets/ui/home_split/mode_ranking_pressed.png'),
  alert: require('../assets/ui/home_split/mode_ranking_alert.png'),
  alertPressed: require('../assets/ui/home_split/mode_ranking_alert_pressed.png'),
};
const IMG_CLEAN_BOTTOM_NAV = require('../assets/ui/home_split/bottom_nav.png');
const IMG_CLEAN_NAV_HOME = {
  normal: require('../assets/ui/home_split/nav_home.png'),
  pressed: require('../assets/ui/home_split/nav_home_pressed.png'),
  alert: require('../assets/ui/home_split/nav_home_alert.png'),
  alertPressed: require('../assets/ui/home_split/nav_home_alert_pressed.png'),
};
const IMG_CLEAN_NAV_BAG = {
  normal: require('../assets/ui/home_split/nav_bag.png'),
  pressed: require('../assets/ui/home_split/nav_bag_pressed.png'),
  alert: require('../assets/ui/home_split/nav_bag_alert.png'),
  alertPressed: require('../assets/ui/home_split/nav_bag_alert_pressed.png'),
};
const IMG_CLEAN_NAV_SKILL = {
  normal: require('../assets/ui/home_split/nav_skill.png'),
  pressed: require('../assets/ui/home_split/nav_skill_pressed.png'),
  alert: require('../assets/ui/home_split/nav_skill_alert.png'),
  alertPressed: require('../assets/ui/home_split/nav_skill_alert_pressed.png'),
};
const IMG_CLEAN_NAV_CODEX = {
  normal: require('../assets/ui/home_split/nav_codex.png'),
  pressed: require('../assets/ui/home_split/nav_codex_pressed.png'),
  alert: require('../assets/ui/home_split/nav_codex_alert.png'),
  alertPressed: require('../assets/ui/home_split/nav_codex_alert_pressed.png'),
};
const IMG_LOBBY_KNIGHT = require('../assets/characters/lobby_reference/knight.png');
const IMG_LOBBY_MAGE = require('../assets/characters/lobby_reference/mage.png');
const IMG_LOBBY_ARCHER = require('../assets/characters/lobby_reference/archer.png');
const IMG_LOBBY_ROGUE = require('../assets/characters/lobby_reference/rogue.png');
const IMG_LOBBY_HEALER = require('../assets/characters/lobby_reference/healer.png');

const MODE_BTN_SIZE = W * 0.23;
const TOP_ICON_SIZE = W * 0.12;
const KNIGHT_SIZE = W * 0.57 * 1.5;
const MAGE_SIZE = KNIGHT_SIZE / 1.3;
const KNIGHT_DISPLAY_SIZE = KNIGHT_SIZE / 1.3;
const SHOWCASE_CHARACTER_FACING: Record<string, 1 | -1> = {
  archer: -1,
  rogue: -1,
};
const FINAL_SIZE_SHOWCASE_CHARACTERS = new Set(['archer', 'rogue', 'healer']);
const LOBBY_REFERENCE_CHARACTER_IMAGES: Record<string, any> = {
  knight: IMG_LOBBY_KNIGHT,
  mage: IMG_LOBBY_MAGE,
  archer: IMG_LOBBY_ARCHER,
  rogue: IMG_LOBBY_ROGUE,
  healer: IMG_LOBBY_HEALER,
};
const HOME_REFERENCE_WIDTH = 862;
const HOME_REFERENCE_HEIGHT = 1824;
const HOME_REFERENCE_HITBOXES = {
  profile: {x: 17, y: 22, width: 280, height: 103},
  energy: {x: 397, y: 23, width: 200, height: 57},
  gold: {x: 398, y: 82, width: 187, height: 55},
  gem: {x: 572, y: 82, width: 164, height: 55},
  settings: {x: 755, y: 24, width: 86, height: 87},
  logo: {x: 249, y: 172, width: 365, height: 264},
  event: {x: 27, y: 407, width: 119, height: 137},
  quest: {x: 27, y: 560, width: 119, height: 137},
  achievement: {x: 27, y: 713, width: 119, height: 137},
  mail: {x: 27, y: 866, width: 119, height: 137},
  shop: {x: 726, y: 485, width: 118, height: 137},
  pass: {x: 726, y: 638, width: 118, height: 137},
  friends: {x: 726, y: 790, width: 118, height: 137},
  character: {x: 204, y: 510, width: 522, height: 590},
  playPanel: {x: 23, y: 1072, width: 816, height: 550},
  primaryPlay: {x: 74, y: 1184, width: 714, height: 134},
  battle: {x: 53, y: 1362, width: 166, height: 219},
  raid: {x: 247, y: 1362, width: 166, height: 219},
  endless: {x: 441, y: 1362, width: 166, height: 219},
  ranking: {x: 635, y: 1362, width: 166, height: 219},
  navHome: {x: 31, y: 1660, width: 191, height: 140},
  navBag: {x: 223, y: 1660, width: 202, height: 140},
  navSkill: {x: 425, y: 1660, width: 202, height: 140},
  navCodex: {x: 627, y: 1660, width: 206, height: 140},
  bottomNav: {x: 27, y: 1657, width: 809, height: 145},
} as const;

const CHARACTERS = CHARACTER_CLASSES.map(characterClass => ({
  id: characterClass.id,
  name: characterClass.name,
  emoji: characterClass.emoji,
  description: characterClass.description,
}));

type LobbyNoticeState = {
  friends: boolean;
  missions: boolean;
  shop: boolean;
};

const EMPTY_LOBBY_NOTICES: LobbyNoticeState = {
  friends: false,
  missions: false,
  shop: false,
};

function NoticeBadge({visible}: {visible: boolean}) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.noticeBadge}>
      <Text style={styles.noticeBadgeText}>!</Text>
    </View>
  );
}

function LobbyShortcutButton({
  image,
  label,
  onPress,
  showNotice,
}: {
  image: any;
  label: string;
  onPress: () => void;
  showNotice: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={styles.topShortcutButton}>
      <Image source={image} style={styles.topShortcutIcon} resizeMode="contain" />
      <Text numberOfLines={1} style={styles.topShortcutLabel}>
        {label}
      </Text>
      <NoticeBadge visible={showNotice} />
    </TouchableOpacity>
  );
}

function LobbySideButton({
  image,
  emoji,
  label,
  onPress,
  showNotice,
}: {
  image?: any;
  emoji?: string;
  label: string;
  onPress: () => void;
  showNotice?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={styles.sideMenuButton}>
      {image ? (
        <Image source={image} style={styles.sideMenuIcon} resizeMode="contain" />
      ) : (
        <Text style={styles.sideMenuEmoji}>{emoji}</Text>
      )}
      <Text numberOfLines={1} style={styles.sideMenuLabel}>
        {label}
      </Text>
      <NoticeBadge visible={!!showNotice} />
    </TouchableOpacity>
  );
}

function ResourcePill({
  icon,
  value,
  onPress,
  wide,
}: {
  icon: string;
  value: string;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.resourcePill, wide && styles.resourcePillWide]}>
      <Text style={styles.resourceIcon}>{icon}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.resourceValue}>
        {value}
      </Text>
      <View style={styles.resourcePlus}>
        <Text style={styles.resourcePlusText}>+</Text>
      </View>
    </TouchableOpacity>
  );
}

function PlayTile({
  image,
  label,
  onPress,
  tone,
  showNotice,
}: {
  image: any;
  label: string;
  onPress: () => void;
  tone: 'blue' | 'red' | 'green' | 'purple';
  showNotice?: boolean;
}) {
  const toneStyle = {
    blue: styles.playTileBlue,
    red: styles.playTileRed,
    green: styles.playTileGreen,
    purple: styles.playTilePurple,
  }[tone];

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={[styles.playTile, toneStyle]}>
      <Image source={image} style={styles.playTileIcon} resizeMode="contain" />
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.playTileLabel}>
        {label}
      </Text>
      <NoticeBadge visible={!!showNotice} />
    </TouchableOpacity>
  );
}

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
  const [lobbyNotices, setLobbyNotices] =
    useState<LobbyNoticeState>(EMPTY_LOBBY_NOTICES);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showEndlessLoadoutModal, setShowEndlessLoadoutModal] = useState(false);
  const [selectedChar, setSelectedCharState] = useState<string | null>(null);
  const [showCharSelect, setShowCharSelect] = useState(false);
  const [charData, setCharData] = useState<CharacterData | null>(null);
  const [charDataMap, setCharDataMap] = useState<Record<string, CharacterData>>(
    {},
  );
  const [characterVisualTunings, setCharacterVisualTunings] = useState(
    getCachedCharacterVisualTunings(),
  );
  const [homeBackgroundWorldId, setHomeBackgroundWorldId] = useState(1);
  const pendingGrantsCheckedRef = useRef(false);
  const announcementsLoadedRef = useRef(false);

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
        : KNIGHT_DISPLAY_SIZE;
  const mainCharacterBaseHeight =
    selectedCharacterClass.id === 'mage'
      ? Math.round(MAGE_SIZE * (1088 / 720))
      : selectedCharacterClass.id === 'knight'
        ? Math.round(KNIGHT_DISPLAY_SIZE * (956 / 700))
        : KNIGHT_DISPLAY_SIZE;
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
  const homeBackgroundSource =
    getWorldBackgroundSource(homeBackgroundWorldId) ?? IMG_CLEAN_BACKGROUND;
  const selectedCharacterLevel = charData?.level ?? 1;
  const selectedCharacterXp = charData?.xp ?? 0;
  const selectedCharacterNextXp = Math.max(1, xpToNextLevel(selectedCharacterLevel));
  const selectedCharacterXpRatio = Math.max(
    0,
    Math.min(1, selectedCharacterXp / selectedCharacterNextXp),
  );
  const heartStatusText = `${formatHeartStatus(
    gameData?.hearts ?? 0,
    maxHearts,
    hasInfiniteHearts,
  )}${timerText ? ` ${timerText}` : ''}`;

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

  useEffect(() => {
    let active = true;
    const refreshHomeBackground = () => {
      loadLastPlayedWorldId().then(worldId => {
        if (active) {
          setHomeBackgroundWorldId(worldId);
        }
      });
    };

    refreshHomeBackground();
    const unsubscribe = navigation.addListener?.('focus', refreshHomeBackground);

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [navigation]);

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
      const tuning =
        characterVisualTunings[
          characterId as keyof typeof characterVisualTunings
        ] ?? characterVisualTunings.knight;
      const shouldRenderAtFinalSize =
        FINAL_SIZE_SHOWCASE_CHARACTERS.has(characterId);
      const previewScale = tuning.showcaseScaleMultiplier * (compact ? 0.8 : 1);
      const showcaseTransform = {
        transform: [
          {translateX: tuning.showcaseOffsetX},
          {translateY: tuning.showcaseOffsetY},
          ...(shouldRenderAtFinalSize ? [] : [{scale: previewScale}]),
        ],
      };
      const lobbyReferenceImage = LOBBY_REFERENCE_CHARACTER_IMAGES[characterId];

      if (lobbyReferenceImage) {
        return (
          <View style={[styles.modalSpriteWrap, showcaseTransform]}>
            <Image
              source={lobbyReferenceImage}
              style={[
                styles.lobbyReferencePreviewImage,
                {
                  width: size * (compact ? 1.12 : 1.28),
                  height: size * (compact ? 1.18 : 1.38),
                },
              ]}
              resizeMode="contain"
            />
          </View>
        );
      }

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

      return (
        <View style={[styles.modalSpriteWrap, showcaseTransform]}>
          <CharacterSprite
            characterId={characterId}
            size={
              (compact ? size * 0.92 : size) *
              (shouldRenderAtFinalSize ? previewScale : 1)
            }
            facing={SHOWCASE_CHARACTER_FACING[characterId] ?? 1}
            assetProfile={characterId === 'healer' ? 'lobbyHd' : 'normal'}
          />
        </View>
      );
    },
    [characterVisualTunings],
  );

  const renderSelectedCharacterShowcase = useCallback(() => {
    const shouldRenderAtFinalSize = FINAL_SIZE_SHOWCASE_CHARACTERS.has(
      selectedCharacterClass.id,
    );
    const showcaseTransform = {
      transform: [
        {translateX: selectedCharacterTuning.showcaseOffsetX},
        {translateY: selectedCharacterTuning.showcaseOffsetY},
        ...(shouldRenderAtFinalSize
          ? []
          : [{scale: selectedCharacterTuning.showcaseScaleMultiplier}]),
      ],
    };
    const lobbyReferenceImage =
      LOBBY_REFERENCE_CHARACTER_IMAGES[selectedCharacterClass.id];

    if (lobbyReferenceImage) {
      return (
        <View style={[styles.mainCharacterSpriteWrap, showcaseTransform]}>
          <Image
            source={lobbyReferenceImage}
            style={[
              styles.lobbyReferenceMainImage,
              {
                width: mainCharacterDisplayWidth * 1.05,
                height: mainCharacterDisplayHeight * 1.05,
              },
            ]}
            resizeMode="contain"
          />
        </View>
      );
    }

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

    return (
      <View style={[styles.mainCharacterSpriteWrap, showcaseTransform]}>
        <View style={styles.knightWrap}>
          <View style={styles.knightShadow} />
          <CharacterSprite
            characterId={selectedCharacterClass.id}
            size={
              KNIGHT_DISPLAY_SIZE *
              (shouldRenderAtFinalSize
                ? selectedCharacterTuning.showcaseScaleMultiplier
                : 1)
            }
            facing={SHOWCASE_CHARACTER_FACING[selectedCharacterClass.id] ?? 1}
            assetProfile={
              selectedCharacterClass.id === 'healer' ? 'lobbyHd' : 'normal'
            }
          />
        </View>
      </View>
    );
  }, [
    mainCharacterDisplayHeight,
    mainCharacterDisplayWidth,
    selectedCharacterClass.id,
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

    const hydrateLobbyNotices = async () => {
      try {
        const [
          loadedDailyStats,
          loadedMissionData,
          loadedAchievementData,
          endlessStats,
          levelProgress,
        ] = await Promise.all([
          loadDailyStats(),
          loadMissionData(),
          loadAchievements(),
          loadEndlessStats(),
          loadLevelProgress(),
        ]);
        const totalLevelClears = Object.values(levelProgress).filter(
          progress => progress.cleared,
        ).length;
        const allStats: Record<string, number> = {
          dailyGames: loadedDailyStats.games,
          dailyScore: loadedDailyStats.score,
          dailyLines: loadedDailyStats.lines,
          dailyMaxCombo: loadedDailyStats.maxCombo,
          dailyLevelClears: loadedDailyStats.levelClears,
          totalLevelClears,
          endlessHighScore: endlessStats.highScore,
          totalLines: endlessStats.totalLines + loadedDailyStats.lines,
          maxCombo: Math.max(endlessStats.maxCombo, loadedDailyStats.maxCombo),
          totalGames: endlessStats.totalGames + loadedDailyStats.games,
          endlessMaxLevel: endlessStats.maxLevel,
        };
        const hasMissionReward = DAILY_MISSIONS.some(mission => {
          const currentValue = allStats[mission.stat] || 0;
          return currentValue >= mission.target && !loadedMissionData.claimed[mission.id];
        });
        const hasAchievementReward = ACHIEVEMENTS.some(achievement => {
          const currentValue = allStats[achievement.stat] || 0;
          return (
            currentValue >= achievement.target &&
            !loadedAchievementData[achievement.id]
          );
        });
        let hasFriendRequest = false;

        try {
          const playerId = await getPlayerId();
          const {data: pendingRequests} = await getPendingRequests(playerId);
          hasFriendRequest = pendingRequests.length > 0;
        } catch {}

        setLobbyNotices({
          friends: hasFriendRequest,
          missions: hasMissionReward || hasAchievementReward,
          shop: false,
        });
      } catch {
        setLobbyNotices(EMPTY_LOBBY_NOTICES);
      }
    };
    hydrateLobbyNotices().catch(() => {});

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
            Alert.alert(t('common.notice'), `보상??지급되?�습?�다.\n${summary}`);
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
      Alert.alert(t('common.notice'), '?�트 무제??모드가 ?�성?�되???�습?�다.');
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

  const handleOpenEndless = useCallback(() => {
    if (!gameData) {
      return;
    }

    setShowEndlessLoadoutModal(true);
  }, [gameData]);

  const handleConfirmEndlessLoadout = useCallback(
    async (loadout: GameData['startingItemLoadout']) => {
      if (!gameData) {
        return;
      }

      const updatedGameData = await saveStartingItemLoadout(
        gameData,
        loadout ?? [],
      );
      setGameData(updatedGameData);
      setShowEndlessLoadoutModal(false);
      navigation.navigate('Endless');
    },
    [gameData, navigation],
  );

  const renderHomeBackground = () => (
    <>
      <Animated.Image
        source={homeBackgroundSource}
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
    </>
  );

  const referenceScale = Math.max(
    windowSize.width / HOME_REFERENCE_WIDTH,
    windowSize.height / HOME_REFERENCE_HEIGHT,
  );
  const referenceWidth = HOME_REFERENCE_WIDTH * referenceScale;
  const referenceHeight = HOME_REFERENCE_HEIGHT * referenceScale;
  const referenceLeft = (windowSize.width - referenceWidth) / 2;
  const referenceTop = Math.max(0, (windowSize.height - referenceHeight) / 2);

  const referenceBoxStyle = (
    box: (typeof HOME_REFERENCE_HITBOXES)[keyof typeof HOME_REFERENCE_HITBOXES],
  ) => ({
    left: referenceLeft + box.x * referenceScale,
    top: referenceTop + box.y * referenceScale,
    width: box.width * referenceScale,
    height: box.height * referenceScale,
  });

  const handleReferenceSkillPress = () => {
    if (selectedChar) {
      navigation.navigate('SkillTree', {characterId: selectedChar});
      return;
    }
    setShowCharSelect(true);
  };

  const handleReferenceMailPress = () => {
    if (announcement) {
      setShowAnnouncementModal(true);
      return;
    }
    navigation.navigate('Missions');
  };

  const referenceFont = (size: number, min = 9) =>
    Math.max(min, Math.round(size * referenceScale));

  const renderCleanAsset = (
    source: any,
    key: keyof typeof HOME_REFERENCE_HITBOXES,
    resizeMode: 'contain' | 'cover' | 'stretch' = 'stretch',
    extraStyle?: object,
  ) => (
    <View
      key={String(key)}
      pointerEvents="none"
      style={[
        styles.referenceImageSlot,
        referenceBoxStyle(HOME_REFERENCE_HITBOXES[key]),
        extraStyle,
      ]}>
      <Image source={source} resizeMode={resizeMode} style={styles.referenceSlotImage} />
    </View>
  );

  const resolveCleanButtonSource = (
    source: any,
    showNotice: boolean | undefined,
    pressed: boolean,
  ) => {
    if (showNotice && pressed && source.alertPressed) {
      return source.alertPressed;
    }
    if (pressed && source.pressed) {
      return source.pressed;
    }
    if (showNotice && source.alert) {
      return source.alert;
    }
    return source.normal ?? source;
  };

  const renderCleanButton = ({
    source,
    boxKey,
    onPress,
    onLongPress,
    showNotice,
    resizeMode = 'stretch',
    children,
    extraStyle,
  }: {
    source: any;
    boxKey: keyof typeof HOME_REFERENCE_HITBOXES;
    onPress: () => void;
    onLongPress?: () => void;
    showNotice?: boolean;
    resizeMode?: 'contain' | 'cover' | 'stretch';
    children?: React.ReactNode;
    extraStyle?: object;
  }) => (
    <Pressable
      key={String(boxKey)}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.cleanButton,
        referenceBoxStyle(HOME_REFERENCE_HITBOXES[boxKey]),
        extraStyle,
      ]}>
      {({pressed}) => (
        <>
          <Image
            source={resolveCleanButtonSource(source, showNotice, pressed)}
            resizeMode={resizeMode}
            style={styles.referenceSlotImage}
          />
          {children}
        </>
      )}
    </Pressable>
  );

  const renderReferenceHomeLayer = () => (
    <View style={styles.referenceHomeLayer}>
      <View
        pointerEvents="none"
        style={[
          styles.referenceBackgroundSlot,
          {
            left: referenceLeft,
            top: referenceTop,
            width: referenceWidth,
            height: referenceHeight,
          },
        ]}>
        <Image
          source={homeBackgroundSource}
          resizeMode="cover"
          style={styles.referenceSlotImage}
        />
      </View>
      <Pressable
        onPress={() => setShowCharSelect(true)}
        style={({pressed}) => [
          styles.referenceImageSlot,
          styles.referenceCharacterSlot,
          referenceBoxStyle(HOME_REFERENCE_HITBOXES.character),
          pressed && styles.cleanButtonPressed,
        ]}>
        <Image
          source={
            LOBBY_REFERENCE_CHARACTER_IMAGES[selectedCharacterClass.id] ??
            IMG_LOBBY_HEALER
          }
          resizeMode="contain"
          style={styles.referenceSlotImage}
        />
      </Pressable>
      {renderCleanButton({
        source: IMG_CLEAN_PROFILE,
        boxKey: 'profile',
        onPress: () => navigation.navigate('Profile'),
      })}
      {renderCleanButton({
        source: IMG_CLEAN_ENERGY,
        boxKey: 'energy',
        onPress: handleRefillHearts,
        children: (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.cleanResourceText, {fontSize: referenceFont(21, 10)}]}>
            {heartStatusText}
          </Text>
        ),
      })}
      {renderCleanButton({
        source: IMG_CLEAN_GOLD,
        boxKey: 'gold',
        onPress: () => navigation.navigate('Shop'),
        children: (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.cleanResourceText, {fontSize: referenceFont(21, 10)}]}>
            {(gameData?.gold ?? 0).toLocaleString()}
          </Text>
        ),
      })}
      {renderCleanButton({
        source: IMG_CLEAN_GEM,
        boxKey: 'gem',
        onPress: () => navigation.navigate('Shop'),
        children: (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.cleanResourceText, {fontSize: referenceFont(21, 10)}]}>
            {(gameData?.diamonds ?? 0).toLocaleString()}
          </Text>
        ),
      })}
      {renderCleanButton({
        source: IMG_CLEAN_SETTINGS,
        boxKey: 'settings',
        onPress: () => navigation.navigate('Settings'),
      })}
      {renderCleanButton({
        source: IMG_CLEAN_LOGO,
        boxKey: 'logo',
        onPress: () => {},
        onLongPress: () => navigation.navigate('HiddenBlockWorld'),
        resizeMode: 'contain',
        extraStyle: styles.referenceLogoSlot,
      })}
      {renderCleanButton({
        source: IMG_CLEAN_EVENT,
        boxKey: 'event',
        onPress: () => navigation.navigate('Missions'),
        showNotice: lobbyNotices.missions,
      })}
      {renderCleanButton({
        source: IMG_CLEAN_QUEST,
        boxKey: 'quest',
        onPress: () => navigation.navigate('Missions'),
        showNotice: lobbyNotices.missions,
      })}
      {renderCleanButton({
        source: IMG_CLEAN_ACHIEVEMENT,
        boxKey: 'achievement',
        onPress: () => navigation.navigate('Missions'),
        showNotice: lobbyNotices.missions,
      })}
      {renderCleanButton({
        source: IMG_CLEAN_MAIL,
        boxKey: 'mail',
        onPress: handleReferenceMailPress,
        showNotice: !!announcement,
      })}
      {renderCleanButton({
        source: IMG_CLEAN_SHOP,
        boxKey: 'shop',
        onPress: () => navigation.navigate('Shop'),
        showNotice: lobbyNotices.shop,
      })}
      {renderCleanButton({
        source: IMG_CLEAN_PASS,
        boxKey: 'pass',
        onPress: () => navigation.navigate('Missions'),
        showNotice: lobbyNotices.missions,
      })}
      {renderCleanButton({
        source: IMG_CLEAN_FRIENDS,
        boxKey: 'friends',
        onPress: () => navigation.navigate('Friends'),
        showNotice: lobbyNotices.friends,
      })}
      {renderCleanAsset(IMG_CLEAN_PLAY_PANEL, 'playPanel')}
      {renderCleanButton({
        source: IMG_CLEAN_PRIMARY_PLAY,
        boxKey: 'primaryPlay',
        onPress: () => navigation.navigate('Levels'),
      })}
      {renderCleanButton({
        source: IMG_CLEAN_MODE_BATTLE,
        boxKey: 'battle',
        onPress: () => navigation.navigate('Lobby'),
        showNotice: lobbyNotices.friends,
      })}
      {renderCleanButton({
        source: IMG_CLEAN_MODE_RAID,
        boxKey: 'raid',
        onPress: () => navigation.navigate('RaidLobby'),
        showNotice: lobbyNotices.missions,
      })}
      {renderCleanButton({
        source: IMG_CLEAN_MODE_ENDLESS,
        boxKey: 'endless',
        onPress: handleOpenEndless,
      })}
      {renderCleanButton({
        source: IMG_CLEAN_MODE_RANKING,
        boxKey: 'ranking',
        onPress: () => navigation.navigate('Ranking'),
      })}
      {renderCleanAsset(IMG_CLEAN_BOTTOM_NAV, 'bottomNav')}
      {renderCleanButton({
        source: IMG_CLEAN_NAV_HOME,
        boxKey: 'navHome',
        onPress: () => {},
      })}
      {renderCleanButton({
        source: IMG_CLEAN_NAV_BAG,
        boxKey: 'navBag',
        onPress: () => navigation.navigate('BlockWorldBag'),
      })}
      {renderCleanButton({
        source: IMG_CLEAN_NAV_SKILL,
        boxKey: 'navSkill',
        onPress: handleReferenceSkillPress,
        showNotice: lobbyNotices.missions,
      })}
      {renderCleanButton({
        source: IMG_CLEAN_NAV_CODEX,
        boxKey: 'navCodex',
        onPress: () => navigation.navigate('BossCodex'),
      })}
    </View>
  );

  if (!gameData || (selectedChar === null && !showCharSelect)) {
    return (
      <View style={styles.container}>
        {renderHomeBackground()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHomeBackground()}
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          hidden
          translucent
          backgroundColor="transparent"
          barStyle="dark-content"
        />

        <View pointerEvents="box-none" style={styles.homeLayer}>
          <View style={styles.topHud}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => navigation.navigate('Profile')}
              style={styles.playerCard}>
              <Image
                source={IMG_PROFILE}
                style={styles.playerPortrait}
                resizeMode="contain"
              />
              <View style={styles.playerInfo}>
                <Text numberOfLines={1} style={styles.playerName}>
                  블록?�사
                </Text>
                <View style={styles.playerLevelRow}>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelBadgeText}>
                      {selectedCharacterLevel}
                    </Text>
                  </View>
                  <View style={styles.xpTrack}>
                    <View
                      style={[
                        styles.xpFill,
                        {width: `${selectedCharacterXpRatio * 100}%`},
                      ]}
                    />
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.resourceCluster}>
              <ResourcePill
                icon="E"
                value={heartStatusText}
                onPress={handleRefillHearts}
                wide
              />
              <View style={styles.resourceRow}>
                <ResourcePill
                  icon="G"
                  value={gameData.gold.toLocaleString()}
                  onPress={() => navigation.navigate('Shop')}
                />
                <ResourcePill
                  icon="D"
                  value={gameData.diamonds.toLocaleString()}
                  onPress={() => navigation.navigate('Shop')}
                />
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => navigation.navigate('Settings')}
              style={styles.settingsCard}>
              <Image
                source={IMG_SETTINGS}
                style={styles.settingsIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.94}
            onLongPress={() => navigation.navigate('HiddenBlockWorld')}
            style={styles.logoButton}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoCrown}>*</Text>
              <View style={styles.logoTextRow}>
                <Text style={[styles.logoText, styles.logoTextGold]}>BLOCK</Text>
                <Text style={[styles.logoText, styles.logoTextLight]}>HERO</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={[styles.sideMenuStack, styles.sideMenuLeft]}>
            <LobbySideButton
              image={IMG_REWARD}
              label="이벤트"
              onPress={() => navigation.navigate('Missions')}
              showNotice={lobbyNotices.missions}
            />
            <LobbySideButton
              image={IMG_MISSIONS}
              label="퀘스트"
              onPress={() => navigation.navigate('Missions')}
              showNotice={lobbyNotices.missions}
            />
            <LobbySideButton
              image={IMG_RANKING}
              label="업적"
              onPress={() => navigation.navigate('Missions')}
            />
            <LobbySideButton
              emoji="MAIL"
              label="우편"
              onPress={() => setShowAnnouncementModal(!!announcement)}
              showNotice={!!announcement}
            />
          </View>

          <View style={[styles.sideMenuStack, styles.sideMenuRight]}>
            <LobbySideButton
              image={IMG_SHOP}
              label="상점"
              onPress={() => navigation.navigate('Shop')}
              showNotice={lobbyNotices.shop}
            />
            <LobbySideButton
              image={IMG_REWARD}
              label="패스"
              onPress={() => navigation.navigate('Missions')}
              showNotice={lobbyNotices.missions}
            />
            <LobbySideButton
              image={IMG_FRIENDS}
              label="친구"
              onPress={() => navigation.navigate('Friends')}
              showNotice={lobbyNotices.friends}
            />
          </View>

          <View pointerEvents="box-none" style={styles.characterStage}>
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
            </Animated.View>
          </View>

          <View style={styles.playPanel}>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => navigation.navigate('Levels')}
              style={styles.primaryPlayButton}>
              <Image
                source={IMG_LEVEL}
                style={styles.primaryPlayIcon}
                resizeMode="contain"
              />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={styles.primaryPlayText}>
                레벨 시작
              </Text>
              <Text style={styles.primaryPlayGhost}>LEVEL</Text>
            </TouchableOpacity>
            <View style={styles.playTileGrid}>
              <PlayTile
                image={IMG_BATTLE}
                label="대전"
                tone="blue"
                onPress={() => navigation.navigate('Lobby')}
                showNotice={lobbyNotices.friends}
              />
              <PlayTile
                image={IMG_RAID}
                label="레이드"
                tone="red"
                onPress={() => navigation.navigate('RaidLobby')}
                showNotice={lobbyNotices.missions}
              />
              <PlayTile
                image={IMG_ENDLESS}
                label="무한"
                tone="green"
                onPress={handleOpenEndless}
              />
              <PlayTile
                image={IMG_RANKING}
                label="랭킹"
                tone="purple"
                onPress={() => navigation.navigate('Ranking')}
              />
            </View>
          </View>
        </View>

        <View style={styles.topBar}>
          <View style={styles.topCluster}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => navigation.navigate('Profile')}>
              <Image source={IMG_PROFILE} style={styles.topIcon} resizeMode="contain" />
            </TouchableOpacity>
            <View style={styles.leftShortcutStack}>
              <LobbyShortcutButton
                image={IMG_FRIENDS}
                label="친구"
                onPress={() => navigation.navigate('Friends')}
                showNotice={lobbyNotices.friends}
              />
            </View>
          </View>

          <View style={[styles.topCluster, styles.topClusterRight]}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => navigation.navigate('Settings')}>
              <Image source={IMG_SETTINGS} style={styles.topIcon} resizeMode="contain" />
            </TouchableOpacity>
            <View style={styles.rightShortcutStack}>
              <LobbyShortcutButton
                image={IMG_SHOP}
                label="상점"
                onPress={() => navigation.navigate('Shop')}
                showNotice={lobbyNotices.shop}
              />
              <LobbyShortcutButton
                image={IMG_REWARD}
                label="보상"
                onPress={() => navigation.navigate('Missions')}
                showNotice={lobbyNotices.missions}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.94}
          onLongPress={() => navigation.navigate('HiddenBlockWorld')}>
          <Image source={IMG_TITLE} style={styles.titleImage} resizeMode="contain" />
        </TouchableOpacity>

        {announcement && (
          <TouchableOpacity
            style={styles.announceBanner}
            onPress={() => {
              setShowAnnouncementModal(true);
            }}>
            <Text style={styles.announceText}>공�? · {announcement.title}</Text>
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
              <Text style={styles.characterTapHintText}>캐릭???�치</Text>
            </View>
          </Animated.View>

          <View style={styles.modeRow}>
            <View style={styles.modeBtnPlaceholder} />
            <View style={styles.characterSpace} />
            <TouchableOpacity
              style={styles.modeBtnWrapper}
              onPress={() => navigation.navigate('Ranking')}>
              <Image source={IMG_RANKING} style={styles.modeIcon} resizeMode="contain" />
              <Text style={styles.modeLabel}>??��</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={styles.modeBtnWrapper}
              onPress={() => navigation.navigate('Levels')}>
              <Image source={IMG_LEVEL} style={styles.modeIcon} resizeMode="contain" />
              <Text style={styles.modeLabel}>?�벨 모드</Text>
            </TouchableOpacity>
            <View style={styles.characterSpace} />
            <TouchableOpacity
              style={styles.modeBtnWrapper}
              onPress={() => navigation.navigate('Lobby')}>
              <Image source={IMG_BATTLE} style={styles.modeIcon} resizeMode="contain" />
              <Text style={styles.modeLabel}>?�??모드</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={styles.modeBtnWrapper}
              onPress={handleOpenEndless}>
              <Image source={IMG_ENDLESS} style={styles.modeIcon} resizeMode="contain" />
              <Text style={styles.modeLabel}>무한 모드</Text>
            </TouchableOpacity>
            <View style={styles.characterSpace} />
            <TouchableOpacity
              style={styles.modeBtnWrapper}
              onPress={() => navigation.navigate('RaidLobby')}>
              <Image source={IMG_RAID} style={styles.modeIcon} resizeMode="contain" />
              <Text style={styles.modeLabel}>?�이??모드</Text>
            </TouchableOpacity>
          </View>
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
                <Text style={styles.announcementModalCloseText}>?�기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showCharSelect} transparent animationType="fade">
          <View style={styles.charSelectOverlay}>
            <View style={styles.charSelectModal}>
              <View style={styles.charSelectHeader}>
                <Text style={styles.charSelectEyebrow}>CHARACTER LOUNGE</Text>
                <Text style={styles.charSelectTitle}>캐릭???�택</Text>
                <Text style={styles.charSelectSubtitle}>
                  메인 ?�면??캐릭?��? ?�치?�서 ?�제??교체?????�습?�다.
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
                <Text style={styles.charSelectCloseText}>?�기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {gameData && (
          <ItemLoadoutModal
            visible={showEndlessLoadoutModal}
            mode="endless"
            items={gameData.items}
            initialLoadout={gameData.startingItemLoadout}
            onClose={() => setShowEndlessLoadoutModal(false)}
            onConfirm={handleConfirmEndlessLoadout}
          />
        )}
      </SafeAreaView>
      {renderReferenceHomeLayer()}
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
  referenceHomeLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 120,
    elevation: 120,
    overflow: 'hidden',
  },
  referenceBackgroundSlot: {
    position: 'absolute',
  },
  referenceImageSlot: {
    position: 'absolute',
    zIndex: 20,
  },
  referenceSlotImage: {
    width: '100%',
    height: '100%',
  },
  referenceCharacterSlot: {
    zIndex: 12,
  },
  referenceLogoSlot: {
    zIndex: 30,
  },
  cleanButton: {
    position: 'absolute',
    zIndex: 70,
  },
  cleanButtonPressed: {
    opacity: 0.9,
    transform: [{scale: 0.96}],
  },
  cleanProfileName: {
    position: 'absolute',
    left: '43%',
    right: '8%',
    top: '17%',
    color: '#4a2f30',
    fontWeight: '900',
    textShadowColor: '#ffffff',
    textShadowRadius: 2,
  },
  cleanProfileLevel: {
    position: 'absolute',
    left: '32%',
    top: '59%',
    width: '12%',
    textAlign: 'center',
    color: '#ffffff',
    fontWeight: '900',
    textShadowColor: '#40215f',
    textShadowRadius: 2,
  },
  cleanProfileXpFill: {
    position: 'absolute',
    left: '43%',
    top: '62%',
    height: '23%',
    maxWidth: '47%',
    borderRadius: 999,
    backgroundColor: '#b45ae4',
  },
  cleanResourceText: {
    position: 'absolute',
    left: '30%',
    right: '21%',
    top: 0,
    bottom: 0,
    color: '#4b3424',
    fontWeight: '900',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  cleanSideLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '11%',
    color: '#3e2c5d',
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: '#ffffff',
    textShadowRadius: 2,
  },
  cleanPrimaryPlayLabel: {
    position: 'absolute',
    left: '30%',
    right: '16%',
    top: '31%',
    color: '#6b3f79',
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: '#ffe9a9',
    textShadowRadius: 3,
  },
  cleanModeLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '9%',
    color: '#ffffff',
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: '#523463',
    textShadowRadius: 3,
  },
  cleanNavLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '10%',
    color: '#4c3360',
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: '#fff7ea',
    textShadowRadius: 2,
  },
  referenceHitbox: {
    position: 'absolute',
    backgroundColor: 'transparent',
    zIndex: 80,
  },
  homeLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  topHud: {
    position: 'absolute',
    top: H * 0.032,
    left: W * 0.025,
    right: W * 0.025,
    zIndex: 60,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  playerCard: {
    width: W * 0.34,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#7d5c9d',
    backgroundColor: '#fff3d8',
    paddingHorizontal: 7,
    paddingVertical: 6,
    shadowColor: '#2b1846',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 6,
  },
  playerPortrait: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginRight: 7,
  },
  playerInfo: {
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    color: '#53345f',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 5,
  },
  playerLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelBadge: {
    width: 27,
    height: 27,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7755c8',
    borderWidth: 2,
    borderColor: '#f5e7ff',
    marginRight: 5,
  },
  levelBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  xpTrack: {
    flex: 1,
    height: 15,
    borderRadius: 999,
    backgroundColor: '#314690',
    borderWidth: 2,
    borderColor: '#f7e7ff',
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#a55bf4',
  },
  resourceCluster: {
    width: W * 0.39,
    alignItems: 'center',
    gap: 6,
  },
  resourceRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 6,
  },
  resourcePill: {
    flex: 1,
    minHeight: 36,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#9c7b52',
    backgroundColor: '#fff0cf',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 7,
    paddingRight: 2,
    shadowColor: '#2b1846',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
    elevation: 4,
  },
  resourcePillWide: {
    width: W * 0.21,
    flex: 0,
  },
  resourceIcon: {
    fontSize: 17,
    marginRight: 4,
  },
  resourceValue: {
    flex: 1,
    color: '#4d344d',
    fontSize: 13,
    fontWeight: '900',
  },
  resourcePlus: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7552bd',
    borderWidth: 2,
    borderColor: '#f4e8ff',
  },
  resourcePlusText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 18,
  },
  settingsCard: {
    width: W * 0.105,
    height: W * 0.105,
    minWidth: 58,
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#7d5c9d',
    backgroundColor: '#fff3d8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2b1846',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 6,
  },
  settingsIcon: {
    width: '75%',
    height: '75%',
  },
  logoButton: {
    position: 'absolute',
    top: H * 0.145,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 42,
  },
  logoBadge: {
    minWidth: W * 0.48,
    minHeight: 86,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 9,
    paddingBottom: 8,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#38346f',
    backgroundColor: 'rgba(75, 67, 134, 0.84)',
    shadowColor: '#1b1138',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    elevation: 9,
  },
  logoCrown: {
    position: 'absolute',
    top: -31,
    color: '#ffd45d',
    fontSize: 48,
    fontWeight: '900',
    textShadowColor: '#6b3b00',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 2,
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 34,
    fontWeight: '900',
    textShadowColor: '#2f245c',
    textShadowOffset: {width: 0, height: 4},
    textShadowRadius: 1,
  },
  logoTextGold: {
    color: '#ffc22c',
  },
  logoTextLight: {
    color: '#fff7ea',
  },
  sideMenuStack: {
    position: 'absolute',
    top: H * 0.255,
    zIndex: 50,
    gap: 10,
  },
  sideMenuLeft: {
    left: W * 0.03,
  },
  sideMenuRight: {
    right: W * 0.03,
  },
  sideMenuButton: {
    width: Math.min(W * 0.17, 78),
    height: Math.min(W * 0.17, 78),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#7d5c9d',
    backgroundColor: 'rgba(255, 247, 232, 0.94)',
    shadowColor: '#2b1846',
    shadowOpacity: 0.22,
    shadowRadius: 7,
    shadowOffset: {width: 0, height: 4},
    elevation: 5,
    paddingTop: 5,
  },
  sideMenuIcon: {
    width: '58%',
    height: '58%',
    marginBottom: -2,
  },
  sideMenuEmoji: {
    fontSize: 29,
    marginBottom: 3,
  },
  sideMenuLabel: {
    color: '#4f3666',
    fontSize: 12,
    fontWeight: '900',
    includeFontPadding: false,
  },
  characterStage: {
    position: 'absolute',
    top: H * 0.315,
    left: 0,
    right: 0,
    bottom: H * 0.34,
    zIndex: 28,
  },
  playPanel: {
    position: 'absolute',
    left: W * 0.035,
    right: W * 0.035,
    bottom: H * 0.105,
    height: Math.min(H * 0.255, 246),
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#6d4c87',
    backgroundColor: '#fff6e8',
    padding: 11,
    zIndex: 70,
    shadowColor: '#211231',
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 7},
    elevation: 10,
  },
  primaryPlayButton: {
    height: Math.min(H * 0.082, 80),
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#b87911',
    backgroundColor: '#ffd64f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 11,
  },
  primaryPlayIcon: {
    position: 'absolute',
    left: 16,
    width: 58,
    height: 58,
  },
  primaryPlayText: {
    color: '#6a3d72',
    fontSize: 30,
    fontWeight: '900',
    textShadowColor: 'rgba(255,255,255,0.75)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 1,
  },
  primaryPlayGhost: {
    position: 'absolute',
    right: 18,
    bottom: -8,
    color: 'rgba(180, 128, 25, 0.18)',
    fontSize: 60,
    fontWeight: '900',
  },
  playTileGrid: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  playTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#744b72',
    overflow: 'hidden',
  },
  playTileBlue: {
    backgroundColor: '#3f78d7',
  },
  playTileRed: {
    backgroundColor: '#cf5546',
  },
  playTileGreen: {
    backgroundColor: '#54af43',
  },
  playTilePurple: {
    backgroundColor: '#8e59d2',
  },
  playTileIcon: {
    width: '66%',
    height: '56%',
    marginBottom: -2,
  },
  playTileLabel: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '900',
    textShadowColor: 'rgba(52, 24, 58, 0.75)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 2,
  },
  topBar: {
    display: 'none',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: W * 0.035,
    paddingTop: H * 0.005,
    zIndex: 30,
  },
  topCluster: {
    position: 'relative',
    width: TOP_ICON_SIZE * 1.1,
  },
  topClusterRight: {
    alignItems: 'flex-end',
  },
  topIcon: {
    width: TOP_ICON_SIZE,
    height: TOP_ICON_SIZE,
  },
  leftShortcutStack: {
    position: 'absolute',
    left: 0,
    top: TOP_ICON_SIZE + 4,
    gap: 5,
  },
  rightShortcutStack: {
    position: 'absolute',
    right: 0,
    top: TOP_ICON_SIZE + 4,
    gap: 5,
  },
  topShortcutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: TOP_ICON_SIZE * 0.92,
    minHeight: TOP_ICON_SIZE * 0.82,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 244, 222, 0.82)',
    borderColor: 'rgba(118, 73, 34, 0.28)',
    borderWidth: 1,
    shadowColor: '#2b1608',
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 2,
    paddingVertical: 3,
  },
  topShortcutIcon: {
    width: TOP_ICON_SIZE * 0.54,
    height: TOP_ICON_SIZE * 0.54,
  },
  topShortcutLabel: {
    color: '#583820',
    fontSize: 9,
    fontWeight: '900',
    marginTop: -1,
  },
  noticeBadge: {
    position: 'absolute',
    right: -5,
    top: -5,
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ef1f2d',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  noticeBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
  titleImage: {
    display: 'none',
    width: W * 0.9,
    height: H * 0.13,
    alignSelf: 'center',
    marginTop: -H * 0.01,
  },
  currencyBarWrapper: {
    display: 'none',
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
    display: 'none',
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
  modeBtnPlaceholder: {
    width: MODE_BTN_SIZE,
    height: MODE_BTN_SIZE,
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
  lobbyReferencePreviewImage: {
    alignSelf: 'center',
  },
  lobbyReferenceMainImage: {
    alignSelf: 'center',
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
  announceBanner: {
    position: 'absolute',
    top: H * 0.272,
    left: W * 0.2,
    right: W * 0.2,
    zIndex: 75,
    backgroundColor: 'rgba(255, 246, 234, 0.8)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(109, 76, 135, 0.36)',
  },
  announceText: {
    color: '#6b4d91',
    fontSize: 12,
    fontWeight: '900',
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
