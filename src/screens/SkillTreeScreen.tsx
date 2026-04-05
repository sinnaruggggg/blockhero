import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BackImageButton from '../components/BackImageButton';
import {
  getCharacterClass,
  isSkillUnlocked,
  canAllocateSkill,
  xpToNextLevel,
} from '../constants/characters';
import {
  loadCharacterData,
  allocateSkillPoint,
  CharacterData,
} from '../stores/gameStore';

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
            '현재 사용할 수 있는 스킬 포인트가 없습니다.\n레벨업 시 2포인트를 획득합니다.',
          );
        } else if (!isSkillUnlocked(skillIndex, allocations)) {
          Alert.alert(
            '해금 조건 필요',
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
        } ${skillIndex + 1}번 스킬에\n포인트를 투자합니다.\n\n남은 포인트: ${
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

  if (!characterClass || !charData) {
    return null;
  }

  const skills =
    activeTab === 'personal'
      ? characterClass.personalSkills
      : characterClass.partySkills;
  const allocations =
    activeTab === 'personal'
      ? charData.personalAllocations
      : charData.partyAllocations;

  const xpRequired = xpToNextLevel(charData.level);
  const xpProgress = charData.xp / xpRequired;
  const currentAttack =
    characterClass.baseAtk + characterClass.atkPerLevel * (charData.level - 1);
  const currentHp =
    characterClass.baseHp + characterClass.hpPerLevel * (charData.level - 1);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackImageButton onPress={() => navigation.goBack()} size={42} />
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {characterClass.emoji} {characterClass.name} 스킬트리
        </Text>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>포인트 {charData.skillPoints}</Text>
        </View>
      </View>

      <View style={styles.charInfo}>
        <View style={styles.charInfoLeft}>
          <Text style={styles.charLevelText}>레벨 {charData.level}</Text>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, {width: `${xpProgress * 100}%`}]} />
          </View>
          <Text style={styles.xpText}>
            경험치 {charData.xp.toLocaleString()} / {xpRequired.toLocaleString()}
          </Text>
        </View>
        <View style={styles.charInfoRight}>
          <Text style={styles.charStatSmall}>현재 공격력 {currentAttack}</Text>
          <Text style={styles.charStatSmall}>현재 체력 {currentHp}</Text>
          <Text style={styles.charStatSmall}>남은 스킬 포인트 {charData.skillPoints}</Text>
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

      <ScrollView contentContainerStyle={styles.skillList}>
        {skills.map((skill, index) => {
          const points = allocations[index] ?? 0;
          const unlocked = isSkillUnlocked(index, allocations);
          const canAllocatePoint = canAllocateSkill(index, allocations, charData.skillPoints);
          const maxed = points >= 5;

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
                style={[
                  styles.skillCard,
                  !unlocked && styles.skillCardLocked,
                  maxed && styles.skillCardMaxed,
                ]}
                onPress={() => handleAllocate(activeTab, index)}
                activeOpacity={0.8}>
                <View style={styles.skillCardTop}>
                  <View style={styles.skillNumberBadge}>
                    <Text style={styles.skillNumber}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.skillName, !unlocked && styles.skillNameLocked]}>
                    {unlocked ? skill.name : `잠금 ${skill.name}`}
                  </Text>
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
                <Text style={[styles.skillDesc, !unlocked && styles.skillDescLocked]}>
                  {unlocked ? skill.desc : '이전 스킬을 5레벨까지 올려야 해금됩니다.'}
                </Text>
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
            스킬 포인트는 레벨업할 때마다 2개씩 획득합니다.
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
  backBtn: {color: 'transparent', fontSize: 1, lineHeight: 1, opacity: 0},
  title: {flex: 1, color: '#e2e8f0', fontSize: 16, fontWeight: '800'},
  pointsBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pointsText: {color: '#0a0a1e', fontSize: 14, fontWeight: '900'},
  charInfo: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 14,
    marginBottom: 12,
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    padding: 12,
  },
  charInfoLeft: {flex: 1, gap: 4},
  charLevelText: {color: '#f59e0b', fontSize: 22, fontWeight: '900'},
  xpBarBg: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {height: 6, backgroundColor: '#6366f1', borderRadius: 3},
  xpText: {color: '#94a3b8', fontSize: 11},
  charInfoRight: {gap: 4, justifyContent: 'center'},
  charStatSmall: {color: '#c4b5fd', fontSize: 12},
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginBottom: 12,
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
    opacity: 0.65,
  },
  skillCardMaxed: {borderColor: '#f59e0b'},
  skillCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  skillNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillNumber: {color: '#fff', fontSize: 12, fontWeight: '900'},
  skillName: {flex: 1, color: '#e2e8f0', fontSize: 14, fontWeight: '800'},
  skillNameLocked: {color: '#6b7280'},
  skillPointsArea: {flexDirection: 'row', gap: 3},
  pointDot: {width: 10, height: 10, borderRadius: 5},
  pointDotFilled: {backgroundColor: '#f59e0b'},
  pointDotEmpty: {backgroundColor: '#334155'},
  skillDesc: {color: '#94a3b8', fontSize: 12, lineHeight: 18},
  skillDescLocked: {color: '#4b5563'},
  allocateHint: {
    marginTop: 8,
    backgroundColor: '#312e81',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  allocateHintText: {color: '#a78bfa', fontSize: 11, fontWeight: '700'},
  maxedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#f59e0b',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  maxedText: {color: '#0a0a1e', fontSize: 10, fontWeight: '900'},
  footer: {marginTop: 20, gap: 6},
  footerText: {color: '#4b5563', fontSize: 12, textAlign: 'center'},
});
