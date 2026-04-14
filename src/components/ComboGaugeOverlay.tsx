import React from 'react';
import {StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';

interface ComboGaugeOverlayProps {
  combo: number;
  comboRemainingMs?: number;
  comboMaxMs?: number;
  feverActive?: boolean;
  feverRemainingMs?: number;
  feverMaxMs?: number;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  visualAutomationLabel?: string;
}

function toPercent(remainingMs: number, maxMs: number): `${number}%` {
  if (maxMs <= 0) {
    return '0%';
  }
  const ratio = Math.max(0, Math.min(1, remainingMs / maxMs));
  return `${ratio * 100}%`;
}

export default function ComboGaugeOverlay({
  combo,
  comboRemainingMs = 0,
  comboMaxMs = 0,
  feverActive = false,
  feverRemainingMs = 0,
  feverMaxMs = 0,
  style,
  compact = false,
  visualAutomationLabel,
}: ComboGaugeOverlayProps) {
  const showComboGauge = combo > 0 && comboRemainingMs > 0;
  const showFeverGauge = feverActive && feverRemainingMs > 0;

  if (!showComboGauge && !showFeverGauge) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      collapsable={false}
      style={[styles.overlay, compact && styles.overlayCompact, style]}>
      {visualAutomationLabel ? (
        <View
          pointerEvents="none"
          accessible
          accessibilityLabel={visualAutomationLabel}
          collapsable={false}
          style={styles.automationTag}
        />
      ) : null}
      {showComboGauge ? (
        <View style={[styles.card, compact && styles.cardCompact]}>
          <View style={styles.header}>
            <Text style={[styles.label, compact && styles.labelCompact]}>{`${combo}콤보`}</Text>
            <Text style={[styles.value, compact && styles.valueCompact]}>
              {`${Math.max(0, comboRemainingMs / 1000).toFixed(1)}초`}
            </Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                styles.comboFill,
                {width: toPercent(comboRemainingMs, Math.max(1, comboMaxMs))},
              ]}
            />
          </View>
        </View>
      ) : null}

      {showFeverGauge ? (
        <View style={[styles.card, compact && styles.cardCompact]}>
          <View style={styles.header}>
            <Text style={[styles.label, compact && styles.labelCompact]}>피버</Text>
            <Text style={[styles.value, compact && styles.valueCompact]}>
              {`${Math.max(0, feverRemainingMs / 1000).toFixed(1)}초`}
            </Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                styles.feverFill,
                {width: toPercent(feverRemainingMs, Math.max(1, feverMaxMs))},
              ]}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    width: '48%',
    minWidth: 136,
    maxWidth: 196,
    gap: 4,
    zIndex: 14,
  },
  overlayCompact: {
    top: 6,
    width: '46%',
    minWidth: 120,
    maxWidth: 172,
    gap: 3,
  },
  card: {
    backgroundColor: 'rgba(9, 12, 28, 0.52)',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.14)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 3,
  },
  cardCompact: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  label: {
    color: '#f8fafc',
    fontSize: 9,
    fontWeight: '900',
  },
  labelCompact: {
    fontSize: 8,
  },
  value: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '800',
  },
  valueCompact: {
    fontSize: 8,
  },
  track: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  automationTag: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.01,
  },
  comboFill: {
    backgroundColor: '#fbbf24',
  },
  feverFill: {
    backgroundColor: '#f97316',
  },
});
