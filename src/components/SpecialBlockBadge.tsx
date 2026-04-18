import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getItemDefinition } from '../constants/itemCatalog';

type SpecialBlockBadgeProps = {
  isGem?: boolean;
  isItem?: boolean;
  itemType?: string;
  size: number;
};

function getBadgeMeta(isGem: boolean, itemType?: string) {
  if (isGem) {
    return {
      icon: '\u{1F48E}',
      backgroundColor: '#0ea5e9',
      borderColor: '#dbeafe',
      iconColor: '#ffffff',
      sizeScale: 0.88,
      diamond: true,
    };
  }

  const item = getItemDefinition(itemType);
  if (!item) {
    return {
      icon: '+',
      backgroundColor: '#334155',
      borderColor: '#e2e8f0',
      iconColor: '#ffffff',
      sizeScale: 0.9,
      diamond: false,
    };
  }

  return {
    icon: item.badgeIcon,
    backgroundColor: item.badgeBackgroundColor,
    borderColor: item.badgeBorderColor,
    iconColor: item.badgeIconColor,
    sizeScale: item.sizeScale,
    diamond: false,
  };
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

  const meta = getBadgeMeta(isGem, itemType);
  const badgeSize = Math.max(12, Math.round(size * 0.56 * meta.sizeScale));
  const fontSize = Math.max(8, Math.round(badgeSize * 0.58));
  const inset = Math.max(0, Math.round((size - badgeSize) / 2));

  return (
    <View
      pointerEvents="none"
      style={[
        styles.badge,
        meta.diamond ? styles.badgeDiamond : null,
        {
          top: inset,
          left: inset,
          width: badgeSize,
          height: badgeSize,
          borderRadius: meta.diamond ? 4 : Math.round(badgeSize / 2),
          backgroundColor: meta.backgroundColor,
          borderColor: meta.borderColor,
        },
      ]}>
      <View
        style={[
          styles.iconWrap,
          meta.diamond ? styles.iconWrapDiamond : null,
        ]}>
        <Text
          style={[
            styles.icon,
            {
              color: meta.iconColor,
              fontSize,
              lineHeight: fontSize + 1,
            },
          ]}>
          {meta.icon}
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 3,
  },
  badgeDiamond: {
    transform: [{ rotate: '45deg' }],
  },
  iconWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDiamond: {
    transform: [{ rotate: '-45deg' }],
  },
  icon: {
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
