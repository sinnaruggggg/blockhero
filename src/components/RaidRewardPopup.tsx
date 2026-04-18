import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {t} from '../i18n';
import {RewardResult} from '../constants/raidRewards';
import {getItemDefinition} from '../constants/itemCatalog';

interface RaidRewardPopupProps {
  reward: RewardResult;
  bossName: string;
  onCollect: () => void;
}

function getRewardItemMeta(key: string) {
  const item = getItemDefinition(key);
  if (item) {
    return {
      emoji: item.emoji,
      label: item.label,
    };
  }

  if (key === 'addTurns') {
    return {
      emoji: '➕',
      label: t('item.addTurns'),
    };
  }

  return {
    emoji: '🎁',
    label: t(`item.${key}`),
  };
}

export default function RaidRewardPopup({
  reward,
  bossName,
  onCollect,
}: RaidRewardPopupProps) {
  const rankLabel = reward.rank === 1 ? 'MVP!' : `#${reward.rank}`;
  const multLabel =
    reward.rankMultiplier > 1 ? ` (x${reward.rankMultiplier})` : '';

  return (
    <View style={styles.overlay}>
      <View style={styles.popup}>
        <Text style={styles.title}>{t('raid.defeated')}</Text>
        <Text style={styles.bossName}>{bossName}</Text>

        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>
            {rankLabel}
            {multLabel}
          </Text>
        </View>

        <View style={styles.rewardList}>
          {reward.gold > 0 && (
            <View style={styles.rewardRow}>
              <Text style={styles.rewardEmoji}>🪙</Text>
              <Text style={styles.rewardValue}>+{reward.gold}</Text>
            </View>
          )}
          {reward.diamonds > 0 && (
            <View style={styles.rewardRow}>
              <Text style={styles.rewardEmoji}>💎</Text>
              <Text style={styles.rewardValue}>+{reward.diamonds}</Text>
            </View>
          )}
          {Object.entries(reward.items).map(([key, count]) => {
            const meta = getRewardItemMeta(key);
            return (
              <View key={key} style={styles.rewardRow}>
                <Text style={styles.rewardEmoji}>{meta.emoji}</Text>
                <Text style={styles.rewardValue}>
                  {meta.label} x{count}
                </Text>
              </View>
            );
          })}
        </View>

        {reward.skinUnlocked !== null && (
          <View style={styles.skinUnlock}>
            <Text style={styles.skinUnlockText}>{t('reward.skinUnlocked')}</Text>
          </View>
        )}

        {reward.titlesUnlocked.length > 0 && (
          <View style={styles.titleUnlock}>
            {reward.titlesUnlocked.map(titleId => (
              <Text key={titleId} style={styles.titleUnlockText}>
                {t('reward.titleUnlocked')}: {t(`title.${titleId}`)}
              </Text>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.collectBtn} onPress={onCollect}>
          <Text style={styles.collectBtnText}>{t('reward.collect')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popup: {
    backgroundColor: '#1e1b4b',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  title: {
    color: '#fbbf24',
    fontSize: 24,
    fontWeight: '900',
  },
  bossName: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  rankBadge: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 12,
  },
  rankText: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: '900',
  },
  rewardList: {
    marginTop: 16,
    width: '100%',
    gap: 8,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rewardEmoji: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  rewardValue: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
  },
  skinUnlock: {
    marginTop: 12,
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skinUnlockText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '800',
  },
  titleUnlock: {
    marginTop: 8,
    gap: 4,
  },
  titleUnlockText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  collectBtn: {
    marginTop: 20,
    backgroundColor: '#fbbf24',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
  },
  collectBtnText: {
    color: '#1e1b4b',
    fontSize: 18,
    fontWeight: '900',
  },
});
