import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  getRaidBossSprite,
  getRaidSummonSpriteSetById,
} from '../assets/monsterSprites';
import BackImageButton from '../components/BackImageButton';
import {RAID_BOSSES} from '../constants/raidBosses';
import {TITLES} from '../constants/titles';
import {
  getSummonFragmentReward,
  getSummonSkillName,
  getWorldSummonDefinitions,
  createDefaultMonsterSummonData,
  type MonsterSummonData,
  type MonsterSummonDefinition,
  type MonsterSummonSkillKey,
} from '../game/monsterSummonRuntime';
import {t} from '../i18n';
import {
  buyMonsterSummon,
  chooseMonsterSummonSkill,
  claimMonsterSummonFragmentReward,
  convertMonsterSummonToFragments,
  drawMonsterSummonReward,
  loadActiveTitle,
  loadCodexData,
  loadMonsterSummonData,
  loadNormalRaidProgress,
  loadUnlockedTitles,
  saveActiveTitle,
  selectMonsterSummon,
  type CodexData,
  type NormalRaidProgress,
} from '../stores/gameStore';

type CodexTab = 'draw' | 'fragments';

export default function BossCodexScreen({navigation}: any) {
  const [codex, setCodex] = useState<CodexData>({});
  const [titles, setTitles] = useState<string[]>([]);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [normalRaidProgress, setNormalRaidProgress] =
    useState<NormalRaidProgress>({});
  const [summonData, setSummonData] = useState<MonsterSummonData>(() =>
    createDefaultMonsterSummonData(),
  );
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<CodexTab>('draw');
  const [rouletteIndex, setRouletteIndex] = useState(0);
  const [rouletteResult, setRouletteResult] =
    useState<MonsterSummonDefinition | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const loadData = useCallback(async () => {
    const [
      nextCodex,
      nextTitles,
      nextActiveTitle,
      nextRaidProgress,
      nextSummonData,
    ] = await Promise.all([
      loadCodexData(),
      loadUnlockedTitles(),
      loadActiveTitle(),
      loadNormalRaidProgress(),
      loadMonsterSummonData(),
    ]);
    setCodex(nextCodex);
    setTitles(nextTitles);
    setActiveTitle(nextActiveTitle);
    setNormalRaidProgress(nextRaidProgress);
    setSummonData(nextSummonData);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [loadData, navigation]);

  const defeatedCount = Object.keys(codex).length;
  const selectedBoss = selectedStage
    ? RAID_BOSSES.find(boss => boss.stage === selectedStage) ?? null
    : null;
  const selectedSummons = useMemo(
    () => (selectedStage ? getWorldSummonDefinitions(selectedStage) : []),
    [selectedStage],
  );
  const pendingRewardCount = selectedStage
    ? summonData.pendingRewards[selectedStage] ?? 0
    : 0;
  const selectedWorldUnlocked = selectedStage
    ? (normalRaidProgress[selectedStage]?.killCount ?? 0) >= 10
    : false;
  const currentRoulette =
    selectedSummons[rouletteIndex % Math.max(1, selectedSummons.length)] ??
    null;

  const handleSelectTitle = async (titleId: string | null) => {
    await saveActiveTitle(titleId);
    setActiveTitle(titleId);
  };

  const openSummonModal = (stage: number) => {
    setSelectedStage(stage);
    setActiveTab('draw');
    setRouletteIndex(0);
    setRouletteResult(null);
    setModalMessage('');
  };

  const refreshSummons = async () => {
    setSummonData(await loadMonsterSummonData());
  };

  const handleDraw = async () => {
    if (!selectedStage || spinning || pendingRewardCount <= 0) {
      return;
    }

    const pool = getWorldSummonDefinitions(selectedStage);
    if (pool.length === 0) {
      return;
    }

    setSpinning(true);
    setRouletteResult(null);
    setModalMessage('룰렛이 돌아가는 중입니다.');

    let ticks = 0;
    const interval = setInterval(() => {
      ticks += 1;
      setRouletteIndex(index => (index + 1) % pool.length);
      if (ticks >= 18) {
        clearInterval(interval);
      }
    }, 70);

    setTimeout(async () => {
      clearInterval(interval);
      const result = await drawMonsterSummonReward(selectedStage);
      setSummonData(result.data);
      setSpinning(false);
      if (!result.definition) {
        setModalMessage('받을 수 있는 10회 보상이 없습니다.');
        return;
      }

      const resultIndex = pool.findIndex(entry => entry.id === result.definition?.id);
      setRouletteIndex(Math.max(0, resultIndex));
      setRouletteResult(result.definition);
      setModalMessage(
        result.duplicate
          ? `${result.definition.name} 중복 획득: 레벨 +1`
          : `${result.definition.name} 획득`,
      );
    }, 1320);
  };

  const handleClaimFragments = async () => {
    if (!selectedStage || pendingRewardCount <= 0 || spinning) {
      return;
    }
    const result = await claimMonsterSummonFragmentReward(selectedStage);
    setSummonData(result.data);
    setRouletteResult(null);
    setModalMessage(
      result.error
        ? '받을 수 있는 10회 보상이 없습니다.'
        : `소환수 조각 ${result.amount}개를 받았습니다.`,
    );
  };

  const handleBuySummon = async (summonId: string) => {
    const result = await buyMonsterSummon(summonId);
    setSummonData(result.data);
    if (result.error === 'not_enough_fragments') {
      setModalMessage('소환수 조각이 부족합니다.');
      return;
    }
    if (result.error === 'boss_only_draw') {
      setModalMessage('보스 소환수는 룰렛 뽑기에서만 획득할 수 있습니다.');
      return;
    }
    if (result.definition) {
      setModalMessage(
        result.duplicate
          ? `${result.definition.name} 레벨 +1`
          : `${result.definition.name} 구매 완료`,
      );
    }
  };

  const handleConvertSummon = (summonId: string) => {
    const state = summonData.owned[summonId];
    const definition = selectedSummons.find(entry => entry.id === summonId);
    if (!state || !definition) {
      return;
    }
    const amount =
      definition.fragmentCost *
      Math.max(1, state.level) *
      Math.pow(2, Math.max(0, state.evolutionStage));
    Alert.alert(
      '조각 변환',
      `${definition.name}을 조각 ${amount}개로 변환할까요?`,
      [
        {text: '취소', style: 'cancel'},
        {
          text: '변환',
          style: 'destructive',
          onPress: async () => {
            const result = await convertMonsterSummonToFragments(summonId);
            setSummonData(result.data);
            setModalMessage(`소환수 조각 ${result.amount}개로 변환했습니다.`);
          },
        },
      ],
    );
  };

  const handleSelectSummon = async (summonId: string) => {
    const updated = await selectMonsterSummon(summonId);
    setSummonData(updated);
    const definition = selectedSummons.find(entry => entry.id === summonId);
    setModalMessage(`${definition?.name ?? '소환수'}를 전투 소환수로 선택했습니다.`);
  };

  const handleChooseSkill = async (
    summonId: string,
    skillKey: MonsterSummonSkillKey,
  ) => {
    const updated = await chooseMonsterSummonSkill(summonId, skillKey);
    setSummonData(updated);
    setModalMessage(`${getSummonSkillName(skillKey)} 스킬을 선택했습니다.`);
  };

  const formatDamage = (damage: number) => damage.toLocaleString();
  const rewardFragmentAmount = selectedStage
    ? getSummonFragmentReward(selectedStage)
    : 0;

  const renderSummonImage = (
    definition: MonsterSummonDefinition,
    size = 58,
  ) => {
    const spriteSet = getRaidSummonSpriteSetById(definition.id);
    return spriteSet ? (
      <Image
        source={spriteSet.idle}
        resizeMode="contain"
        fadeDuration={0}
        style={{width: size, height: size}}
      />
    ) : (
      <Text style={styles.summonFallback}>?</Text>
    );
  };

  const renderOwnedSummons = () => {
    const ownedEntries = selectedSummons.filter(entry => summonData.owned[entry.id]);
    if (ownedEntries.length === 0) {
      return <Text style={styles.emptyText}>아직 보유한 소환수가 없습니다.</Text>;
    }

    return ownedEntries.map(definition => {
      const owned = summonData.owned[definition.id];
      const choices = summonData.pendingSkillChoices[definition.id] ?? [];
      const selected = summonData.selectedSummonId === definition.id;
      return (
        <View key={`owned-${definition.id}`} style={styles.ownedCard}>
          {renderSummonImage(definition, 46)}
          <View style={styles.ownedInfo}>
            <Text style={styles.ownedName}>{definition.name}</Text>
            <Text style={styles.ownedMeta}>
              Lv.{owned.level} / 진화 {owned.evolutionStage} / {owned.skills.length}스킬
            </Text>
            {choices.length > 0 && (
              <View style={styles.skillChoiceRow}>
                {choices.map(skillKey => (
                  <TouchableOpacity
                    key={skillKey}
                    style={styles.skillChoiceBtn}
                    onPress={() => handleChooseSkill(definition.id, skillKey)}>
                    <Text style={styles.skillChoiceText}>
                      {getSummonSkillName(skillKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <View style={styles.ownedActions}>
            <TouchableOpacity
              style={[styles.smallActionBtn, selected && styles.smallActionBtnActive]}
              onPress={() => handleSelectSummon(definition.id)}>
              <Text style={styles.smallActionText}>{selected ? '선택됨' : '선택'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.convertBtn}
              onPress={() => handleConvertSummon(definition.id)}>
              <Text style={styles.convertBtnText}>변환</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackImageButton onPress={() => navigation.goBack()} size={42} />
        <Text style={styles.title}>{t('codex.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {width: `${(defeatedCount / 10) * 100}%`},
            ]}
          />
          <Text style={styles.progressText}>{defeatedCount} / 10</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.84}
          style={styles.skinEntry}
          onPress={() => navigation.navigate('SkinCollection')}>
          <View>
            <Text style={styles.skinEntryTitle}>스킨</Text>
            <Text style={styles.skinEntryText}>
              수집한 스킨을 도감 안에서 확인합니다.
            </Text>
          </View>
          <Text style={styles.skinEntryAction}>보기</Text>
        </TouchableOpacity>

        <View style={styles.bossGrid}>
          {RAID_BOSSES.map(boss => {
            const entry = codex[boss.stage];
            const defeated = Boolean(entry);
            const bossSprite = getRaidBossSprite(boss.stage);
            const normalKills = normalRaidProgress[boss.stage]?.killCount ?? 0;
            const pending = summonData.pendingRewards[boss.stage] ?? 0;

            return (
              <TouchableOpacity
                activeOpacity={0.86}
                key={boss.stage}
                onPress={() => openSummonModal(boss.stage)}
                style={[styles.bossCard, defeated && {borderColor: boss.color}]}>
                {defeated && bossSprite ? (
                  <Image
                    source={bossSprite}
                    resizeMode="contain"
                    fadeDuration={0}
                    style={styles.bossSprite}
                  />
                ) : (
                  <Text style={[styles.bossEmoji, !defeated && styles.bossEmojiHidden]}>
                    {defeated ? boss.emoji : '???'}
                  </Text>
                )}
                <Text style={styles.bossStage}>{boss.stage}</Text>
                <Text style={styles.bossDefeatCount}>{normalKills}회</Text>
                {pending > 0 && <Text style={styles.pendingBadge}>보상 {pending}</Text>}
                {defeated && entry && (
                  <Text style={styles.bossBestDamage}>
                    {formatDamage(entry.bestDamage)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {titles.length > 0 && (
          <View style={styles.titleSection}>
            <Text style={styles.sectionTitle}>{t('codex.titles')}</Text>
            <TouchableOpacity
              style={[styles.titleRow, !activeTitle && styles.titleActive]}
              onPress={() => handleSelectTitle(null)}>
              <Text style={styles.titleName}>{t('codex.noTitle')}</Text>
            </TouchableOpacity>

            {titles.map(titleId => {
              const titleDef = TITLES.find(entry => entry.id === titleId);
              if (!titleDef) {
                return null;
              }

              const isActive = activeTitle === titleId;
              return (
                <TouchableOpacity
                  key={titleId}
                  style={[styles.titleRow, isActive && styles.titleActive]}
                  onPress={() => handleSelectTitle(titleId)}>
                  <Text style={[styles.titleName, isActive && styles.titleNameActive]}>
                    {t(titleDef.nameKey)}
                  </Text>
                  {isActive && <Text style={styles.equippedText}>착용 중</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(selectedBoss)}
        onRequestClose={() => setSelectedStage(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>월드 {selectedStage} 소환수</Text>
                <Text style={styles.modalSub}>
                  10회 보상 {pendingRewardCount}개 / 보유 조각 {summonData.fragments}개
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  void refreshSummons();
                  setSelectedStage(null);
                }}>
                <Text style={styles.closeText}>닫기</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'draw' && styles.tabBtnActive]}
                onPress={() => setActiveTab('draw')}>
                <Text style={styles.tabText}>소환수 뽑기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  activeTab === 'fragments' && styles.tabBtnActive,
                ]}
                onPress={() => setActiveTab('fragments')}>
                <Text style={styles.tabText}>소환수 조각</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'draw' ? (
              <View style={styles.rouletteBox}>
                <Text style={styles.noticeText}>
                  보스 소환수는 룰렛 뽑기에서만 획득할 수 있습니다.
                </Text>
                <View style={styles.rouletteWindow}>
                  {currentRoulette && renderSummonImage(currentRoulette, 88)}
                  <Text style={styles.rouletteName}>
                    {rouletteResult?.name ?? currentRoulette?.name ?? '-'}
                  </Text>
                  <Text style={styles.rouletteMeta}>
                    {currentRoulette?.isBoss ? '보스 / 룰렛 전용' : currentRoulette?.rarity}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    (pendingRewardCount <= 0 || spinning) && styles.disabledBtn,
                  ]}
                  disabled={pendingRewardCount <= 0 || spinning}
                  onPress={handleDraw}>
                  <Text style={styles.primaryBtnText}>
                    {spinning ? '룰렛 진행 중' : '룰렛 돌리기'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.fragmentBox}>
                <Text style={styles.noticeText}>
                  조각을 선택하면 소환수는 받지 않고 조각만 받습니다.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    (pendingRewardCount <= 0 || spinning) && styles.disabledBtn,
                  ]}
                  disabled={pendingRewardCount <= 0 || spinning}
                  onPress={handleClaimFragments}>
                  <Text style={styles.primaryBtnText}>
                    조각 {rewardFragmentAmount}개 받기
                  </Text>
                </TouchableOpacity>
                <Text style={styles.sectionTitleSmall}>조각 구매</Text>
                <ScrollView style={styles.purchaseList}>
                  {selectedSummons.map(definition => {
                    const owned = summonData.owned[definition.id];
                    const canBuy =
                      !definition.isBoss &&
                      selectedWorldUnlocked &&
                      summonData.fragments >= definition.fragmentCost;
                    return (
                      <View key={definition.id} style={styles.purchaseRow}>
                        {renderSummonImage(definition, 42)}
                        <View style={styles.purchaseInfo}>
                          <Text style={styles.purchaseName}>{definition.name}</Text>
                          <Text style={styles.purchaseMeta}>
                            {definition.isBoss
                              ? '보스 소환수 / 룰렛 전용'
                              : !selectedWorldUnlocked
                                ? '일반 레이드 10회 클리어 후 구매 가능'
                              : `${definition.fragmentCost}조각 · ${
                                  owned ? `보유 Lv.${owned.level}` : '미보유'
                                }`}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.buyBtn,
                            (!canBuy || definition.isBoss) && styles.disabledBtn,
                          ]}
                          disabled={!canBuy || definition.isBoss}
                          onPress={() => handleBuySummon(definition.id)}>
                          <Text style={styles.buyBtnText}>
                            {definition.isBoss ? '룰렛' : '구매'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {modalMessage.length > 0 && (
              <Text style={styles.modalMessage}>{modalMessage}</Text>
            )}

            <Text style={styles.sectionTitleSmall}>보유 소환수</Text>
            <ScrollView style={styles.ownedList}>{renderOwnedSummons()}</ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {backgroundColor: '#0f0a2e', flex: 1},
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerSpacer: {width: 40},
  title: {color: '#e2e8f0', fontSize: 18, fontWeight: '800'},
  scrollContent: {padding: 16, paddingBottom: 40},
  progressBar: {
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  skinEntry: {
    alignItems: 'center',
    backgroundColor: 'rgba(30,27,75,0.9)',
    borderColor: 'rgba(251,191,36,0.55)',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  skinEntryTitle: {color: '#fbbf24', fontSize: 15, fontWeight: '900'},
  skinEntryText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  skinEntryAction: {color: '#fff', fontSize: 13, fontWeight: '900'},
  bossGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  bossCard: {
    alignItems: 'center',
    aspectRatio: 0.75,
    backgroundColor: '#1e1b4b',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    padding: 2,
    width: '18.5%',
  },
  bossEmoji: {fontSize: 20},
  bossEmojiHidden: {opacity: 0.3},
  bossSprite: {height: 28, width: 28},
  bossStage: {color: '#94a3b8', fontSize: 9, fontWeight: '800'},
  bossDefeatCount: {color: '#22c55e', fontSize: 8, fontWeight: '700'},
  pendingBadge: {color: '#fbbf24', fontSize: 8, fontWeight: '900'},
  bossBestDamage: {color: '#fbbf24', fontSize: 8, fontWeight: '700'},
  titleSection: {marginTop: 20},
  sectionTitle: {color: '#e2e8f0', fontSize: 16, fontWeight: '800', marginBottom: 10},
  sectionTitleSmall: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 6,
  },
  titleRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(30,27,75,0.6)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  titleActive: {borderColor: '#fbbf24'},
  titleName: {color: '#e2e8f0', fontSize: 14, fontWeight: '700'},
  titleNameActive: {color: '#fbbf24'},
  equippedText: {color: '#fbbf24', fontSize: 10, fontWeight: '900'},
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(2,6,23,0.82)',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#111827',
    borderColor: 'rgba(251,191,36,0.35)',
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: '92%',
    padding: 14,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  modalTitle: {color: '#fff', fontSize: 16, fontWeight: '900'},
  modalSub: {color: '#cbd5e1', fontSize: 11, fontWeight: '700', marginTop: 3},
  closeBtn: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  closeText: {color: '#fff', fontSize: 12, fontWeight: '900'},
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  tabBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 8,
  },
  tabBtnActive: {backgroundColor: '#4338ca'},
  tabText: {color: '#fff', fontSize: 12, fontWeight: '900', textAlign: 'center'},
  rouletteBox: {alignItems: 'center', gap: 8, marginTop: 10},
  noticeText: {color: '#fbbf24', fontSize: 11, fontWeight: '800', textAlign: 'center'},
  rouletteWindow: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 142,
    justifyContent: 'center',
    width: '100%',
  },
  rouletteName: {color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 4},
  rouletteMeta: {color: '#94a3b8', fontSize: 11, fontWeight: '700', marginTop: 2},
  primaryBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 9,
    paddingHorizontal: 16,
    paddingVertical: 9,
    width: '100%',
  },
  primaryBtnText: {color: '#fff', fontSize: 13, fontWeight: '900', textAlign: 'center'},
  disabledBtn: {backgroundColor: '#475569', opacity: 0.7},
  fragmentBox: {gap: 8, marginTop: 10},
  purchaseList: {maxHeight: 220},
  purchaseRow: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    padding: 8,
  },
  purchaseInfo: {flex: 1},
  purchaseName: {color: '#fff', fontSize: 12, fontWeight: '900'},
  purchaseMeta: {color: '#cbd5e1', fontSize: 10, fontWeight: '700', marginTop: 2},
  buyBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  buyBtnText: {color: '#fff', fontSize: 11, fontWeight: '900'},
  modalMessage: {
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'center',
  },
  ownedList: {maxHeight: 180},
  ownedCard: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    padding: 8,
  },
  ownedInfo: {flex: 1},
  ownedName: {color: '#fff', fontSize: 12, fontWeight: '900'},
  ownedMeta: {color: '#cbd5e1', fontSize: 10, fontWeight: '700', marginTop: 2},
  ownedActions: {alignItems: 'stretch', gap: 4},
  smallActionBtn: {
    backgroundColor: '#334155',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  smallActionBtnActive: {backgroundColor: '#2563eb'},
  smallActionText: {color: '#fff', fontSize: 10, fontWeight: '900', textAlign: 'center'},
  convertBtn: {
    backgroundColor: '#7f1d1d',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  convertBtnText: {color: '#fecaca', fontSize: 10, fontWeight: '900', textAlign: 'center'},
  skillChoiceRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5},
  skillChoiceBtn: {
    backgroundColor: '#581c87',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  skillChoiceText: {color: '#f5d0fe', fontSize: 9, fontWeight: '900'},
  emptyText: {color: '#94a3b8', fontSize: 11, fontWeight: '700', paddingVertical: 8},
  summonFallback: {color: '#fff', fontSize: 20, fontWeight: '900'},
});
