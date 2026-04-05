import React, {useEffect, useReducer, useState} from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  clearPersistedAppState,
  loadPersistedAppState,
  persistAppState,
} from '../../blockhero_persistence';
import {ENDLESS_REWARD_THRESHOLDS} from '../../game_balance_runtime';
import {
  BOSS_RAID_DEFINITIONS,
  NORMAL_RAID_BOSSES,
  SKIN_DEFINITIONS,
} from '../../game_catalog';
import {
  appReducer,
  createInitialState,
  getBossRaidWindowInfo,
  getCurrentCharacterDefinition,
  getCurrentCharacterStats,
  getCurrentClearCount,
  getCurrentInventoryCap,
  getCurrentShopOffers,
  getCurrentSkillTree,
  getEquippedSkin,
  getEquippedSummonProgress,
  getSelectedWorld,
  getStagesForSelectedWorld,
  initialState,
} from '../../blockhero_state';
import {canUnlockOrUpgradeSkill} from '../../combat_rules';
import type {DefaultItemId} from '../../combat_rules';
import type {BoardCell, PieceDefinition} from '../../puzzle_engine';
import type {CharacterClassId} from '../types/gameDesign';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_WIDTH = Math.min(SCREEN_WIDTH - 24, 372);
const BOARD_CELL_SIZE = Math.floor((BOARD_WIDTH - 12 - 7 * 4) / 8);
const PIECE_CELL_SIZE = 14;
const PREVIEW_CELL_SIZE = 10;

const CLASS_IDS: CharacterClassId[] = ['knight', 'mage', 'archer', 'rogue', 'healer'];

const CLASS_ICONS: Record<CharacterClassId, string> = {
  knight: '🛡️',
  mage: '✨',
  archer: '🏹',
  rogue: '🗡️',
  healer: '💚',
};

const NAV_ITEMS = [
  {screen: 'home' as const, icon: '🏠', label: '홈'},
  {screen: 'characters' as const, icon: '👑', label: '캐릭터'},
  {screen: 'levels' as const, icon: '🗺️', label: '레벨'},
  {screen: 'endless' as const, icon: '♾️', label: '무한'},
  {screen: 'raids' as const, icon: '🐉', label: '레이드'},
  {screen: 'shop' as const, icon: '💎', label: '상점'},
];

function formatCompactNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return `${value}`;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}

function formatSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getItemIcon(itemId?: DefaultItemId): string {
  switch (itemId) {
    case 'hammer':
      return '🔨';
    case 'bomb':
      return '💣';
    case 'refresh':
      return '🔄';
    default:
      return '🎁';
  }
}

function MetricChip({icon, label, value}: {icon: string; label: string; value: string}) {
  return (
    <View style={styles.metricChip}>
      <Text style={styles.metricChipIcon}>{icon}</Text>
      <View style={styles.metricChipCopy}>
        <Text style={styles.metricChipLabel}>{label}</Text>
        <Text style={styles.metricChipValue}>{value}</Text>
      </View>
    </View>
  );
}

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive, !onPress && styles.pillDisabled]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function PieceShapePreview({
  piece,
  cellSize,
}: {
  piece: PieceDefinition;
  cellSize: number;
}) {
  return (
    <View>
      {piece.shape.map((row, rowIndex) => (
        <View key={`${piece.id}-${rowIndex}`} style={styles.shapeRow}>
          {row.map((filled, colIndex) => (
            <View
              key={`${piece.id}-${rowIndex}-${colIndex}`}
              style={[
                styles.shapeCell,
                {
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: filled ? piece.color : 'transparent',
                  opacity: filled ? 1 : 0,
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function BoardCellView({cell, onPress}: {cell: BoardCell | null; onPress: () => void}) {
  const specialIcon =
    cell?.specialKind === 'gem'
      ? '💎'
      : cell?.specialKind === 'item'
      ? getItemIcon(cell.specialItemId)
      : null;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.boardCell,
        {width: BOARD_CELL_SIZE, height: BOARD_CELL_SIZE},
        cell ? {backgroundColor: cell.color} : styles.boardCellEmpty,
        cell?.obstacleDurability ? styles.boardCellObstacle : null,
      ]}>
      {cell?.obstacleDurability ? <Text style={styles.boardCellText}>X{cell.obstacleDurability}</Text> : null}
      {specialIcon ? <Text style={styles.boardCellBadge}>{specialIcon}</Text> : null}
    </Pressable>
  );
}

export default function BlockHeroExperience() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [skillTab, setSkillTab] = useState<'personal' | 'party'>('personal');
  const [lobbyDraft, setLobbyDraft] = useState('');
  const [runDraft, setRunDraft] = useState('');
  const [showFullBossStandings, setShowFullBossStandings] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'loading' | 'saved' | 'error'>('loading');

  useEffect(() => {
    const timer = setInterval(() => {
      dispatch({type: 'tick', nowMs: Date.now()});
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      const snapshot = await loadPersistedAppState();

      if (!mounted) {
        return;
      }

      if (snapshot) {
        dispatch({type: 'hydrate_state', snapshot});
      }

      setHasHydrated(true);
      setSaveStatus('saved');
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    let mounted = true;

    async function save() {
      const success = await persistAppState(state);

      if (mounted) {
        setSaveStatus(success ? 'saved' : 'error');
      }
    }

    save();

    return () => {
      mounted = false;
    };
  }, [hasHydrated, state]);

  const selectedCharacter = state.player.characters[state.player.selectedClassId];
  const selectedDefinition = getCurrentCharacterDefinition(state);
  const selectedWorld = getSelectedWorld(state);
  const stages = getStagesForSelectedWorld(state);
  const selectedStage =
    stages.find(stage => stage.id === state.selectedStageId) ?? stages[0];
  const skillTree = getCurrentSkillTree(state);
  const inventoryCap = getCurrentInventoryCap(state);
  const shopOffers = getCurrentShopOffers(state);
  const equippedSkin = getEquippedSkin(state);
  const equippedSummonProgress = getEquippedSummonProgress(state);
  const activeRun = state.activeRun;
  const previewMode =
    activeRun?.mode ??
    (state.screen === 'endless'
      ? 'endless'
      : state.screen === 'raids'
      ? state.selectedRaidType === 'boss'
        ? 'boss_raid'
        : 'normal_raid'
      : 'level');
  const previewStats = getCurrentCharacterStats(state, previewMode);
  const bossWindow = getBossRaidWindowInfo(Date.now());
  const bossWindowRemainingMs = bossWindow.isOpen
    ? bossWindow.joinEndsAtMs - Date.now()
    : bossWindow.nextWindowStartsAtMs - Date.now();
  const visibleStandings =
    activeRun && showFullBossStandings
      ? activeRun.raidStandings
      : activeRun?.raidStandings.slice(0, 10) ?? [];
  const skillNodes = skillTab === 'personal' ? skillTree.personal : skillTree.party;
  const homeMenu = [
    {
      screen: 'levels' as const,
      icon: '🗺️',
      title: '레벨 모드',
      subtitle: `${state.player.unlockedStageId}/300 스테이지`,
      color: '#6c63ff',
    },
    {
      screen: 'endless' as const,
      icon: '♾️',
      title: '무한 모드',
      subtitle: '점수 달성마다 실시간 골드',
      color: '#22c55e',
    },
    {
      screen: 'raids' as const,
      icon: '🐉',
      title: '레이드 모드',
      subtitle: `보스 ${state.player.unlockedBossRaidStage}/10`,
      color: '#ef4444',
    },
    {
      screen: 'characters' as const,
      icon: CLASS_ICONS[state.player.selectedClassId],
      title: '캐릭터',
      subtitle: `${selectedDefinition.name} 성장`,
      color: '#8b5cf6',
    },
    {
      screen: 'shop' as const,
      icon: '💎',
      title: '상점',
      subtitle: '골드/다이아 아이템 구매',
      color: '#06b6d4',
    },
  ];

  const renderHome = () => (
    <ScrollView style={styles.screenScroll} contentContainerStyle={styles.screenContent}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>BlockHero</Text>
        <Text style={styles.heroSubtitle}>블록을 배치해 적을 처치하는 성장형 퍼즐 RPG</Text>
        <View style={styles.metricRow}>
          <MetricChip icon="❤️" label="하트" value={`${state.player.hearts}/${previewStats.maxHearts}`} />
          <MetricChip icon="🪙" label="골드" value={formatCompactNumber(state.player.gold)} />
          <MetricChip icon="💎" label="다이아" value={formatCompactNumber(state.player.diamonds)} />
        </View>
        <View style={styles.heroStats}>
          <View style={styles.heroStatBox}>
            <Text style={styles.heroStatLabel}>현재 클래스</Text>
            <Text style={styles.heroStatValue}>
              {CLASS_ICONS[state.player.selectedClassId]} {selectedDefinition.name}
            </Text>
          </View>
          <View style={styles.heroStatBox}>
            <Text style={styles.heroStatLabel}>공격력 / HP</Text>
            <Text style={styles.heroStatValue}>
              {previewStats.attack} / {previewStats.maxHp}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.menuList}>
        {homeMenu.map(menu => (
          <Pressable
            key={menu.screen}
            onPress={() => dispatch({type: 'select_screen', screen: menu.screen})}
            style={[styles.menuCard, {backgroundColor: menu.color}]}>
            <View style={styles.menuIconWrap}>
              <Text style={styles.menuIcon}>{menu.icon}</Text>
            </View>
            <View style={styles.menuCopy}>
              <Text style={styles.menuTitle}>{menu.title}</Text>
              <Text style={styles.menuSubtitle}>{menu.subtitle}</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
        ))}
      </View>

      <SectionCard title="현재 진행" subtitle="요청하신 핵심 규칙이 플레이에 묶여 있는 상태">
        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>레벨 진행</Text>
          <Text style={styles.infoValue}>{state.player.unlockedStageId}/300</Text>
          <Text style={styles.infoCopy}>10개 맵, 월드당 30스테이지 구조</Text>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>장착 스킨</Text>
          <Text style={styles.infoValue}>{equippedSkin?.id ?? '없음'}</Text>
          <Text style={styles.infoCopy}>
            소환 레벨 {equippedSummonProgress?.level ?? 1} / 남은 시간{' '}
            {formatSeconds(equippedSummonProgress?.activeTimeLeftSec ?? 300)}
          </Text>
        </View>
      </SectionCard>
    </ScrollView>
  );

  const renderCharacters = () => (
    <ScrollView style={styles.screenScroll} contentContainerStyle={styles.screenContent}>
      <SectionCard
        title="직업 선택"
        subtitle={`${selectedDefinition.name} Lv.${selectedCharacter.level} | 스킬 포인트 ${selectedCharacter.skillPoints}`}>
        <View style={styles.classRow}>
          {CLASS_IDS.map(classId => {
            const isActive = classId === state.player.selectedClassId;
            const progress = state.player.characters[classId];

            return (
              <Pressable
                key={classId}
                onPress={() => dispatch({type: 'select_class', classId})}
                style={[styles.classCard, isActive && styles.classCardActive]}>
                <Text style={styles.classIcon}>{CLASS_ICONS[classId]}</Text>
                <Text style={styles.className}>{classId.toUpperCase()}</Text>
                <Text style={styles.classMeta}>Lv.{progress.level}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.metricRow}>
          <MetricChip icon="⚔️" label="공격력" value={`${previewStats.attack}`} />
          <MetricChip icon="🫀" label="최대 HP" value={`${previewStats.maxHp}`} />
          <MetricChip icon="🔥" label="피버" value={`${previewStats.feverRequirement}줄`} />
        </View>
      </SectionCard>

      <SectionCard title="스킬트리" subtitle="앞 스킬을 5레벨 찍으면 다음 노드 해금">
        <View style={styles.segmentRow}>
          <Pill label="개인 패시브" active={skillTab === 'personal'} onPress={() => setSkillTab('personal')} />
          <Pill label="파티/레이드 버프" active={skillTab === 'party'} onPress={() => setSkillTab('party')} />
        </View>
        <View style={styles.cardList}>
          {skillNodes.map(skill => {
            const level =
              selectedCharacter.skills.find(entry => entry.skillId === skill.id)?.level ?? 0;
            const canUpgrade =
              selectedCharacter.skillPoints > 0 &&
              level < 5 &&
              canUnlockOrUpgradeSkill(skill.id, selectedCharacter.skills);

            return (
              <View key={skill.id} style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <View style={styles.detailCopy}>
                    <Text style={styles.detailTitle}>
                      {skill.legacyIndex}. {skill.name}
                    </Text>
                    <Text style={styles.detailSubtitle}>{skill.shortDescription}</Text>
                  </View>
                  <Text style={styles.levelPill}>Lv.{level}/5</Text>
                </View>
                <Text style={styles.requirementText}>
                  {skill.prerequisiteSkillId ? '이전 노드 Lv.5 필요' : '첫 노드'}
                </Text>
                <Pressable
                  onPress={() => dispatch({type: 'upgrade_skill', skillId: skill.id})}
                  style={[styles.primaryButton, !canUpgrade && styles.primaryButtonDisabled]}>
                  <Text style={styles.primaryButtonText}>{canUpgrade ? '강화' : '잠금'}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title="스킨 & 소환" subtitle="일반 레이드 10회 클리어 시 스킨 해금">
        {SKIN_DEFINITIONS.map(skin => {
          const clearCount = getCurrentClearCount(state, Number(skin.id.replace(/[^\d]/g, '')) || 1);
          const unlocked = state.player.unlockedSkinIds.includes(skin.id);

          return (
            <View key={skin.id} style={styles.skinRow}>
              <View style={styles.detailCopy}>
                <Text style={styles.detailTitle}>{skin.id}</Text>
                <Text style={styles.detailSubtitle}>
                  공격력 +{Math.round(skin.attackBonusRate * 100)}% | {clearCount}/10
                </Text>
              </View>
              <Pressable
                onPress={() => dispatch({type: 'equip_skin', skinId: unlocked ? skin.id : null})}
                style={[styles.inlineButton, unlocked && state.player.equippedSkinId === skin.id && styles.inlineButtonActive]}>
                <Text style={styles.inlineButtonText}>
                  {unlocked ? (state.player.equippedSkinId === skin.id ? '장착중' : '장착') : '잠김'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </SectionCard>
    </ScrollView>
  );

  const renderLevels = () => (
    <ScrollView style={styles.screenScroll} contentContainerStyle={styles.screenContent}>
      <SectionCard title="월드 선택" subtitle={`${selectedWorld.name} | ${selectedWorld.theme}`}>
        <View style={styles.worldRow}>
          {Array.from({length: 10}, (_, index) => index + 1).map(worldId => (
            <Pressable
              key={worldId}
              onPress={() => dispatch({type: 'select_world', worldId})}
              style={[styles.worldChip, state.selectedWorldId === worldId && styles.worldChipActive]}>
              <Text style={styles.worldChipText}>월드 {worldId}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.copyText}>
          보스 {selectedWorld.bossName} | 현재 선택 {selectedStage.name}
        </Text>
      </SectionCard>

      <SectionCard title="스테이지 목록" subtitle="몬스터를 처치하면 다음 스테이지가 해금됩니다">
        <View style={styles.stageGrid}>
          {stages.map(stage => {
            const isLocked = stage.id > state.player.unlockedStageId;
            const isCleared = state.player.clearedStageIds.includes(stage.id);
            const isSelected = stage.id === state.selectedStageId;

            return (
              <Pressable
                key={stage.id}
                disabled={isLocked}
                onPress={() => dispatch({type: 'select_stage', stageId: stage.id})}
                style={[
                  styles.stageCard,
                  isSelected && styles.stageCardSelected,
                  isCleared && styles.stageCardCleared,
                  isLocked && styles.stageCardLocked,
                ]}>
                <Text style={styles.stageCardNumber}>{stage.stageNumberInWorld}</Text>
                <Text style={styles.stageCardName}>{stage.monsterName}</Text>
                <Text style={styles.stageCardMeta}>HP {formatCompactNumber(stage.monsterHp)}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{selectedStage.name}</Text>
          <Text style={styles.detailSubtitle}>
            {selectedStage.monsterName} | 공격 {selectedStage.monsterAttack} | 골드 {selectedStage.rewardGold} | 경험치 {selectedStage.rewardCharacterExp}
          </Text>
          <Pressable
            onPress={() => dispatch({type: 'start_level_run', stageId: selectedStage.id})}
            style={[
              styles.primaryButton,
              (selectedStage.id > state.player.unlockedStageId || state.player.hearts <= 0) &&
                styles.primaryButtonDisabled,
            ]}>
            <Text style={styles.primaryButtonText}>
              {state.player.hearts <= 0 ? '하트 부족' : '전투 시작'}
            </Text>
          </Pressable>
        </View>
      </SectionCard>
    </ScrollView>
  );

  const renderEndless = () => (
    <ScrollView style={styles.screenScroll} contentContainerStyle={styles.screenContent}>
      <SectionCard title="무한 모드" subtitle="대미지가 점수로 누적되고 목표 점수마다 골드를 지급합니다">
        <View style={styles.metricRow}>
          <MetricChip icon="⚔️" label="환산 공격력" value={`${previewStats.attack}`} />
          <MetricChip icon="🧱" label="장애물" value="내구도 유지" />
        </View>
        <View style={styles.cardList}>
          {ENDLESS_REWARD_THRESHOLDS.map(threshold => (
            <View key={threshold.scoreTarget} style={styles.detailCard}>
              <Text style={styles.detailTitle}>{formatCompactNumber(threshold.scoreTarget)} 점</Text>
              <Text style={styles.detailSubtitle}>도달 시 골드 +{threshold.goldReward}</Text>
            </View>
          ))}
        </View>
        <Pressable onPress={() => dispatch({type: 'start_endless_run'})} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>무한 모드 시작</Text>
        </Pressable>
      </SectionCard>
    </ScrollView>
  );

  const renderRaids = () => (
    <ScrollView style={styles.screenScroll} contentContainerStyle={styles.screenContent}>
      <SectionCard title="레이드 타입" subtitle="일반 레이드는 상시, 보스 레이드는 4시간마다 10분 오픈">
        <View style={styles.segmentRow}>
          <Pill
            label="일반 레이드"
            active={state.selectedRaidType === 'normal'}
            onPress={() => dispatch({type: 'select_raid_type', raidType: 'normal'})}
          />
          <Pill
            label="보스 레이드"
            active={state.selectedRaidType === 'boss'}
            onPress={() => dispatch({type: 'select_raid_type', raidType: 'boss'})}
          />
        </View>
        <Text style={styles.copyText}>
          {state.selectedRaidType === 'boss'
            ? bossWindow.isOpen
              ? `보스 레이드 오픈 중 · 남은 시간 ${formatCountdown(bossWindowRemainingMs)}`
              : `다음 보스 레이드까지 ${formatCountdown(bossWindowRemainingMs)}`
            : '일반 레이드는 언제든지 도전 가능합니다'}
        </Text>
      </SectionCard>

      <SectionCard title="로비 채팅" subtitle="대기 로비에서 파티원을 모집할 수 있습니다">
        <View style={styles.chatList}>
          {state.raidLobbyMessages.map(message => (
            <View key={message.id} style={styles.chatBubble}>
              <Text style={styles.chatAuthor}>{message.author}</Text>
              <Text style={styles.chatText}>{message.text}</Text>
            </View>
          ))}
        </View>
        <View style={styles.composerRow}>
          <TextInput
            value={lobbyDraft}
            onChangeText={setLobbyDraft}
            placeholder="모집 메시지 입력"
            placeholderTextColor="#857cb6"
            style={styles.input}
          />
          <Pressable
            onPress={() => {
              dispatch({type: 'send_lobby_message', text: lobbyDraft});
              setLobbyDraft('');
            }}
            style={styles.inlineButton}>
            <Text style={styles.inlineButtonText}>전송</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard title="레이드 목록" subtitle="10회 클리어 시 스킨 해금, 보스는 월드 클리어로 해금">
        <View style={styles.cardList}>
          {(state.selectedRaidType === 'normal' ? NORMAL_RAID_BOSSES : BOSS_RAID_DEFINITIONS).map(entry => (
            <View key={`${state.selectedRaidType}-${entry.stage}`} style={styles.detailCard}>
              <Text style={styles.detailTitle}>
                Stage {entry.stage} · {entry.name}
              </Text>
              <Text style={styles.detailSubtitle}>
                {state.selectedRaidType === 'normal'
                  ? `클리어 ${state.player.normalRaidClearCounts[entry.stage] ?? 0}회`
                  : `보스 HP ${formatCompactNumber('maxHp' in entry ? entry.maxHp : 0)}`}
              </Text>
              <Pressable
                onPress={() =>
                  dispatch({
                    type: state.selectedRaidType === 'normal' ? 'start_normal_raid' : 'start_boss_raid',
                    stage: entry.stage,
                  })
                }
                style={[
                  styles.primaryButton,
                  state.selectedRaidType === 'boss' &&
                    (!bossWindow.isOpen || entry.stage > state.player.unlockedBossRaidStage) &&
                    styles.primaryButtonDisabled,
                ]}>
                <Text style={styles.primaryButtonText}>입장</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </SectionCard>
    </ScrollView>
  );

  const renderShop = () => (
    <ScrollView style={styles.screenScroll} contentContainerStyle={styles.screenContent}>
      <SectionCard title="아이템 상점" subtitle={`기본 보유량 ${inventoryCap}개, 도적 스킬로 확장`}>
        <View style={styles.cardList}>
          {shopOffers.map(offer => (
            <View key={offer.itemId} style={styles.detailCard}>
              <Text style={styles.detailTitle}>
                {getItemIcon(offer.itemId)} {offer.itemId}
              </Text>
              <Text style={styles.detailSubtitle}>
                보유 {state.player.inventory[offer.itemId]} / {inventoryCap}
              </Text>
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => dispatch({type: 'buy_shop_item', itemId: offer.itemId, currency: 'gold'})}
                  style={styles.inlineButton}>
                  <Text style={styles.inlineButtonText}>🪙 {offer.goldPrice}</Text>
                </Pressable>
                <Pressable
                  onPress={() => dispatch({type: 'buy_shop_item', itemId: offer.itemId, currency: 'diamond'})}
                  style={styles.inlineButton}>
                  <Text style={styles.inlineButtonText}>💎 {offer.diamondPrice}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
        <Pressable
          onPress={async () => {
            await clearPersistedAppState();
            dispatch({type: 'hydrate_state', snapshot: createInitialState()});
            setSaveStatus('saved');
          }}
          style={[styles.primaryButton, styles.dangerButton]}>
          <Text style={styles.primaryButtonText}>로컬 저장 초기화</Text>
        </Pressable>
      </SectionCard>
    </ScrollView>
  );

  const renderRun = () => {
    if (!activeRun) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>진행 중인 전투가 없습니다.</Text>
        </View>
      );
    }

    const selectedPiece =
      activeRun.pieces.find(piece => piece.id === activeRun.selectedPieceId) ?? activeRun.pieces[0] ?? null;

    return (
      <ScrollView style={styles.screenScroll} contentContainerStyle={styles.screenContent}>
        <SectionCard title={activeRun.title} subtitle={activeRun.subtitle}>
          <Text style={styles.copyText}>
            플레이어 HP {activeRun.playerHp}/{activeRun.playerMaxHp}
            {activeRun.mode === 'endless'
              ? ` | 점수 ${formatCompactNumber(activeRun.score)}`
              : ` | 적 HP ${formatCompactNumber(activeRun.enemyHp ?? 0)}`}
          </Text>
          <Text style={styles.copyText}>
            콤보 {activeRun.combo.comboCount} | 피버 {activeRun.fever.lineGauge}/{activeRun.fever.requirement} |
            소환 {activeRun.summonGauge}/{activeRun.summonGaugeRequired}
          </Text>
        </SectionCard>

        <SectionCard title="보드" subtitle="조각을 선택하고 보드 셀을 터치해 배치합니다">
          <View style={styles.boardShell}>
            {activeRun.board.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.boardRow}>
                {row.map((cell, colIndex) => (
                  <BoardCellView
                    key={`cell-${rowIndex}-${colIndex}`}
                    cell={cell}
                    onPress={() => dispatch({type: 'tap_board', row: rowIndex, col: colIndex})}
                  />
                ))}
              </View>
            ))}
          </View>
          <View style={styles.segmentRow}>
            <Pill label="배치" active={activeRun.selectedTool === 'place'} onPress={() => dispatch({type: 'select_tool', tool: 'place'})} />
            <Pill label={`망치 ${state.player.inventory.hammer}`} active={activeRun.selectedTool === 'hammer'} onPress={() => dispatch({type: 'select_tool', tool: 'hammer'})} />
            <Pill label={`폭탄 ${state.player.inventory.bomb}`} active={activeRun.selectedTool === 'bomb'} onPress={() => dispatch({type: 'select_tool', tool: 'bomb'})} />
            <Pill label={`교체 ${state.player.inventory.refresh}`} onPress={() => dispatch({type: 'use_refresh'})} />
          </View>
        </SectionCard>

        <SectionCard title="조각 선택" subtitle={selectedPiece ? `선택 ID ${selectedPiece.id}` : '조각 없음'}>
          <View style={styles.pieceRow}>
            {activeRun.pieces.map(piece => (
              <Pressable
                key={piece.id}
                onPress={() => dispatch({type: 'select_piece', pieceId: piece.id})}
                style={[styles.pieceCard, activeRun.selectedPieceId === piece.id && styles.pieceCardSelected]}>
                <PieceShapePreview piece={piece} cellSize={PIECE_CELL_SIZE} />
              </Pressable>
            ))}
          </View>
          {activeRun.upcomingPieces.length > 0 ? (
            <View style={styles.previewList}>
              {activeRun.upcomingPieces.map(piece => (
                <View key={`preview-${piece.id}`} style={styles.previewCard}>
                  <PieceShapePreview piece={piece} cellSize={PREVIEW_CELL_SIZE} />
                </View>
              ))}
            </View>
          ) : null}
        </SectionCard>

        {(activeRun.mode === 'normal_raid' || activeRun.mode === 'boss_raid') && (
          <SectionCard title="레이드 패널" subtitle={activeRun.mode === 'boss_raid' ? '상위 10명/전체 30명 보기' : '전투 중 채팅 유지'}>
            {activeRun.mode === 'boss_raid' ? (
              <View style={styles.cardList}>
                {visibleStandings.map((entry, index) => (
                  <View key={entry.id} style={styles.rankRow}>
                    <Text style={styles.rankLabel}>#{index + 1}</Text>
                    <Text style={styles.rankName}>{entry.name}</Text>
                    <Text style={styles.rankValue}>{formatCompactNumber(entry.damage)}</Text>
                  </View>
                ))}
                <Pressable
                  onPress={() => setShowFullBossStandings(value => !value)}
                  style={styles.inlineButton}>
                  <Text style={styles.inlineButtonText}>{showFullBossStandings ? '상위 10명 보기' : '전체 보기'}</Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.chatList}>
              {activeRun.lobbyChat.map(message => (
                <View key={message.id} style={styles.chatBubble}>
                  <Text style={styles.chatAuthor}>{message.author}</Text>
                  <Text style={styles.chatText}>{message.text}</Text>
                </View>
              ))}
            </View>
            <View style={styles.composerRow}>
              <TextInput
                value={runDraft}
                onChangeText={setRunDraft}
                placeholder="작전 메시지 입력"
                placeholderTextColor="#857cb6"
                style={styles.input}
              />
              <Pressable
                onPress={() => {
                  dispatch({type: 'send_run_message', text: runDraft});
                  setRunDraft('');
                }}
                style={styles.inlineButton}>
                <Text style={styles.inlineButtonText}>전송</Text>
              </Pressable>
            </View>
          </SectionCard>
        )}

        <SectionCard title="전투 로그" subtitle="최근 동작과 보상 변화">
          <View style={styles.cardList}>
            {activeRun.logs.slice().reverse().map(log => (
              <Text key={log} style={styles.logText}>
                • {log}
              </Text>
            ))}
          </View>
          {activeRun.ended ? (
            <Pressable onPress={() => dispatch({type: 'claim_run'})} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{activeRun.victory ? '보상 수령' : '결과 정리'}</Text>
            </Pressable>
          ) : null}
        </SectionCard>
      </ScrollView>
    );
  };

  const renderScreen = () => {
    switch (state.screen) {
      case 'characters':
        return renderCharacters();
      case 'levels':
        return renderLevels();
      case 'endless':
        return renderEndless();
      case 'raids':
        return renderRaids();
      case 'shop':
        return renderShop();
      case 'run':
        return renderRun();
      case 'home':
      default:
        return renderHome();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />
      {state.screen === 'run' ? null : (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>BlockHero</Text>
          <Text style={styles.headerMeta}>save {saveStatus}</Text>
        </View>
      )}
      {renderScreen()}
      {state.screen !== 'run' ? (
        <View style={styles.bottomNav}>
          {NAV_ITEMS.map(item => (
            <Pressable
              key={item.screen}
              onPress={() => dispatch({type: 'select_screen', screen: item.screen})}
              style={[styles.bottomNavButton, state.screen === item.screen && styles.bottomNavButtonActive]}>
              <Text style={styles.bottomNavIcon}>{item.icon}</Text>
              <Text style={[styles.bottomNavLabel, state.screen === item.screen && styles.bottomNavLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120b2b',
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: -120,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(108,99,255,0.24)',
  },
  backgroundGlowBottom: {
    position: 'absolute',
    right: -120,
    bottom: 90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(14,165,233,0.12)',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(108,99,255,0.5)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 12,
  },
  headerMeta: {
    color: '#b8b0dd',
    fontSize: 11,
  },
  screenScroll: {
    flex: 1,
  },
  screenContent: {
    paddingHorizontal: 16,
    paddingBottom: 118,
    gap: 14,
  },
  heroCard: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: 'rgba(33, 24, 72, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(133, 110, 255, 0.26)',
    gap: 14,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: '#cfc9ed',
    fontSize: 13,
    lineHeight: 18,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    minWidth: 96,
  },
  metricChipIcon: {
    fontSize: 20,
  },
  metricChipCopy: {
    gap: 2,
  },
  metricChipLabel: {
    color: '#9d95c8',
    fontSize: 11,
  },
  metricChipValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  heroStats: {
    flexDirection: 'row',
    gap: 10,
  },
  heroStatBox: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
  },
  heroStatLabel: {
    color: '#a9a1cf',
    fontSize: 11,
  },
  heroStatValue: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 4,
  },
  menuList: {
    gap: 12,
  },
  menuCard: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 26,
  },
  menuCopy: {
    flex: 1,
    marginLeft: 14,
  },
  menuTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  menuSubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    marginTop: 4,
  },
  menuArrow: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
  sectionCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(26, 18, 58, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 14,
  },
  sectionHeader: {
    gap: 6,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: '#b8b0dd',
    fontSize: 12,
    lineHeight: 18,
  },
  infoBlock: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    gap: 4,
  },
  infoTitle: {
    color: '#9d95c8',
    fontSize: 11,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  infoCopy: {
    color: '#cbc5ea',
    fontSize: 12,
  },
  classRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  classCard: {
    flexBasis: '31%',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    gap: 6,
  },
  classCardActive: {
    borderColor: '#6c63ff',
    backgroundColor: 'rgba(108,99,255,0.16)',
  },
  classIcon: {
    fontSize: 26,
  },
  className: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  classMeta: {
    color: '#a8a0ce',
    fontSize: 11,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: '#6c63ff',
  },
  pillDisabled: {
    opacity: 0.6,
  },
  pillText: {
    color: '#d8d4f0',
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  cardList: {
    gap: 10,
  },
  detailCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 10,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  detailCopy: {
    flex: 1,
    gap: 4,
  },
  detailTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  detailSubtitle: {
    color: '#c5bfe6',
    fontSize: 12,
    lineHeight: 18,
  },
  levelPill: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: 'rgba(108,99,255,0.22)',
    borderRadius: 14,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  requirementText: {
    color: '#8d86b7',
    fontSize: 11,
  },
  skinRow: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  inlineButton: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineButtonActive: {
    backgroundColor: '#10b981',
  },
  inlineButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  worldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  worldChip: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  worldChipActive: {
    backgroundColor: '#6c63ff',
  },
  worldChipText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  copyText: {
    color: '#cbc5ea',
    fontSize: 12,
    lineHeight: 18,
  },
  stageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stageCard: {
    width: '18.3%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 3,
  },
  stageCardSelected: {
    backgroundColor: 'rgba(108,99,255,0.24)',
    borderWidth: 1,
    borderColor: '#6c63ff',
  },
  stageCardCleared: {
    backgroundColor: 'rgba(34,197,94,0.18)',
  },
  stageCardLocked: {
    opacity: 0.35,
  },
  stageCardNumber: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  stageCardName: {
    color: '#ddd8f2',
    fontSize: 9,
    textAlign: 'center',
  },
  stageCardMeta: {
    color: '#9d95c8',
    fontSize: 8,
  },
  primaryButton: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6c63ff',
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  chatList: {
    gap: 8,
  },
  chatBubble: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chatAuthor: {
    color: '#8f8ab7',
    fontSize: 11,
    fontWeight: '700',
  },
  chatText: {
    color: '#ffffff',
    fontSize: 13,
    marginTop: 2,
  },
  composerRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    minHeight: 44,
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#ffffff',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  emptyState: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  boardShell: {
    width: BOARD_WIDTH,
    alignSelf: 'center',
    padding: 6,
    borderRadius: 24,
    backgroundColor: '#0f0a24',
    gap: 4,
  },
  boardRow: {
    flexDirection: 'row',
    gap: 4,
  },
  boardCell: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardCellEmpty: {
    backgroundColor: '#1d153c',
  },
  boardCellObstacle: {
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  boardCellText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  boardCellBadge: {
    position: 'absolute',
    right: 3,
    bottom: 2,
    fontSize: 11,
  },
  pieceRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  pieceCard: {
    minWidth: 90,
    minHeight: 78,
    borderRadius: 18,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieceCardSelected: {
    borderWidth: 2,
    borderColor: '#6c63ff',
    backgroundColor: 'rgba(108,99,255,0.16)',
  },
  shapeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  shapeCell: {
    borderRadius: 4,
    margin: 1,
  },
  previewList: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  previewCard: {
    minWidth: 58,
    minHeight: 52,
    borderRadius: 14,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rankLabel: {
    width: 30,
    color: '#a6a0cd',
    fontSize: 12,
    fontWeight: '800',
  },
  rankName: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  rankValue: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '800',
  },
  logText: {
    color: '#ddd8f2',
    fontSize: 12,
    lineHeight: 18,
  },
  bottomNav: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 28,
    backgroundColor: 'rgba(13, 10, 29, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottomNavButton: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    borderRadius: 16,
  },
  bottomNavButtonActive: {
    backgroundColor: 'rgba(108,99,255,0.22)',
  },
  bottomNavIcon: {
    fontSize: 16,
  },
  bottomNavLabel: {
    color: '#8f8ab7',
    fontSize: 10,
    fontWeight: '700',
  },
  bottomNavLabelActive: {
    color: '#ffffff',
  },
});
