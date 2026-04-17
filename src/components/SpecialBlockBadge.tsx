import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type SpecialBlockBadgeProps = {
  isGem?: boolean;
  isItem?: boolean;
  itemType?: string;
  size: number;
};

function getBadgeIcon(isGem: boolean, itemType?: string): string {
  if (isGem) {
    return '\u{1F48E}';
  }

  switch (itemType) {
    case 'hammer':
      return '\u{1F528}';
    case 'bomb':
      return '\u{1F4A3}';
    case 'refresh':
      return '\u21BB';
    default:
      return '+';
  }
}

function getBadgeColors(isGem: boolean, itemType?: string) {
  if (isGem) {
    return {
      backgroundColor: '#0ea5e9',
      borderColor: '#dbeafe',
      iconColor: '#ffffff',
    };
  }

  switch (itemType) {
    case 'hammer':
      return {
        backgroundColor: '#f59e0b',
        borderColor: '#fef3c7',
        iconColor: '#22120a',
      };
    case 'bomb':
      return {
        backgroundColor: '#ef4444',
        borderColor: '#fee2e2',
        iconColor: '#ffffff',
      };
    case 'refresh':
      return {
        backgroundColor: '#22c55e',
        borderColor: '#dcfce7',
        iconColor: '#052e16',
      };
    default:
      return {
        backgroundColor: '#334155',
        borderColor: '#e2e8f0',
        iconColor: '#ffffff',
      };
  }
}

export default function SpecialBlockBadge({
  isGem = false,
  isItem = false,
  itemType,
  size,
}: SpecialBlockBadgeProps) {
  if (!isGem && !isItem) {
    return null;
  }

  const badgeSize = Math.max(12, Math.round(size * 0.56));
  const fontSize = Math.max(8, Math.round(badgeSize * 0.52));
  const colors = getBadgeColors(isGem, itemType);
  const icon = getBadgeIcon(isGem, itemType);
  const inset = Math.max(0, Math.round((size - badgeSize) / 2));
  const isDiamond = isGem;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.badge,
        isDiamond ? styles.badgeDiamond : null,
        {
          top: inset,
          left: inset,
          width: badgeSize,
          height: badgeSize,
          borderRadius: isDiamond ? 4 : Math.round(badgeSize / 2),
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
        },
      ]}>
      <View
        style={[
          styles.iconWrap,
          isDiamond ? styles.iconWrapDiamond : null,
        ]}>
        <Text
          style={[
            styles.icon,
            {
              color: colors.iconColor,
              fontSize,
              lineHeight: fontSize + 1,
            },
          ]}>
          {icon}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#020617',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 3,
  },
  badgeDiamond: {
    transform: [{rotate: '45deg'}],
  },
  iconWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDiamond: {
    transform: [{rotate: '-45deg'}],
  },
  icon: {
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
