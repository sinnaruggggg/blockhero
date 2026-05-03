import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { getSelectedCharacter } from '../stores/gameStore';

const IMG_HOME = require('../assets/ui/home.png');
const IMG_CODEX = require('../assets/ui/codex.png');

export const GAME_BOTTOM_NAV_CHAT_OFFSET = 118;

export type GameBottomNavItem =
  | 'home'
  | 'bag'
  | 'skill'
  | 'codex';

interface GameBottomNavProps {
  navigation: any;
  activeItem?: GameBottomNavItem | null;
  selectedCharacterId?: string | null;
  onHomePress?: () => void | Promise<void>;
  onOpenCharacterPicker?: () => void;
  variant?: 'default' | 'lobbyPanel';
}

const MENU_ITEMS: Array<{
  id: GameBottomNavItem;
  label: string;
  image?: any;
  emoji?: string;
}> = [
  { id: 'home', label: '홈', image: IMG_HOME },
  { id: 'bag', label: '가방', emoji: '🎒' },
  { id: 'skill', label: '스킬', emoji: '📘' },
  { id: 'codex', label: '도감', image: IMG_CODEX },
];

export default function GameBottomNav({
  navigation,
  activeItem = null,
  selectedCharacterId,
  onHomePress,
  onOpenCharacterPicker,
  variant = 'default',
}: GameBottomNavProps) {
  const { width } = useWindowDimensions();
  const [storedCharacterId, setStoredCharacterId] = useState<string | null>(
    selectedCharacterId ?? null,
  );

  const baseIconSize = Math.min(width * 0.12, 50);
  const homeIconSize = Math.round(baseIconSize * 1.2);
  const isLobbyPanel = variant === 'lobbyPanel';

  useEffect(() => {
    if (selectedCharacterId !== undefined) {
      setStoredCharacterId(selectedCharacterId);
      return;
    }

    let mounted = true;
    getSelectedCharacter()
      .then(characterId => {
        if (mounted) {
          setStoredCharacterId(characterId);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [selectedCharacterId]);

  const handleOpenSkillTree = useCallback(async () => {
    const characterId =
      selectedCharacterId ?? storedCharacterId ?? (await getSelectedCharacter());

    if (characterId) {
      navigation.navigate('SkillTree', { characterId });
      return;
    }

    if (onOpenCharacterPicker) {
      onOpenCharacterPicker();
      return;
    }

    navigation.replace('Home');
  }, [navigation, onOpenCharacterPicker, selectedCharacterId, storedCharacterId]);

  const handlePress = useCallback(
    async (itemId: GameBottomNavItem) => {
      switch (itemId) {
        case 'home':
          if (activeItem === 'home') {
            return;
          }
          await onHomePress?.();
          navigation.replace('Home');
          return;
        case 'bag':
          if (activeItem !== 'bag') {
            navigation.navigate('BlockWorldBag');
          }
          return;
        case 'skill':
          await handleOpenSkillTree();
          return;
        case 'codex':
          if (activeItem !== 'codex') {
            navigation.navigate('BossCodex');
          }
          return;
      }
    },
    [activeItem, handleOpenSkillTree, navigation, onHomePress],
  );

  return (
    <View style={[styles.host, isLobbyPanel && styles.lobbyHost]}>
      <View style={[styles.row, isLobbyPanel && styles.lobbyRow]}>
        {MENU_ITEMS.map(item => {
          const isHome = item.id === 'home';
          const isActive = activeItem === item.id;
          const iconSize = isHome ? homeIconSize : baseIconSize;

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.item,
                isLobbyPanel && styles.lobbyItem,
                isHome && styles.homeItem,
                isLobbyPanel && isHome && styles.lobbyHomeItem,
                isActive && styles.activeItem,
                isLobbyPanel && isActive && styles.lobbyActiveItem,
              ]}
              activeOpacity={0.82}
              onPress={() => {
                handlePress(item.id).catch(error => {
                  console.warn('GameBottomNav navigation error:', error);
                });
              }}
            >
              {item.image ? (
                <Image
                  source={item.image}
                  style={{ width: iconSize, height: iconSize }}
                  resizeMode="contain"
                />
              ) : (
                <Text
                  style={[
                    styles.emojiIcon,
                    {
                      fontSize: iconSize * 0.58,
                      width: iconSize,
                      height: iconSize,
                      lineHeight: iconSize,
                    },
                  ]}
                >
                  {item.emoji}
                </Text>
              )}
              <Text
                style={[
                  styles.label,
                  isLobbyPanel && styles.lobbyLabel,
                  isActive && styles.activeLabel,
                  isLobbyPanel && isActive && styles.lobbyActiveLabel,
                ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    paddingHorizontal: 10,
    paddingBottom: 4,
  },
  lobbyHost: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 8,
    zIndex: 90,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  lobbyRow: {
    minHeight: 76,
    alignItems: 'stretch',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#7b5b91',
    backgroundColor: '#fff6e8',
    overflow: 'hidden',
    shadowColor: '#221236',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 9,
    elevation: 9,
  },
  item: {
    minWidth: 42,
    alignItems: 'center',
    opacity: 0.9,
  },
  lobbyItem: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingVertical: 7,
    opacity: 1,
    borderRightWidth: 1,
    borderRightColor: 'rgba(123, 91, 145, 0.28)',
  },
  homeItem: {
    transform: [{ translateY: -4 }],
  },
  lobbyHomeItem: {
    transform: [{ translateY: 0 }],
  },
  activeItem: {
    opacity: 1,
  },
  lobbyActiveItem: {
    backgroundColor: '#9b74d8',
  },
  emojiIcon: {
    textAlign: 'center',
  },
  label: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  lobbyLabel: {
    color: '#5b3d67',
    fontSize: 13,
    textShadowColor: 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },
  activeLabel: {
    color: '#fdf1ff',
  },
  lobbyActiveLabel: {
    color: '#ffffff',
  },
});
