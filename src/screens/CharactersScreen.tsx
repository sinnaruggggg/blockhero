import React, {useMemo, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import BackImageButton from '../components/BackImageButton';
import {useBlockHeroRuntime} from '../blockhero/BlockHeroRuntimeProvider';
import {INFINITE_HEARTS_ENABLED, INFINITE_HEARTS_LABEL} from '../constants';
import {
  getCurrentCharacterDefinition,
  getCurrentCharacterStats,
  getCurrentClearCount,
  getCurrentSkillTree,
  getEquippedSkin,
  getEquippedSummonProgress,
} from '../../blockhero_state';
import {canUnlockOrUpgradeSkill} from '../../combat_rules';
import {NORMAL_RAID_BOSSES, SKIN_DEFINITIONS} from '../../game_catalog';
import type {SkillDefinition} from '../types/gameDesign';

const CLASS_IDS = ['knight', 'mage', 'archer', 'rogue', 'healer'] as const;
const CLASS_NAMES: Record<(typeof CLASS_IDS)[number], string> = {
  knight: '기사',
  mage: '마법사',
  archer: '궁수',
  rogue: '도적',
  healer: '힐러',
};

export default function CharactersScreen({navigation}: any) {
  const {state, dispatch} = useBlockHeroRuntime();
  const [tab, setTab] = useState<'personal' | 'party'>('personal');
  const currentCharacter = state.player.characters[state.player.selectedClassId];
  const definition = getCurrentCharacterDefinition(state);
  const stats = getCurrentCharacterStats(state, 'level');
  const skillTree = getCurrentSkillTree(state);
  const equippedSkin = getEquippedSkin(state);
  const summon = getEquippedSummonProgress(state);

  const visibleSkills = useMemo(
    () => (tab === 'personal' ? skillTree.personal : skillTree.party),
    [skillTree, tab],
  );

  const renderSkillCard = (skill: SkillDefinition) => {
    const currentLevel =
      currentCharacter.skills.find(entry => entry.skillId === skill.id)?.level ?? 0;
    const canUpgrade =
      currentCharacter.skillPoints > 0 &&
      canUnlockOrUpgradeSkill(skill.id, currentCharacter.skills);

    return (
      <View key={skill.id} style={styles.skillCard}>
        <View style={styles.skillTop}>
          <View style={{flex: 1}}>
            <Text style={styles.skillName}>
              {skill.treeNodeIndex}. {skill.name}
            </Text>
            <Text style={styles.skillDesc}>{skill.shortDescription}</Text>
          </View>
          <View style={styles.skillLevelBadge}>
            <Text style={styles.skillLevelText}>{currentLevel}/5</Text>
          </View>
        </View>
        <Text style={styles.skillMeta}>
          {skill.prerequisiteSkillId
            ? `선행 스킬 5레벨 필요 / ${skill.complexity}`
            : `첫 노드 / ${skill.complexity}`}
        </Text>
        <TouchableOpacity
          disabled={!canUpgrade}
          onPress={() => dispatch({type: 'upgrade_skill', skillId: skill.id})}
          style={[styles.upgradeBtn, !canUpgrade && styles.upgradeBtnDisabled]}>
          <Text style={styles.upgradeBtnText}>
            {canUpgrade ? '스킬 포인트 사용' : '조건 미달 또는 포인트 부족'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackImageButton onPress={() => navigation.goBack()} size={42} />
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>캐릭터</Text>
        <Text style={styles.skillPoints}>포인트 {currentCharacter.skillPoints}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.classRow}>
          {CLASS_IDS.map(classId => {
            const entry = state.player.characters[classId];
            return (
              <TouchableOpacity
                key={classId}
                onPress={() => dispatch({type: 'select_class', classId})}
                style={[
                  styles.classChip,
                  state.player.selectedClassId === classId && styles.classChipActive,
                ]}>
                <Text style={styles.classChipTitle}>{CLASS_NAMES[classId]}</Text>
                <Text style={styles.classChipMeta}>레벨 {entry.level}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.summaryCard}>
          <Text style={styles.characterName}>{definition.name}</Text>
          <Text style={styles.characterRole}>{definition.role}</Text>
          <Text style={styles.summaryText}>
            공격력 {stats.attack} / 체력 {stats.maxHp} / 하트{' '}
            {INFINITE_HEARTS_ENABLED ? INFINITE_HEARTS_LABEL : stats.maxHearts} / 하트 회복{' '}
            {INFINITE_HEARTS_ENABLED
              ? '없음'
              : `${Math.floor(stats.heartRegenMs / 60000)}분`}
          </Text>
          <Text style={styles.summaryText}>
            장착 스킨 {equippedSkin ? equippedSkin.id : '없음'}
            {summon ? ` / 소환수 레벨 ${summon.level}` : ''}
          </Text>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            onPress={() => setTab('personal')}
            style={[styles.tabBtn, tab === 'personal' && styles.tabBtnActive]}>
            <Text style={styles.tabText}>개인 패시브</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('party')}
            style={[styles.tabBtn, tab === 'party' && styles.tabBtnActive]}>
            <Text style={styles.tabText}>파티/레이드 버프</Text>
          </TouchableOpacity>
        </View>

        {visibleSkills.map(renderSkillCard)}

        <View style={styles.skinSection}>
          <Text style={styles.sectionTitle}>레이드 스킨</Text>
          {SKIN_DEFINITIONS.map(skin => {
            const sourceRaid = NORMAL_RAID_BOSSES.find(boss => boss.skinId === skin.id);
            const clearCount = sourceRaid ? getCurrentClearCount(state, sourceRaid.stage) : 0;
            const unlocked = state.player.unlockedSkinIds.includes(skin.id);
            const equipped = state.player.equippedSkinId === skin.id;

            return (
              <View key={skin.id} style={styles.skinCard}>
                <View style={{flex: 1}}>
                  <Text style={styles.skinName}>{skin.id}</Text>
                  <Text style={styles.skinMeta}>
                    공격력 +{Math.round(skin.attackBonusRate * 100)}% / 일반 레이드{' '}
                    {sourceRaid?.stage}단계 10회 클리어 해금
                  </Text>
                  <Text style={styles.skinMeta}>현재 클리어 {clearCount}/10</Text>
                </View>
                <TouchableOpacity
                  disabled={!unlocked}
                  onPress={() =>
                    dispatch({
                      type: 'equip_skin',
                      skinId: equipped ? null : skin.id,
                    })
                  }
                  style={[styles.skinBtn, !unlocked && styles.skinBtnDisabled]}>
                  <Text style={styles.skinBtnText}>
                    {!unlocked ? '잠김' : equipped ? '해제' : '장착'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {color: 'transparent', fontSize: 1, lineHeight: 1, opacity: 0},
  title: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '800',
  },
  skillPoints: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '800',
  },
  scroll: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  classRow: {
    gap: 10,
    paddingBottom: 4,
  },
  classChip: {
    backgroundColor: '#1e1b4b',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#312e81',
  },
  classChipActive: {
    backgroundColor: '#4338ca',
    borderColor: '#818cf8',
  },
  classChipTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  classChipMeta: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#312e81',
  },
  characterName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  characterRole: {
    color: '#a5b4fc',
    fontSize: 13,
    marginTop: 4,
  },
  summaryText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: '#1e1b4b',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#312e81',
  },
  tabBtnActive: {
    backgroundColor: '#6366f1',
  },
  tabText: {
    color: '#fff',
    fontWeight: '800',
  },
  skillCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#312e81',
  },
  skillTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  skillName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  skillDesc: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 4,
  },
  skillLevelBadge: {
    backgroundColor: '#4338ca',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  skillLevelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  skillMeta: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 8,
  },
  upgradeBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  upgradeBtnDisabled: {
    opacity: 0.45,
  },
  upgradeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  skinSection: {
    marginTop: 8,
    gap: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  skinCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#312e81',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  skinName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  skinMeta: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
  skinBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  skinBtnDisabled: {
    opacity: 0.45,
  },
  skinBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
});
