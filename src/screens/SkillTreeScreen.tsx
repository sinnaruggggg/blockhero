import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BackImageButton from '../components/BackImageButton';
import {
  canAllocateSkill,
  getCharacterAtk,
  getCharacterClass,
  getCharacterHp,
  isSkillUnlocked,
  xpToNextLevel,
} from '../constants/characters';
import {
  allocateSkillPoint,
  loadCharacterData,
  type CharacterData,
} from '../stores/gameStore';
import {getSkillEffectDetail} from '../game/skillEffectDetails';

export default function SkillTreeScreen({route, navigation}: any) {
  const {characterId} = route.params;
  const characterClass = getCharacterClass(characterId);

  const [charData, setCharData] = useState<CharacterData | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'party'>('personal');

  useEffect(() => {
    loadCharacterData(characterId).then(setCharData);
  }, [characterId]);

  const handleAllocate = useCallback(
    async (category: 'personal' | 'party', skillIndex: number) => {
      if (!charData) {
        return;
      }

      const allocations =
        category === 'personal'
          ? charData.personalAllocations
          : charData.partyAllocations;

      if (!canAllocateSkill(skillIndex, allocations, charData.skillPoints)) {
        if (charData.skillPoints <= 0) {
          Alert.alert(
            '스킬 포인트 부족',
            '현재 사용할 수 있는 스킬 포인트가 없습니다.\n레벨업마다 2포인트를 획득합니다.',
          );
        } else if (!isSkillUnlocked(skillIndex, allocations)) {
          Alert.alert(
            '잠금 조건 필요',
            '이전 스킬을 5레벨까지 올려야 다음 스킬이 해금됩니다.',
          );
        } else {
          Alert.alert('알림', '이 스킬은 이미 최대 레벨입니다.');
        }
        return;
      }

      Alert.alert(
        '스킬 투자',
        `${
          category === 'personal' ? '개인 패시브' : '파티/레이드 버프'
        } ${skillIndex + 1}번 스킬에 포인트를 투자합니다.\n\n남은 포인트: ${
          charData.skillPoints - 1
        }`,
        [
          {text: '취소', style: 'cancel'},
          {
            text: '확인',
            onPress: async () => {
              const updated = await allocateSkillPoint(charData, category, skillIndex);
              if (updated) {
                setCharData(updated);
              }
            },
          },
        ],
      );
    },
    [charData],
  );

  const skills = useMemo(
    () =>
      activeTab === 'personal'
        ? characterClass?.personalSkills ?? []
        : characterClass?.partySkills ?? [],
    [activeTab, characterClass],
  );

  if (!characterClass || !charData) {
    return null;
  }

  const allocations =
    activeTab === 'personal'
      ? charData.personalAllocations
      : charData.partyAllocations;
  const xpRequired = xpToNextLevel(charData.level);
  const xpProgress = Math.max(0, Math.min(1, charData.xp / xpRequired));
  const currentAttack = getCharacterAtk(characterId, charData.level);
  const currentHp = getCharacterHp(characterId, charData.level);
  const detailContextNote =
    skills.length > 0
      ? getSkillEffectDetail(characterId, charData, activeTab, 0).contextNote
      : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.backSlot}>
          <BackImageButton onPress={() => navigation.goBack()} size={42} />
        </View>
        <Text style={styles.title}>
          {characterClass.emoji} {characterClass.name} 스킬 트리
        </Text>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>포인트 {charData.skillPoints}</Text>
        </View>
      </View>

      <View style={styles.characterPanel}>
        <View style={styles.characterSummary}>
          <Text style={styles.characterLevel}>레벨 {charData.level}</Text>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, {width: `${xpProgress * 100}%`}]} />
          </View>
          <Text style={styles.xpText}>
            경험치 {charData.xp.toLocaleString()} / {xpRequired.toLocaleString()}
          </Text>
        </View>
        <View style={styles.characterStats}>
          <Text style={styles.characterStat}>현재 공격력 {currentAttack}</Text>
          <Text style={styles.characterStat}>현재 체력 {currentHp}</Text>
          <Text style={styles.characterStat}>남은 포인트 {charData.skillPoints}</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'personal' && styles.tabActive]}
          onPress={() => setActiveTab('personal')}>
          <Text style={[styles.tabText, activeTab === 'personal' && styles.tabTextActive]}>
            개인 패시브
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'party' && styles.tabActive]}
          onPress={() => setActiveTab('party')}>
          <Text style={[styles.tabText, activeTab === 'party' && styles.tabTextActive]}>
            파티/레이드 버프
          </Text>
        </TouchableOpacity>
      </View>

      {detailContextNote && (
        <View style={styles.contextHint}>
          <Text style={styles.contextHintText}>{detailContextNote}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.skillList}>
        {skills.map((skill, index) => {
          const points = allocations[index] ?? 0;
          const unlocked = isSkillUnlocked(index, allocations);
          const canAllocatePoint = canAllocateSkill(index, allocations, charData.skillPoints);
          const maxed = points >= 5;
          const detail = getSkillEffectDetail(characterId, charData, activeTab, index);
          const currentLines =
            points > 0 && detail.currentLines.length > 0
              ? detail.currentLines
              : ['현재 적용 효과 없음'];
          const nextLines = unlocked
            ? maxed
              ? ['최대 레벨']
              : detail.nextLines.length > 0
              ? detail.nextLines
              : ['다음 레벨에서 수치 변화 없음']
            : [];

          return (
            <View key={skill.id} style={styles.skillRow}>
              {index > 0 && (
                <View
                  style={[
                    styles.chainLine,
                    unlocked ? styles.chainLineActive : styles.chainLineLocked,
                  ]}
                />
              )}

              <TouchableOpacity
                activeOpacity={0.86}
                style={[
                  styles.skillCard,
                  !unlocked && styles.skillCardLocked,
                  maxed && styles.skillCardMaxed,
                ]}
                onPress={() => handleAllocate(activeTab, index)}>
                <View style={styles.skillCardTop}>
                  <View style={styles.skillNumberBadge}>
                    <Text style={styles.skillNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.skillCopy}>
                    <Text style={[styles.skillName, !unlocked && styles.skillNameLocked]}>
                      {skill.name}
                    </Text>
                    <Text style={[styles.skillDesc, !unlocked && styles.skillDescLocked]}>
                      {unlocked
                        ? skill.desc
                        : '이전 스킬을 5레벨까지 올려야 해금됩니다.'}
                    </Text>
                  </View>
                </View>

                <View style={styles.skillMetaRow}>
                  <Text style={styles.skillMetaText}>현재 레벨 {points}/5</Text>
                  <View style={styles.skillPointsArea}>
                    {Array.from({length: 5}).map((_, pointIndex) => (
                      <View
                        key={pointIndex}
                        style={[
                          styles.pointDot,
                          pointIndex < points
                            ? styles.pointDotFilled
                            : styles.pointDotEmpty,
                        ]}
                      />
                    ))}
                  </View>
                </View>

                <View style={styles.effectBlock}>
                  <Text style={styles.effectTitle}>현재 효과</Text>
                  {currentLines.map(line => (
                    <Text key={`current-${skill.id}-${line}`} style={styles.effectLine}>
                      • {line}
                    </Text>
                  ))}
                </View>

                {unlocked && (
                  <View style={[styles.effectBlock, styles.effectBlockNext]}>
                    <Text style={styles.effectTitle}>다음 레벨 효과</Text>
                    {nextLines.map(line => (
                      <Text key={`next-${skill.id}-${line}`} style={styles.effectLineNext}>
                        • {line}
                      </Text>
                    ))}
                  </View>
                )}

                {canAllocatePoint && (
                  <View style={styles.allocateHint}>
                    <Text style={styles.allocateHintText}>+1 포인트 투자 가능</Text>
                  </View>
                )}
                {maxed && (
                  <View style={styles.maxedBadge}>
                    <Text style={styles.maxedText}>최대</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            스킬 포인트는 레벨업마다 2개씩 획득합니다.
          </Text>
          <Text style={styles.footerText}>
            이전 스킬을 5레벨까지 올려야 다음 스킬이 해금됩니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0a0a1e'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  backSlot: {width: 52},
  title: {flex: 1, color: '#e2e8f0', fontSize: 16, fontWeight: '800'},
  pointsBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pointsText: {color: '#0a0a1e', fontSize: 14, fontWeight: '900'},
  characterPanel: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 14,
    marginBottom: 12,
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    padding: 12,
  },
  characterSummary: {flex: 1, gap: 4},
  characterLevel: {color: '#f59e0b', fontSize: 22, fontWeight: '900'},
  xpBarBg: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {height: 6, backgroundColor: '#6366f1', borderRadius: 3},
  xpText: {color: '#94a3b8', fontSize: 11},
  characterStats: {gap: 4, justifyContent: 'center'},
  characterStat: {color: '#c4b5fd', fontSize: 12},
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: '#1e1b4b',
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabActive: {backgroundColor: '#6366f1'},
  tabText: {color: '#94a3b8', fontSize: 13, fontWeight: '700'},
  tabTextActive: {color: '#fff'},
  contextHint: {
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contextHintText: {color: '#bfdbfe', fontSize: 11, lineHeight: 17},
  skillList: {paddingHorizontal: 14, paddingBottom: 30},
  skillRow: {position: 'relative', marginBottom: 4},
  chainLine: {position: 'absolute', left: 20, top: -12, width: 2, height: 12},
  chainLineActive: {backgroundColor: '#6366f1'},
  chainLineLocked: {backgroundColor: '#334155'},
  skillCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#312e81',
    marginBottom: 8,
  },
  skillCardLocked: {
    borderColor: '#1f2937',
    backgroundColor: '#111827',
    opacity: 0.7,
  },
  skillCardMaxed: {borderColor: '#f59e0b'},
  skillCardTop: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  skillCopy: {flex: 1, gap: 4},
  skillNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  skillNumber: {color: '#fff', fontSize: 12, fontWeight: '900'},
  skillName: {color: '#e2e8f0', fontSize: 14, fontWeight: '800'},
  skillNameLocked: {color: '#9ca3af'},
  skillDesc: {color: '#94a3b8', fontSize: 12, lineHeight: 18},
  skillDescLocked: {color: '#6b7280'},
  skillMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  skillMetaText: {color: '#cbd5f5', fontSize: 12, fontWeight: '700'},
  skillPointsArea: {flexDirection: 'row', gap: 4},
  pointDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  pointDotFilled: {backgroundColor: '#f59e0b'},
  pointDotEmpty: {backgroundColor: '#334155'},
  effectBlock: {
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.42)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    marginBottom: 8,
  },
  effectBlockNext: {
    backgroundColor: 'rgba(37,99,235,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.16)',
  },
  effectTitle: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  effectLine: {
    color: '#dbeafe',
    fontSize: 12,
    lineHeight: 18,
  },
  effectLineNext: {
    color: '#bfdbfe',
    fontSize: 12,
    lineHeight: 18,
  },
  allocateHint: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16,185,129,0.14)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  allocateHintText: {color: '#6ee7b7', fontSize: 11, fontWeight: '800'},
  maxedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#f59e0b',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  maxedText: {color: '#0a0a1e', fontSize: 11, fontWeight: '900'},
  footer: {
    marginTop: 6,
    paddingBottom: 24,
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 18,
    marginBottom: 2,
  },
});
