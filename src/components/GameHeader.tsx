import React from 'react';
import {View, StyleSheet, Text} from 'react-native';
import BackImageButton from './BackImageButton';
import {t} from '../i18n';
import {formatComboMultiplier} from '../data/gameBalance';

interface GameHeaderProps {
  score: number;
  combo: number;
  linesCleared: number;
  turnsLeft?: number | null;
  level?: string;
  goalText?: string;
  onBack?: () => void;
  feverActive?: boolean;
  feverGauge?: number;
}

export default function GameHeader({
  score,
  combo,
  linesCleared,
  turnsLeft,
  level,
  goalText,
  onBack,
  feverActive,
  feverGauge,
}: GameHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {onBack && (
          <BackImageButton onPress={onBack} size={40} style={styles.backBtn} />
        )}
        {level && <Text style={styles.levelText}>{level}</Text>}
      </View>

      {goalText && <Text style={styles.goalText}>{goalText}</Text>}

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{t('game.score')}</Text>
          <Text style={styles.statValue}>{score.toLocaleString()}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{t('game.combo')}</Text>
          <Text style={[styles.statValue, combo > 0 && styles.comboActive]}>
            {combo > 0 ? `${combo}콤보` : '-'}
          </Text>
          {combo > 0 && <Text style={styles.comboMeta}>{formatComboMultiplier(combo)}</Text>}
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{t('game.lines')}</Text>
          <Text style={styles.statValue}>{linesCleared}</Text>
        </View>
        {turnsLeft !== undefined && turnsLeft !== null && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{t('game.turns')}</Text>
            <Text style={[styles.statValue, turnsLeft <= 3 && styles.lowTurns]}>
              {turnsLeft}
            </Text>
          </View>
        )}
      </View>

      {feverGauge !== undefined && (
        <View style={styles.feverContainer}>
          <Text style={[styles.feverLabel, feverActive && styles.feverActiveText]}>
            {feverActive ? t('game.feverActive') : t('game.fever')}
          </Text>
          <View style={styles.feverBar}>
            <View
              style={[
                styles.feverFill,
                {width: `${Math.min(100, feverGauge)}%`},
                feverActive && styles.feverActiveFill,
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backBtn: {
    marginRight: 8,
  },
  levelText: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '700',
  },
  goalText: {
    color: '#e2e8f0',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(30, 27, 75, 0.6)',
    borderRadius: 10,
    padding: 8,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
  statValue: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '800',
  },
  comboActive: {
    color: '#fbbf24',
  },
  comboMeta: {
    color: '#fde68a',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },
  lowTurns: {
    color: '#ef4444',
  },
  feverContainer: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feverLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    width: 70,
  },
  feverActiveText: {
    color: '#f97316',
  },
  feverBar: {
    flex: 1,
    height: 10,
    backgroundColor: '#1e1b4b',
    borderRadius: 5,
    overflow: 'hidden',
  },
  feverFill: {
    height: '100%',
    backgroundColor: '#f97316',
    borderRadius: 5,
  },
  feverActiveFill: {
    backgroundColor: '#ef4444',
  },
});
