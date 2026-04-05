import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {RAID_SKILLS} from '../constants';
import {
  formatRaidSkillMultiplier,
  getRaidSkillEffectiveMultiplier,
  getRaidSkillThreshold,
} from '../game/raidSkillRuntime';

const RAID_SKILL_NAMES: Record<number, string> = {
  1: '기본',
  3: '강타',
  7: '진동',
  12: '번개',
  20: '폭발',
  50: '멸망',
};

interface SkillBarProps {
  currentGauge: number;
  charges: Record<number, number>;
  activeMultiplier: number;
  skillLevels?: Record<number, number>;
  onSelectSkill: (multiplier: number) => void;
  disabled: boolean;
}

export default function SkillBar({
  currentGauge,
  charges,
  activeMultiplier,
  skillLevels = {},
  onSelectSkill,
  disabled,
}: SkillBarProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>스킬</Text>
      <View style={styles.skillRow}>
        {RAID_SKILLS.map(skill => {
          const isBasic = skill.multiplier === 1;
          const level = skillLevels[skill.multiplier] ?? 0;
          const effectiveThreshold = getRaidSkillThreshold(skill.gaugeThreshold, level);
          const effectiveMultiplier = getRaidSkillEffectiveMultiplier(
            skill.multiplier,
            level,
          );
          const chargeCount = isBasic ? Infinity : charges[skill.multiplier] || 0;
          const isUnlocked = isBasic || chargeCount > 0;
          const isActive = activeMultiplier === skill.multiplier;

          let gaugeProgress = 0;
          if (!isBasic && chargeCount === 0) {
            const progress = currentGauge % effectiveThreshold;
            gaugeProgress = progress / effectiveThreshold;
          }

          return (
            <TouchableOpacity
              key={skill.multiplier}
              style={[
                styles.skillBtn,
                isActive && styles.skillActive,
                !isUnlocked && styles.skillLocked,
                disabled && styles.skillDisabled,
              ]}
              onPress={() => isUnlocked && !disabled && onSelectSkill(skill.multiplier)}
              disabled={!isUnlocked || disabled}
              activeOpacity={0.7}>
              {!isBasic && !isUnlocked && (
                <View
                  style={[
                    styles.gaugeFill,
                    {width: `${gaugeProgress * 100}%`},
                  ]}
                />
              )}
              <Text
                style={[
                  styles.skillName,
                  isActive && styles.skillNameActive,
                  !isUnlocked && styles.skillNameLocked,
                ]}>
                {RAID_SKILL_NAMES[skill.multiplier] ?? skill.name}
              </Text>
              <Text
                style={[
                  styles.skillMultiplier,
                  isActive && styles.skillMultiplierActive,
                  !isUnlocked && styles.skillMultiplierLocked,
                ]}>
                {formatRaidSkillMultiplier(effectiveMultiplier)}
              </Text>
              {!isBasic && isUnlocked && (
                <Text style={styles.chargeText}>{chargeCount}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(30, 27, 75, 0.6)',
  },
  label: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '900',
    marginRight: 6,
  },
  skillRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  skillBtn: {
    flex: 1,
    backgroundColor: '#312e81',
    borderRadius: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  skillActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#fbbf24',
    borderWidth: 2,
    shadowColor: '#fbbf24',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  skillLocked: {
    backgroundColor: '#1e1b4b',
    opacity: 0.6,
  },
  skillDisabled: {
    opacity: 0.5,
  },
  gaugeFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
  },
  skillName: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '800',
  },
  skillNameActive: {
    color: '#fbbf24',
  },
  skillNameLocked: {
    color: '#64748b',
  },
  skillMultiplier: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  skillMultiplierActive: {
    color: '#fde68a',
  },
  skillMultiplierLocked: {
    color: '#475569',
  },
  chargeText: {
    color: '#fbbf24',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 1,
  },
});
