import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity, Animated,
  Vibration, TextInput, ScrollView, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Board from '../components/Board';
import PieceSelector from '../components/PieceSelector';
import BossDisplay from '../components/BossDisplay';
import RaidSummonOverlay from '../components/RaidSummonOverlay';
import SkillBar from '../components/SkillBar';
import KnightSprite from '../components/KnightSprite';
import {RaidParticipant} from '../components/RaidParticipants';
import {useDragDrop} from '../game/useDragDrop';
import {COMBO_TIMEOUT_MS, FEVER_DURATION} from '../constants';
import {RAID_BOSSES} from '../constants/raidBosses';
import {formatAttackTimer} from '../constants/raidConfig';
import {getRaidBossAttackStats} from '../game/battleBalance';
import {resolveCombatTurn} from '../game/combatFlow';
import {
  applyCombatDamageEffects,
  applyDamageTakenReduction,
  applyRewardMultipliers,
  getCharacterSkillEffects,
  getPieceGenerationOptions,
  shouldDodgeAttack,
} from '../game/characterSkillEffects';
import {
  createBoard, generatePlaceablePieces, placePiece,
  checkAndClearLines, countBlocks, canPlaceAnyPiece,
  Piece, Board as BoardType, getDifficulty, resetPieceGenerationHistory,
} from '../game/engine';
import {
  getPlayerId, getNickname, getSelectedCharacter, loadCharacterData,
  loadGameData, addGold, addDiamonds, addItem, loadCodexData,
  collectSpecialBlockRewards, GameData,
  unlockSkin, loadUnlockedTitles, saveUnlockedTitles, updateLocalCodex,
  gainSummonExp, loadSkinData,
} from '../stores/gameStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from '../services/supabase';
import {getRaidInstance, getRaidParticipants, dealRaidDamage, joinRaidInstance, getRaidChannel} from '../services/raidService';
import {upsertCodexEntry} from '../services/codexService';
import {calculateRewards, RewardResult} from '../constants/raidRewards';
import {checkNewTitles} from '../constants/titles';
import {getSkinColors} from '../game/skinContext';
import {getSkinBoardBg, setActiveSkin} from '../game/skinContext';
import RaidRewardPopup from '../components/RaidRewardPopup';
import {t} from '../i18n';
import {getCharacterAtk, getCharacterHp} from '../constants/characters';
import {
  getNormalRaidRewardPreview,
} from '../game/raidRules';
import {
  claimFirstClearDia,
  loadNormalRaidProgress,
  recordNormalRaidKill,
} from '../stores/gameStore';
import {
  applySkinCombatDamage,
  applySkinIncomingDamage,
  applySkinRewardBonuses,
  getActiveSkinLoadout,
  getSummonGaugeGain,
  mergeSkinPieceGenerationOptions,
} from '../game/skinSummonRuntime';
import {
  consumeRaidSkillGauge,
  getRaidSkillCharges,
  getRaidSkillEffectiveMultiplier,
  getRaidSkillGaugeGain,
  getRaidSkillLevels,
} from '../game/raidSkillRuntime';
import {
  getMonsterPoseSource,
  getRaidBossSpriteSet,
  getRaidSummonSpriteSet,
  MonsterSpritePose,
} from '../assets/monsterSprites';
import {
  getCachedCharacterVisualTunings,
  loadCharacterVisualTunings,
  subscribeCharacterVisualTunings,
} from '../stores/characterVisualTuning';

// Damage flash effect
function DamageFlash({damage, onDone}: {damage: number; onDone: () => void}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(translateY, {toValue: -6, duration: 220, useNativeDriver: true}),
        Animated.timing(translateY, {toValue: -18, duration: 820, useNativeDriver: true}),
      ]),
      Animated.sequence([
        Animated.delay(650),
        Animated.timing(opacity, {toValue: 0, duration: 350, useNativeDriver: true}),
      ]),
    ]).start(onDone);
  }, [onDone, opacity, translateY]);

  return (
    <Animated.View style={[styles.damageFlash, {opacity, transform: [{translateY}]}]}>
      <Text style={styles.damageFlashText}>-{damage}</Text>
    </Animated.View>
  );
}

interface ChatMsg {
  id: string;
  nickname: string;
  text: string;
}

const HEARTBEAT_INTERVAL = 5000;
const INIT_QUERY_TIMEOUT_MS = 7000;
const SUMMON_SPAWN_POINTS = 4;
const RAID_CHARACTER_VISUALS: Record<string, {name: string; emoji: string}> = {
  knight: {name: '기사', emoji: '🛡️'},
  mage: {name: '매지션', emoji: '🔮'},
  archer: {name: '궁수', emoji: '🏹'},
  rogue: {name: '도적', emoji: '🗡️'},
  healer: {name: '힐러', emoji: '✨'},
};

const RAID_CHARACTER_PORTRAITS: Partial<Record<string, any>> = {
  knight: require('../assets/ui/hero_knight.png'),
  mage: require('../assets/ui/hero_mage.png'),
};

function withTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = INIT_QUERY_TIMEOUT_MS,
) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label}_timeout`));
    }, timeoutMs);

    promise
      .then(value => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export default function RaidScreen({route, navigation}: any) {
  const {instanceId, bossStage, isNormalRaid = false} = route.params;
  const boss = RAID_BOSSES.find(b => b.stage === bossStage) || RAID_BOSSES[0];
  const bossAttackStats = getRaidBossAttackStats(bossStage);

  const [board, setBoard] = useState<BoardType>(createBoard());
  const [pieces, setPieces] = useState<(Piece | null)[]>([]);
  const [bossHp, setBossHp] = useState(boss.maxHp);
  const [playerHp, setPlayerHp] = useState(200);
  const [maxPlayerHp, setMaxPlayerHp] = useState(200);
  const [combo, setCombo] = useState(0);
  const [linesCleared, setLinesCleared] = useState(0);
  const [feverGauge, setFeverGauge] = useState(0);
  const [feverActive, setFeverActive] = useState(false);
  const [participants, setParticipants] = useState<RaidParticipant[]>([]);
  const [skillGauge, setSkillGauge] = useState(0);
  const [activeMultiplier, setActiveMultiplier] = useState(1);
  const [myTotalDamage, setMyTotalDamage] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [bossDefeated, setBossDefeated] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [boardLayout, setBoardLayout] = useState<{x: number; y: number} | null>(null);
  const [damageEffect, setDamageEffect] = useState<number | null>(null);
  const [showBossHit, setShowBossHit] = useState(false);
  const [playerAttackPulse, setPlayerAttackPulse] = useState(0);
  const [bossPose, setBossPose] = useState<MonsterSpritePose>('idle');
  const [round, setRound] = useState(0);
  const [attackTimerText, setAttackTimerText] = useState('10:00');
  const [expiresAt, setExpiresAt] = useState(0);
  const [rewardData, setRewardData] = useState<RewardResult | null>(null);
  const [rewardCollected, setRewardCollected] = useState(false);
  const [standingsExpanded, setStandingsExpanded] = useState(false);
  const [skinBoardBg, setSkinBoardBg] = useState(getSkinBoardBg());
  const [summonGauge, setSummonGauge] = useState(0);
  const [summonGaugeRequired, setSummonGaugeRequired] = useState(0);
  const [summonAttack, setSummonAttack] = useState(0);
  const [summonActive, setSummonActive] = useState(false);
  const [summonRemainingMs, setSummonRemainingMs] = useState(0);
  const [summonAttackPulse, setSummonAttackPulse] = useState(0);
  const [summonOverlayVisible, setSummonOverlayVisible] = useState(false);
  const [summonReturning, setSummonReturning] = useState(false);
  const [summonSpawnIndex, setSummonSpawnIndex] = useState(0);
  const [characterVisualTunings, setCharacterVisualTunings] = useState(
    getCachedCharacterVisualTunings(),
  );
  const [raidSkillLevels, setRaidSkillLevels] = useState<Record<number, number>>({});
  const [failureReason, setFailureReason] =
    useState<'board_full' | 'hp_zero' | 'time_up'>('board_full');

  // Spectator mode states
  const [spectatorMode, setSpectatorMode] = useState(false);
  const [_alivePlayers, setAlivePlayers] = useState<string[]>([]);
  const [_spectatingIdx, setSpectatingIdx] = useState(0);
  const [spectatorBoard, setSpectatorBoard] = useState<BoardType>(createBoard());
  const [spectatorNickname, setSpectatorNickname] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');

  const startedAtRef = useRef(0);
  const vibrationRef = useRef(true);
  const boardRef = useRef<View>(null);
  const playerIdRef = useRef('');
  const nicknameRef = useRef('');
  const channelRef = useRef<any>(null);
  const heartbeatTimer = useRef<any>(null);
  const attackTimer = useRef<any>(null);
  const bossAttackTimer = useRef<any>(null);
  const bossPoseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameOverRef = useRef(false);
  const spectatorRef = useRef(false);
  const attackPowerRef = useRef(10);
  const baseAttackPowerRef = useRef(10);
  const playerHpRef = useRef(200);
  const baseMaxPlayerHpRef = useRef(200);
  const bossHpRef = useRef(boss.maxHp);
  const selectedCharacterRef = useRef<string | null>(null);
  const selectedCharacterDataRef = useRef<any>(null);
  const activeSkinIdRef = useRef(0);
  const comboRef = useRef(0);
  const linesClearedRef = useRef(0);
  const feverGaugeRef = useRef(0);
  const feverActiveRef = useRef(false);
  const reviveUsedRef = useRef(false);
  const smallPieceStreakRef = useRef(0);
  const summonGaugeRef = useRef(0);
  const summonGaugeRequiredRef = useRef(0);
  const summonAttackRef = useRef(0);
  const summonActiveRef = useRef(false);
  const summonRemainingMsRef = useRef(0);
  const summonExpEarnedRef = useRef(0);
  const skillGaugeRef = useRef(0);
  const raidSkillLevelsRef = useRef<Record<number, number>>({});
  const remoteBoardsRef = useRef<Map<string, {board: BoardType; nickname: string}>>(new Map());
  const alivePlayersRef = useRef<string[]>([]);
  const participantCountRef = useRef(0);
  const chatScrollRef = useRef<ScrollView>(null);
  const gameDataRef = useRef<GameData | null>(null);
  const playerHpAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let active = true;
    loadCharacterVisualTunings().then(nextTunings => {
      if (active) {
        setCharacterVisualTunings(nextTunings);
      }
    });
    const unsubscribe = subscribeCharacterVisualTunings(nextTunings => {
      if (active) {
        setCharacterVisualTunings(nextTunings);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const getRaidEffects = useCallback(() => getCharacterSkillEffects(
    selectedCharacterRef.current,
    selectedCharacterDataRef.current,
    {
      mode: 'raid',
      partySize: Math.max(1, participantCountRef.current),
      bossHpRatio: bossHpRef.current / Math.max(1, boss.maxHp),
    },
  ), [boss.maxHp]);

  const getCurrentPieceOptions = useCallback(
    () =>
      mergeSkinPieceGenerationOptions(
        getPieceGenerationOptions(getRaidEffects()),
        activeSkinIdRef.current,
      ),
    [getRaidEffects],
  );

  const triggerBossPose = useCallback((pose: MonsterSpritePose, duration = 220) => {
    if (bossPoseTimerRef.current) {
      clearTimeout(bossPoseTimerRef.current);
    }
    setBossPose(pose);
    bossPoseTimerRef.current = setTimeout(() => {
      setBossPose('idle');
      bossPoseTimerRef.current = null;
    }, duration);
  }, []);

  useEffect(() => {
    return () => {
      if (bossPoseTimerRef.current) {
        clearTimeout(bossPoseTimerRef.current);
      }
    };
  }, []);

  // Initialize
  useEffect(() => {
    let mounted = true;
    resetPieceGenerationHistory();
    comboRef.current = 0;
    linesClearedRef.current = 0;
    feverGaugeRef.current = 0;
    feverActiveRef.current = false;
    setCombo(0);
    setLinesCleared(0);
    setFeverGauge(0);
    setFeverActive(false);
    activeSkinIdRef.current = 0;
    summonGaugeRef.current = 0;
    summonGaugeRequiredRef.current = 0;
    summonAttackRef.current = 0;
    summonActiveRef.current = false;
    summonRemainingMsRef.current = 0;
    summonExpEarnedRef.current = 0;
    skillGaugeRef.current = 0;
    raidSkillLevelsRef.current = {};
    setSummonGauge(0);
    setSummonGaugeRequired(0);
    setSummonAttack(0);
    setSummonActive(false);
    setSummonRemainingMs(0);
    setSummonAttackPulse(0);
    setSummonOverlayVisible(false);
    setSummonReturning(false);
    setSummonSpawnIndex(0);
    setSkillGauge(0);
    setActiveMultiplier(1);
    setRaidSkillLevels({});
    (async () => {
      try {
        const [playerId, nickname] = await withTimeout(
          Promise.all([getPlayerId(), getNickname()]),
          'raid_player_profile',
        );
        playerIdRef.current = playerId;
        nicknameRef.current = nickname;
        gameDataRef.current = await withTimeout(loadGameData(), 'raid_game_data');
        if (mounted && gameDataRef.current) {
          const levels = getRaidSkillLevels(gameDataRef.current.items);
          raidSkillLevelsRef.current = levels;
          setRaidSkillLevels(levels);
        }

        const skinData = await withTimeout(loadSkinData(), 'raid_skin_data');
        setActiveSkin(skinData.activeSkinId);
        activeSkinIdRef.current = skinData.activeSkinId;
        const skinLoadout = getActiveSkinLoadout(skinData);
        summonGaugeRequiredRef.current = skinLoadout.summonGaugeRequired;
        summonAttackRef.current = skinLoadout.summonAttack;
        summonRemainingMsRef.current = skinLoadout.summonDurationMs;
        if (mounted) {
          setSkinBoardBg(getSkinBoardBg());
          setSummonGaugeRequired(skinLoadout.summonGaugeRequired);
          setSummonAttack(skinLoadout.summonAttack);
          setSummonRemainingMs(skinLoadout.summonDurationMs);
        }

        const selectedCharacter = await withTimeout(
          getSelectedCharacter(),
          'raid_selected_character',
        );
        if (selectedCharacter) {
          const characterData = await withTimeout(
            loadCharacterData(selectedCharacter),
            'raid_character_data',
          );
          selectedCharacterRef.current = selectedCharacter;
          selectedCharacterDataRef.current = characterData;
          baseAttackPowerRef.current = getCharacterAtk(selectedCharacter, characterData.level);
          baseMaxPlayerHpRef.current = getCharacterHp(selectedCharacter, characterData.level);
          const effects = getRaidEffects();
          attackPowerRef.current = Math.round(
            baseAttackPowerRef.current *
              effects.baseAttackMultiplier *
              skinLoadout.effects.attackBonusMultiplier,
          );
          const resolvedHp = Math.round(
            baseMaxPlayerHpRef.current * effects.maxHpMultiplier,
          );
          playerHpRef.current = resolvedHp;
          if (mounted) {
            setPlayerHp(resolvedHp);
            setMaxPlayerHp(resolvedHp);
            playerHpAnim.setValue(1);
          }
        }

        // Load vibration setting
        try {
          const settings = await withTimeout(
            AsyncStorage.getItem('gameSettings'),
            'raid_game_settings',
          );
          if (settings) {
            const parsed = JSON.parse(settings);
            if (parsed.vibration === false) vibrationRef.current = false;
          }
        } catch {}

        // Generate first set of pieces
        const skinColors = getSkinColors();
        const difficulty = getDifficulty(Math.min(bossStage, 10));
        const p = generatePlaceablePieces(
          createBoard(),
          difficulty,
          skinColors,
          getCurrentPieceOptions(),
        );
        if (mounted) {
          setPieces(p);
          setRound(1);
        }

        // Get initial instance state
        const {data: instance} = await withTimeout(
          getRaidInstance(instanceId),
          'raid_instance',
        );
        if (mounted && instance) {
          setBossHp(instance.boss_current_hp);
          bossHpRef.current = instance.boss_current_hp;
          startedAtRef.current = new Date(instance.started_at).getTime();
          const expTs = new Date(instance.expires_at).getTime();
          setExpiresAt(expTs + getRaidEffects().raidTimeBonusMs);

          if (!isNormalRaid && Date.now() >= expTs) {
            setTimeExpired(true);
            setFailureReason('time_up');
            setGameOver(true);
            gameOverRef.current = true;
          }
        }

        // Ensure we're a participant
        await withTimeout(
          joinRaidInstance(instanceId, playerIdRef.current, nicknameRef.current),
          'raid_join',
        );

        // Get initial participants
        const {data: parts} = await withTimeout(
          getRaidParticipants(instanceId),
          'raid_participants',
        );
        if (mounted && parts) {
          const partList = parts.map((participant: any, index: number) => ({
            playerId: participant.player_id,
            nickname: participant.nickname,
            totalDamage: participant.total_damage,
            rank: index + 1,
          }));
          setParticipants(partList);
          participantCountRef.current = partList.length;
          // All participants start as alive
          const aliveIds = partList.map(entry => entry.playerId);
          setAlivePlayers(aliveIds);
          alivePlayersRef.current = aliveIds;
        }

        // Set up realtime channel
        const channel = getRaidChannel(instanceId);
        channel
          .on('broadcast', {event: 'damage'}, ({payload}: any) => {
            if (!mounted || !payload) return;
            setBossHp(payload.newBossHp);
            bossHpRef.current = payload.newBossHp;
            setParticipants(prev => {
              const updated = prev.map(entry =>
                entry.playerId === payload.playerId
                  ? {...entry, totalDamage: entry.totalDamage + payload.damage}
                  : entry,
              );
              updated.sort((a, b) => b.totalDamage - a.totalDamage);
              return updated.map((entry, index) => ({...entry, rank: index + 1}));
            });
            if (payload.defeated) {
              setBossDefeated(true);
              setGameOver(true);
              gameOverRef.current = true;
              setSpectatorMode(false);
              spectatorRef.current = false;
            }
          })
          .on('broadcast', {event: 'raid_expired'}, () => {
            if (!mounted || isNormalRaid) return;
            setTimeExpired(true);
            setFailureReason('time_up');
            setGameOver(true);
            gameOverRef.current = true;
            setSpectatorMode(false);
            spectatorRef.current = false;
          })
          .on('broadcast', {event: 'heartbeat'}, () => {})
          // NEW: player_dead - someone's board filled
          .on('broadcast', {event: 'player_dead'}, ({payload}: any) => {
            if (!mounted || !payload) return;
            setAlivePlayers(prev => {
              const next = prev.filter(id => id !== payload.playerId);
              alivePlayersRef.current = next;
              // If no alive players left (excluding self who is already dead/spectating)
              if (next.length === 0 && spectatorRef.current) {
                setGameOver(true);
                gameOverRef.current = true;
                setSpectatorMode(false);
                spectatorRef.current = false;
              }
              return next;
            });
          })
          // NEW: board_state - alive player broadcasts their board
          .on('broadcast', {event: 'board_state'}, ({payload}: any) => {
            if (!mounted || !payload) return;
            remoteBoardsRef.current.set(payload.playerId, {
              board: payload.board,
              nickname: payload.nickname,
            });
            // Update spectator view if watching this player
            if (spectatorRef.current) {
              const aliveList = alivePlayersRef.current.filter(id => id !== playerIdRef.current);
              if (aliveList.length > 0) {
                // use functional state to get current idx
                setSpectatingIdx(idx => {
                  const watchingId = aliveList[idx % aliveList.length];
                  if (watchingId === payload.playerId) {
                    setSpectatorBoard(payload.board);
                    setSpectatorNickname(payload.nickname);
                  }
                  return idx;
                });
              }
            }
          })
          // NEW: chat
          .on('broadcast', {event: 'chat'}, ({payload}: any) => {
            if (!mounted || !payload) return;
            setChatMessages(prev => [
              ...prev.slice(-49),
              {id: `${payload.playerId}-${Date.now()}`, nickname: payload.nickname, text: payload.text},
            ]);
          })
          .subscribe();

        if (mounted) {
          channelRef.current = channel;
        } else {
          supabase.removeChannel(channel);
        }

        // Start heartbeat
        heartbeatTimer.current = setInterval(() => {
          channel.send({
            type: 'broadcast', event: 'heartbeat',
            payload: {playerId: playerIdRef.current},
          });
        }, HEARTBEAT_INTERVAL);
      } catch (e) {
        console.warn('RaidScreen init error:', e);
        if (mounted) {
          Alert.alert(t('common.error'), t('raid.connectionFail'), [
            {text: t('common.goHome'), onPress: () => navigation.replace('Home')},
          ]);
        }
      }
    })();

    return () => {
      mounted = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      if (attackTimer.current) clearInterval(attackTimer.current);
      if (bossAttackTimer.current) clearInterval(bossAttackTimer.current);
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      if (feverTimerRef.current) clearTimeout(feverTimerRef.current);
    };
  }, [bossStage, getCurrentPieceOptions, getRaidEffects, instanceId, isNormalRaid, navigation, playerHpAnim]);

  // 10-minute attack timer
  useEffect(() => {
    if (isNormalRaid) {
      setAttackTimerText('상시 도전');
      return;
    }

    if (expiresAt <= 0) return;
    attackTimer.current = setInterval(() => {
      const remaining = Math.max(0, expiresAt - Date.now());
      setAttackTimerText(formatAttackTimer(remaining));
      if (remaining <= 0 && !gameOverRef.current) {
        setTimeExpired(true);
        setFailureReason('time_up');
        setGameOver(true);
        gameOverRef.current = true;
        setSpectatorMode(false);
        spectatorRef.current = false;
        channelRef.current?.send({
          type: 'broadcast',
          event: 'raid_expired',
          payload: {},
        });
      }
    }, 1000);
    return () => {
      if (attackTimer.current) clearInterval(attackTimer.current);
    };
  }, [expiresAt, isNormalRaid]);

  useEffect(() => {
    if (!selectedCharacterRef.current || !selectedCharacterDataRef.current) {
      return;
    }

    const effects = getRaidEffects();
    attackPowerRef.current = Math.round(
      baseAttackPowerRef.current *
        effects.baseAttackMultiplier *
        getActiveSkinLoadout({
          activeSkinId: activeSkinIdRef.current,
        }).effects.attackBonusMultiplier,
    );
    const nextMaxHp = Math.round(baseMaxPlayerHpRef.current * effects.maxHpMultiplier);
    const hpRatio = playerHpRef.current / Math.max(1, maxPlayerHp || nextMaxHp);
    const adjustedHp = Math.min(nextMaxHp, Math.max(1, Math.round(nextMaxHp * hpRatio)));
    playerHpRef.current = adjustedHp;
    setPlayerHp(adjustedHp);
    setMaxPlayerHp(nextMaxHp);
    Animated.timing(playerHpAnim, {
      toValue: adjustedHp / Math.max(1, nextMaxHp),
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [getRaidEffects, maxPlayerHp, participants.length, playerHpAnim]);

  const animatePlayerHpBar = useCallback((newRatio: number) => {
    Animated.timing(playerHpAnim, {
      toValue: newRatio,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [playerHpAnim]);

  const resetComboTimer = useCallback(() => {
    if (comboTimerRef.current) {
      clearTimeout(comboTimerRef.current);
    }

    comboTimerRef.current = setTimeout(() => {
      comboRef.current = 0;
      setCombo(0);
    }, COMBO_TIMEOUT_MS + getRaidEffects().comboWindowBonusMs);
  }, [getRaidEffects]);

  const activateFever = useCallback(() => {
    setFeverActive(true);
    setFeverGauge(100);
    feverActiveRef.current = true;
    feverGaugeRef.current = 100;

    if (feverTimerRef.current) {
      clearTimeout(feverTimerRef.current);
    }

    feverTimerRef.current = setTimeout(() => {
      setFeverActive(false);
      setFeverGauge(0);
      feverActiveRef.current = false;
      feverGaugeRef.current = 0;
    }, FEVER_DURATION + getRaidEffects().feverDurationBonusMs);
  }, [getRaidEffects]);

  useEffect(() => {
    if (!summonActive || summonRemainingMs <= 0 || gameOver) {
      return;
    }

    const timer = setInterval(() => {
      setSummonRemainingMs(current => {
        const next = Math.max(0, current - 1000);
        summonRemainingMsRef.current = next;
        if (next <= 0) {
          summonActiveRef.current = false;
          setSummonActive(false);
          setSummonReturning(true);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver, summonActive, summonRemainingMs]);

  useEffect(() => {
    if (!gameOver && !bossDefeated && !spectatorMode) {
      return;
    }

    summonActiveRef.current = false;
    setSummonActive(false);
    setSummonReturning(false);
    setSummonOverlayVisible(false);
  }, [bossDefeated, gameOver, spectatorMode]);

  useEffect(() => {
    const effects = getRaidEffects();
    if (
      gameOver ||
      spectatorMode ||
      bossDefeated ||
      effects.autoHealIntervalMs <= 0 ||
      effects.autoHealPercent <= 0
    ) {
      return;
    }

    const timer = setInterval(() => {
      if (gameOverRef.current || spectatorRef.current || bossHpRef.current <= 0) {
        return;
      }

      const maxHp = Math.max(
        1,
        Math.round(baseMaxPlayerHpRef.current * getRaidEffects().maxHpMultiplier),
      );
      if (playerHpRef.current / maxHp > 0.5) {
        return;
      }

      const healAmount = Math.max(1, Math.round(maxHp * effects.autoHealPercent));
      const healedHp = Math.min(maxHp, playerHpRef.current + healAmount);
      if (healedHp === playerHpRef.current) {
        return;
      }

      playerHpRef.current = healedHp;
      setPlayerHp(healedHp);
      animatePlayerHpBar(healedHp / maxHp);
    }, effects.autoHealIntervalMs);

    return () => clearInterval(timer);
  }, [animatePlayerHpBar, bossDefeated, gameOver, getRaidEffects, spectatorMode]);

  // Enter spectator mode helper
  const enterSpectator = useCallback(() => {
    spectatorRef.current = true;
    setSpectatorMode(true);

    // Broadcast that we died
    channelRef.current?.send({
      type: 'broadcast',
      event: 'player_dead',
      payload: {playerId: playerIdRef.current, nickname: nicknameRef.current},
    });

    // Remove self from alive
    setAlivePlayers(prev => {
      const next = prev.filter(id => id !== playerIdRef.current);
      alivePlayersRef.current = next;
      // If nobody else alive, game over
      if (next.length === 0) {
        setGameOver(true);
        gameOverRef.current = true;
        setSpectatorMode(false);
        spectatorRef.current = false;
      } else {
        // Start spectating first alive player
        setSpectatingIdx(0);
        const data = remoteBoardsRef.current.get(next[0]);
        if (data) {
          setSpectatorBoard(data.board);
          setSpectatorNickname(data.nickname);
        } else {
          setSpectatorNickname(next[0].slice(0, 8) + '...');
        }
      }
      return next;
    });
  }, []);

  const applyBossAttack = useCallback(() => {
    if (gameOverRef.current || spectatorRef.current || bossDefeated) {
      return;
    }

    triggerBossPose('attack');

    const effects = getRaidEffects();
    if (shouldDodgeAttack(effects)) {
      return;
    }

    const incomingDamage = applySkinIncomingDamage(
      applyDamageTakenReduction(bossAttackStats.attack, effects),
      activeSkinIdRef.current,
    );
    const rawNextHp = Math.max(0, playerHpRef.current - incomingDamage);
    const nextHp =
      rawNextHp <= 0 && effects.reviveOnce && !reviveUsedRef.current
        ? 1
        : rawNextHp;
    playerHpRef.current = nextHp;
    setPlayerHp(nextHp);
    animatePlayerHpBar(nextHp / Math.max(1, maxPlayerHp));

    if (rawNextHp <= 0 && nextHp === 1) {
      reviveUsedRef.current = true;
      return;
    }

    if (nextHp > 0) {
      return;
    }

    setFailureReason('hp_zero');

    if (participantCountRef.current <= 1) {
      setGameOver(true);
      gameOverRef.current = true;
      return;
    }

    enterSpectator();
  }, [
    animatePlayerHpBar,
    bossAttackStats.attack,
    bossDefeated,
    enterSpectator,
    getRaidEffects,
    maxPlayerHp,
    triggerBossPose,
  ]);

  useEffect(() => {
    if (bossAttackTimer.current) {
      clearInterval(bossAttackTimer.current);
    }
    if (gameOver || spectatorMode || bossDefeated) {
      return;
    }

    bossAttackTimer.current = setInterval(() => {
      applyBossAttack();
    }, bossAttackStats.attackIntervalMs);

    return () => {
      if (bossAttackTimer.current) {
        clearInterval(bossAttackTimer.current);
      }
    };
  }, [
    applyBossAttack,
    bossAttackStats.attackIntervalMs,
    bossDefeated,
    gameOver,
    spectatorMode,
  ]);

  const handlePlace = useCallback(
    (pieceIndex: number, row: number, col: number) => {
      if (gameOverRef.current || spectatorRef.current) return;
      const piece = pieces[pieceIndex];
      if (!piece) return;

      let newBoard = placePiece(board, piece, row, col);
      const blockCount = countBlocks(piece.shape);
      const effects = getRaidEffects();
      const wasSmallPiece = blockCount <= 2;
      smallPieceStreakRef.current = wasSmallPiece ? smallPieceStreakRef.current + 1 : 0;
      const usedSmallPieceStreak = smallPieceStreakRef.current >= 2;
      if (usedSmallPieceStreak) {
        smallPieceStreakRef.current = 0;
      }

      let totalLinesCleared = 0;
      let totalGemsFound = 0;
      const totalItemsFound: string[] = [];
      while (true) {
        const r = checkAndClearLines(newBoard);
        const cl = r.clearedRows.length + r.clearedCols.length;
        if (cl === 0) break;
        newBoard = r.newBoard;
        totalLinesCleared += cl;
        totalGemsFound += r.gemsFound;
        totalItemsFound.push(...r.itemsFound);
      }

      const blocksFromLines = totalLinesCleared * 8;
      const totalBroken = blockCount + blocksFromLines;
      const gaugeBeforeTurn = skillGaugeRef.current;

      setBoard(newBoard);

      const gainedGauge = getRaidSkillGaugeGain(
        totalLinesCleared,
        effects.raidSkillChargeGainMultiplier,
      );

      const turnResult = resolveCombatTurn({
        mode: 'raid',
        blockCount,
        attackPower: Math.round(
          baseAttackPowerRef.current *
            effects.baseAttackMultiplier *
            getActiveSkinLoadout({
              activeSkinId: activeSkinIdRef.current,
            }).effects.attackBonusMultiplier,
        ),
        clearedLines: totalLinesCleared,
        combo: comboRef.current,
        feverActive: feverActiveRef.current,
        feverGauge: feverGaugeRef.current,
        feverLinesRequired: Math.max(1, Math.round(20 * effects.feverRequirementMultiplier)),
        feverGaugeGainMultiplier: effects.feverGaugeGainMultiplier,
      });
      comboRef.current = turnResult.nextCombo;
      setCombo(turnResult.nextCombo);
      linesClearedRef.current += totalLinesCleared;
      setLinesCleared(linesClearedRef.current);
      if (turnResult.didClear) {
        resetComboTimer();
      }

      if (turnResult.feverTriggered) {
        activateFever();
      } else {
        feverGaugeRef.current = turnResult.nextFeverGauge;
        setFeverGauge(turnResult.nextFeverGauge);
      }

      const baseDamage = applyCombatDamageEffects(turnResult.damage, effects, {
        combo: turnResult.nextCombo,
        didClear: turnResult.didClear,
        feverActive: feverActiveRef.current,
        usedSmallPieceStreak,
        isRaid: true,
      });
      const skinDamage = applySkinCombatDamage(baseDamage, activeSkinIdRef.current, {
        combo: turnResult.nextCombo,
        didClear: turnResult.didClear,
      }).damage;
      const skillSpend =
        activeMultiplier > 1
          ? consumeRaidSkillGauge(
            gaugeBeforeTurn,
            activeMultiplier,
            raidSkillLevelsRef.current,
          )
          : {consumed: false, nextGauge: gaugeBeforeTurn, cost: 0};
      const appliedMultiplier = skillSpend.consumed ? activeMultiplier : 1;
      const effectiveMultiplier = getRaidSkillEffectiveMultiplier(
        appliedMultiplier,
        raidSkillLevelsRef.current[appliedMultiplier] ?? 0,
      );
      const summonBonus =
        summonActiveRef.current && summonRemainingMsRef.current > 0
          ? summonAttackRef.current
          : 0;
      const finalDamage = Math.round((skinDamage + summonBonus) * effectiveMultiplier);
      if (summonBonus > 0) {
        summonExpEarnedRef.current += Math.max(1, Math.round(summonBonus / 8));
        setSummonAttackPulse(prev => prev + 1);
      }

      const nextGauge = skillSpend.nextGauge + gainedGauge;
      skillGaugeRef.current = nextGauge;
      setSkillGauge(nextGauge);

      if (skillSpend.consumed) {
        setActiveMultiplier(1);
      }

      if (finalDamage > 0) {
        setPlayerAttackPulse(previous => previous + 1);
        triggerBossPose('hurt', 260);
        setDamageEffect(finalDamage);
        if (finalDamage >= 10) {
          setShowBossHit(true);
        }
        if (vibrationRef.current) Vibration.vibrate(50);
      }

      if (
        effects.placeHealChance > 0 &&
        effects.placeHealPercent > 0 &&
        Math.random() < effects.placeHealChance
      ) {
        const maxHp = Math.max(
          1,
          Math.round(baseMaxPlayerHpRef.current * effects.maxHpMultiplier),
        );
        const healAmount = Math.max(1, Math.round(maxHp * effects.placeHealPercent));
        const healedHp = Math.min(maxHp, playerHpRef.current + healAmount);
        playerHpRef.current = healedHp;
        setPlayerHp(healedHp);
        animatePlayerHpBar(healedHp / maxHp);
      }

      setMyTotalDamage(prev => prev + finalDamage);
      if (activeSkinIdRef.current > 0 && summonGaugeRequiredRef.current > 0 && !summonActiveRef.current) {
        const nextGauge = Math.min(
          summonGaugeRequiredRef.current,
          summonGaugeRef.current +
            getSummonGaugeGain(activeSkinIdRef.current, blockCount, totalLinesCleared),
        );
        summonGaugeRef.current = nextGauge;
        setSummonGauge(nextGauge);
      }
      dealRaidDamage(instanceId, playerIdRef.current, finalDamage, totalBroken)
        .then(result => {
          if (result.data) {
            setBossHp(result.data.newHp);
            bossHpRef.current = result.data.newHp;
            channelRef.current?.send({
              type: 'broadcast',
              event: 'damage',
              payload: {
                playerId: playerIdRef.current,
                nickname: nicknameRef.current,
                damage: finalDamage,
                newBossHp: result.data.newHp,
                defeated: result.data.defeated,
              },
            });
            if (result.data.defeated) {
              setBossDefeated(true);
              setGameOver(true);
              gameOverRef.current = true;
            }
          }
        });

      setParticipants(prev => {
        const updated = prev.map(p =>
          p.playerId === playerIdRef.current
            ? {...p, totalDamage: p.totalDamage + finalDamage}
            : p,
        );
        updated.sort((a, b) => b.totalDamage - a.totalDamage);
        return updated.map((p, i) => ({...p, rank: i + 1}));
      });
      if (gameDataRef.current && (totalGemsFound > 0 || totalItemsFound.length > 0)) {
        collectSpecialBlockRewards(
          gameDataRef.current,
          totalGemsFound,
          totalItemsFound,
        ).then(rewardResult => {
          gameDataRef.current = rewardResult.data;
        });
      }

      const newPieces = [...pieces];
      newPieces[pieceIndex] = null;
      const remaining = newPieces.filter(p => p !== null);
      if (remaining.length === 0) {
        const nextRound = round + 1;
        const difficulty = getDifficulty(Math.min(bossStage + Math.floor(nextRound / 5), 10));
        const fresh = generatePlaceablePieces(
          newBoard,
          difficulty,
          getSkinColors(),
          getCurrentPieceOptions(),
        );
        newPieces[0] = fresh[0];
        newPieces[1] = fresh[1];
        newPieces[2] = fresh[2];
        setRound(nextRound);
      }
      setPieces(newPieces);

      // Broadcast board state for spectators
      channelRef.current?.send({
        type: 'broadcast',
        event: 'board_state',
        payload: {
          playerId: playerIdRef.current,
          nickname: nicknameRef.current,
          board: newBoard,
        },
      });

      // Check if board is full
      setTimeout(() => {
        const active = newPieces.filter(p => p !== null) as Piece[];
        if (!canPlaceAnyPiece(newBoard, active)) {
          if (!gameOverRef.current && !spectatorRef.current) {
            setFailureReason('board_full');
            // Solo: ask to retry
            if (participantCountRef.current <= 1) {
              gameOverRef.current = true;
              setGameOver(true);
              return;
              /* Alert.alert(
                '패배',
                '보드가 가득 찼습니다.\n재도전 하시겠습니까?',
                [
                  {text: '포기', style: 'cancel', onPress: () => {
                    gameOverRef.current = true;
                    setGameOver(true);
                  }},
                  {text: '재도전', onPress: () => doSoloReset()},
                ],
                {cancelable: false},
              ); */
            } else {
              // Team: enter spectator mode
              enterSpectator();
            }
          }
        }
      }, 200);
    },
    [
      activeMultiplier,
      activateFever,
      board,
      bossStage,
      enterSpectator,
      getRaidEffects,
      instanceId,
      pieces,
      resetComboTimer,
      round,
      animatePlayerHpBar,
      getCurrentPieceOptions,
      triggerBossPose,
    ],
  );

  const dragDrop = useDragDrop(board, pieces, boardLayout, handlePlace, true, 1);

  const handleBoardLayout = useCallback(() => {
    setTimeout(() => {
      boardRef.current?.measureInWindow((x: number, y: number) => {
        setBoardLayout({x, y});
      });
    }, 100);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      boardRef.current?.measureInWindow((x: number, y: number) => {
        setBoardLayout({x, y});
      });
    }, 500);
  }, [round]);

  const handleSelectSkill = useCallback((multiplier: number) => {
    setActiveMultiplier(multiplier);
  }, []);

  const skillCharges = getRaidSkillCharges(skillGauge, raidSkillLevels);

  const handleToggleSummon = useCallback(() => {
    if (summonGaugeRequiredRef.current <= 0 || summonRemainingMsRef.current <= 0) {
      return;
    }

    if (!summonActiveRef.current && summonGaugeRef.current < summonGaugeRequiredRef.current) {
      return;
    }

    if (!summonActiveRef.current) {
      summonGaugeRef.current = 0;
      setSummonGauge(0);
      setSummonSpawnIndex(Math.floor(Math.random() * SUMMON_SPAWN_POINTS));
      setSummonReturning(false);
      setSummonOverlayVisible(true);
      summonActiveRef.current = true;
      setSummonActive(true);
      return;
    }

    summonActiveRef.current = false;
    setSummonActive(false);
    setSummonReturning(true);
  }, []);

  // Spectator navigation
  const cycleSpectator = useCallback((dir: number) => {
    const aliveList = alivePlayersRef.current.filter(id => id !== playerIdRef.current);
    if (aliveList.length === 0) return;
    setSpectatingIdx(prev => {
      const next = (prev + dir + aliveList.length) % aliveList.length;
      const playerId = aliveList[next];
      const data = remoteBoardsRef.current.get(playerId);
      if (data) {
        setSpectatorBoard(data.board);
        setSpectatorNickname(data.nickname);
      } else {
        // Find nickname from participants
        setSpectatorNickname(playerId.slice(0, 8));
      }
      return next;
    });
  }, []);

  // Send chat
  const handleSendChat = useCallback(() => {
    const text = chatInput.trim();
    if (!text || text.length > 100) return;
    channelRef.current?.send({
      type: 'broadcast',
      event: 'chat',
      payload: {playerId: playerIdRef.current, nickname: nicknameRef.current, text},
    });
    setChatMessages(prev => [
      ...prev.slice(-49),
      {id: `${playerIdRef.current}-${Date.now()}`, nickname: nicknameRef.current, text},
    ]);
    setChatInput('');
    setTimeout(() => chatScrollRef.current?.scrollToEnd({animated: true}), 100);
  }, [chatInput]);

  // Calculate and apply rewards when boss is defeated
  const processRewards = useCallback(async () => {
    if (rewardCollected) return;

    if (isNormalRaid) {
      const normalRaidProgress = await loadNormalRaidProgress();
      const preview = getNormalRaidRewardPreview(bossStage, normalRaidProgress);
      const rewardTotals = applyRewardMultipliers(0, preview.diamonds, getRaidEffects());
      setRewardData({
        gold: 0,
        diamonds: rewardTotals.diamonds,
        items: {},
        rankMultiplier: 1,
        rank: 1,
        skinUnlocked: preview.unlocksSkin ? bossStage : null,
        titlesUnlocked: [],
      });
      return;
    }

    await new Promise<void>(resolve => setTimeout(resolve, 500));
    const {data: finalParts} = await getRaidParticipants(instanceId);
    let myRank = 1;
    if (finalParts) {
      const sorted = finalParts.sort((a: any, b: any) => b.total_damage - a.total_damage);
      const idx = sorted.findIndex((p: any) => p.player_id === playerIdRef.current);
      if (idx >= 0) myRank = idx + 1;
      setParticipants(sorted.map((p: any, i: number) => ({
        playerId: p.player_id,
        nickname: p.nickname,
        totalDamage: p.total_damage,
        rank: i + 1,
      })));
    }
    const codexData = await loadCodexData();
    const firstDefeat = !codexData[bossStage];
    const reward = calculateRewards(bossStage, myRank, firstDefeat);
    const existingTitles = await loadUnlockedTitles();
    const defeatedBosses = Object.keys(codexData).map(Number);
    if (firstDefeat) defeatedBosses.push(bossStage);
    const newTitles = checkNewTitles(existingTitles, defeatedBosses, myRank === 1, myTotalDamage);
    reward.titlesUnlocked = newTitles;
    const rewardTotals = applyRewardMultipliers(reward.gold, reward.diamonds, getRaidEffects());
    reward.gold = applySkinRewardBonuses(rewardTotals.gold, activeSkinIdRef.current);
    reward.diamonds = rewardTotals.diamonds;
    setRewardData(reward);
  }, [bossStage, getRaidEffects, instanceId, isNormalRaid, myTotalDamage, rewardCollected]);

  useEffect(() => {
    if (bossDefeated && !rewardData && !rewardCollected) {
      processRewards();
    }
  }, [bossDefeated, rewardData, rewardCollected, processRewards]);

  const handleCollectReward = async () => {
    if (!rewardData || rewardCollected) return;
    setRewardCollected(true);
    let data = await loadGameData();

    if (isNormalRaid) {
      const progress = await loadNormalRaidProgress();
      const preview = getNormalRaidRewardPreview(bossStage, progress);
      const updatedProgress = await recordNormalRaidKill(progress, bossStage);
      if (preview.firstClearReward) {
        await claimFirstClearDia(updatedProgress, bossStage);
      }
      setRewardData(current =>
        current
          ? {
              ...current,
              diamonds: preview.diamonds,
              skinUnlocked: preview.unlocksSkin ? bossStage : null,
            }
          : current,
      );
    }

    data = await addGold(data, rewardData.gold);
    data = await addDiamonds(data, rewardData.diamonds);
    for (const [key, count] of Object.entries(rewardData.items)) {
      for (let i = 0; i < count; i++) {
        data = await addItem(data, key as any, 1);
      }
    }
    if (rewardData.skinUnlocked !== null) {
      await unlockSkin(rewardData.skinUnlocked);
    }
    if (rewardData.titlesUnlocked.length > 0) {
      const existing = await loadUnlockedTitles();
      await saveUnlockedTitles([...existing, ...rewardData.titlesUnlocked]);
    }
    if (activeSkinIdRef.current > 0 && summonExpEarnedRef.current > 0) {
      await gainSummonExp(activeSkinIdRef.current, summonExpEarnedRef.current);
    }
    const clearTimeMs = startedAtRef.current > 0 ? Date.now() - startedAtRef.current : undefined;
    await updateLocalCodex(bossStage, myTotalDamage, clearTimeMs);
    try {
      await upsertCodexEntry(playerIdRef.current, bossStage, myTotalDamage, clearTimeMs);
    } catch {}
    navigation.replace('Home');
  };

  const getResultText = () => {
    if (bossDefeated) return t('raid.defeated');
    if (timeExpired || failureReason === 'time_up') return t('raid.timeUp');
    if (failureReason === 'hp_zero') return t('raid.hpDepleted');
    return t('raid.boardFull');
  };

  const bossSpriteSet = getRaidBossSpriteSet(boss.stage);
  const bossSprite =
    getMonsterPoseSource(bossSpriteSet, bossPose) ??
    getMonsterPoseSource(bossSpriteSet, 'idle');
  const summonSpriteSet = getRaidSummonSpriteSet(bossStage);
  useEffect(() => {
    setBossPose('idle');
  }, [boss.stage]);
  const hasSummon = activeSkinIdRef.current > 0 && summonGaugeRequired > 0;
  const summonButtonDisabled =
    !hasSummon ||
    ((summonGauge < summonGaugeRequired && !summonActive) || summonRemainingMs <= 0);
  const myRaidVisual =
    RAID_CHARACTER_VISUALS[selectedCharacterRef.current ?? 'knight'] ??
    RAID_CHARACTER_VISUALS.knight;
  const myRaidPortrait = selectedCharacterRef.current
    ? RAID_CHARACTER_PORTRAITS[selectedCharacterRef.current]
    : null;
  const allyParticipants = participants.filter(
    participant => participant.playerId !== playerIdRef.current,
  );
  const normalRaidSlots = [
    allyParticipants[0] ?? null,
    allyParticipants[1] ?? null,
    allyParticipants[2] ?? null,
    allyParticipants[3] ?? null,
  ];

  const handleSummonOverlayDone = useCallback(() => {
    setSummonReturning(false);
    setSummonOverlayVisible(false);
  }, []);

  const renderSummonOverlay = (compact: boolean) => (
    <RaidSummonOverlay
      visible={summonOverlayVisible}
      returning={summonReturning}
      attackPulse={summonAttackPulse}
      spawnIndex={summonSpawnIndex}
      spriteSet={summonSpriteSet}
      compact={compact}
      onReturnDone={handleSummonOverlayDone}
    />
  );

  const renderRaidPlayerSprite = (compact: boolean) => (
    <View
      pointerEvents="none"
      style={[
        styles.raidPlayerSpriteDock,
        compact && styles.raidPlayerSpriteDockCompact,
      ]}>
      {(() => {
        const characterId = selectedCharacterRef.current ?? 'knight';
        const tuning =
          characterVisualTunings[
            characterId as keyof typeof characterVisualTunings
          ] ?? characterVisualTunings.knight;
        const battleTransform = {
          transform: [
            {translateX: tuning.battleOffsetX},
            {translateY: tuning.battleOffsetY},
            {scale: tuning.battleScaleMultiplier},
          ],
        };

        if (selectedCharacterRef.current === 'knight') {
          return (
            <View style={battleTransform}>
              <KnightSprite
                size={compact ? 40 : 44}
                attackPulse={playerAttackPulse}
                facing={-1}
              />
            </View>
          );
        }

        if (myRaidPortrait) {
          return (
            <View style={battleTransform}>
              <Image
                source={myRaidPortrait}
                resizeMode="contain"
                fadeDuration={0}
                style={[
                  styles.raidPlayerSpriteImage,
                  compact && styles.raidPlayerSpriteImageCompact,
                ]}
              />
            </View>
          );
        }

        return (
          <View style={battleTransform}>
            <Text style={styles.raidPlayerSpriteEmoji}>{myRaidVisual.emoji}</Text>
          </View>
        );
      })()}
    </View>
  );

  const renderTopStatusRow = (compact: boolean) => (
    <View style={[styles.topStatusRow, compact && styles.topStatusRowCompact]}>
      <View style={[styles.statusPanel, styles.statusPanelHp, compact && styles.statusPanelCompact]}>
        <View style={styles.playerStatusHeader}>
          <Text style={styles.playerStatusText}>
            {t('raid.myHp', playerHp, maxPlayerHp)}
          </Text>
          <Text style={styles.playerStatusText}>
            {t('raid.bossAttack', bossAttackStats.attack)}
          </Text>
        </View>
        <View style={styles.playerHpBarBg}>
          <Animated.View
            style={[
              styles.playerHpBarFill,
              {
                width: playerHpAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        </View>
        <View style={styles.playerMetaRow}>
          <Text style={styles.playerMetaText}>
            {`${t('game.combo')}: ${combo > 0 ? `x${combo}` : '-'}`}
          </Text>
          <Text style={styles.playerMetaText}>
            {`${t('game.lines')}: ${linesCleared}`}
          </Text>
          <Text
            style={[
              styles.playerMetaText,
              feverActive && styles.playerMetaTextActive,
            ]}>
            {feverActive ? t('game.feverActive') : `${t('game.fever')} ${feverGauge}%`}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.statusPanel,
          styles.statusPanelSummon,
          compact && styles.statusPanelCompact,
          !hasSummon && styles.statusPanelSummonDisabled,
        ]}>
        <View style={styles.summonHeader}>
          <Text style={styles.summonTitle}>소환수</Text>
          <Text style={styles.summonMeta}>
            {hasSummon
              ? `${summonSpriteSet?.name ?? 'Summon'} · 공격 ${summonAttack}`
              : '미장착'}
          </Text>
        </View>
        <View style={styles.summonBarBg}>
          <View
            style={[
              styles.summonBarFill,
              {
                width: `${summonGaugeRequired > 0 ? (summonGauge / summonGaugeRequired) * 100 : 0}%`,
              },
            ]}
          />
        </View>
        <View style={styles.summonFooter}>
          <Text style={styles.summonMeta}>
            {hasSummon
              ? `게이지 ${summonGauge}/${summonGaugeRequired || '-'} · ${Math.ceil(
                summonRemainingMs / 1000,
              )}초`
              : '활성 스킨 없음'}
          </Text>
          <TouchableOpacity
            onPress={handleToggleSummon}
            disabled={summonButtonDisabled}
            style={[
              styles.summonBtn,
              summonActive && styles.summonBtnActive,
              summonButtonDisabled && styles.summonBtnDisabled,
            ]}>
            <Text style={styles.summonBtnText}>
              {summonActive ? '회수' : '소환'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderNormalRaidSlot = (
    participant: RaidParticipant | null,
    side: 'left' | 'right',
    slotIndex: number,
  ) => {
    const isMe = participant?.playerId === playerIdRef.current;
    const avatarLabel = isMe
      ? myRaidVisual.emoji
      : participant?.nickname?.trim().slice(0, 1) || '•';
    const displayName = participant
      ? isMe
        ? myRaidVisual.name
        : participant.nickname
      : '대기중';

    return (
      <View
        key={`${side}-${slotIndex}-${participant?.playerId ?? 'empty'}`}
        style={[
          styles.normalRaidPartySlot,
          side === 'left' ? styles.normalRaidPartySlotLeft : styles.normalRaidPartySlotRight,
          !participant && styles.normalRaidPartySlotEmpty,
        ]}>
        <View
          style={[
            styles.normalRaidAvatarOrb,
            isMe && styles.normalRaidAvatarOrbMe,
            !participant && styles.normalRaidAvatarOrbEmpty,
          ]}>
          <Text style={styles.normalRaidAvatarText}>{avatarLabel}</Text>
        </View>
        <Text numberOfLines={1} style={styles.normalRaidAvatarName}>
          {displayName}
        </Text>
        {false && (
          <View pointerEvents="none" style={styles.normalRaidTimerCover}>
            <Text style={styles.normalRaidTimerCoverText}>일반 레이드</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Attack timer */}
      <View style={styles.timerBar}>
        <Text style={[
          styles.timerText,
          !isNormalRaid && expiresAt - Date.now() < 60000 && styles.timerTextDanger,
        ]}>
          {isNormalRaid ? `일반 레이드 · ${attackTimerText}` : `보스 레이드 · ${attackTimerText}`}
        </Text>
      </View>

      {isNormalRaid ? (
        <>
          <View style={styles.normalRaidHeader}>
            <View style={styles.normalRaidPartyColumn}>
              {renderNormalRaidSlot(normalRaidSlots[0], 'left', 0)}
              {renderNormalRaidSlot(normalRaidSlots[1], 'left', 1)}
            </View>

            <View style={styles.normalRaidBossCard}>
              <Text style={[styles.normalRaidBossName, {color: boss.color}]}>
                {t(boss.nameKey)}
              </Text>
              <View style={[styles.normalRaidBossOrb, {borderColor: boss.color}]}>
                {bossSprite ? (
                  <Image
                    source={bossSprite}
                    resizeMode="contain"
                    fadeDuration={0}
                    style={[
                      styles.normalRaidBossSprite,
                      {transform: [{scaleX: bossSpriteSet?.facing ?? 1}]},
                    ]}
                  />
                ) : (
                  <Text style={styles.normalRaidBossEmoji}>{boss.emoji}</Text>
                )}
                {showBossHit && damageEffect !== null && (
                  <DamageFlash
                    damage={damageEffect}
                    onDone={() => {
                      setDamageEffect(null);
                      setShowBossHit(false);
                    }}
                  />
                )}
              </View>
              <View pointerEvents="none" style={styles.normalRaidBossOverlayHost}>
                {renderSummonOverlay(true)}
              </View>
              {renderRaidPlayerSprite(true)}
              <View style={styles.normalRaidBossHpTrack}>
                <View
                  style={[
                    styles.normalRaidBossHpFill,
                    {width: `${Math.max(0, (bossHp / Math.max(1, boss.maxHp)) * 100)}%`},
                    bossHp / Math.max(1, boss.maxHp) > 0.5
                      ? styles.normalRaidBossHpFillHigh
                      : bossHp / Math.max(1, boss.maxHp) > 0.25
                        ? styles.normalRaidBossHpFillMid
                        : styles.normalRaidBossHpFillLow,
                  ]}
                />
              </View>
              <Text style={styles.normalRaidBossHpText}>
                {bossHp.toLocaleString()} / {boss.maxHp.toLocaleString()}
              </Text>
            </View>

            <View style={styles.normalRaidPartyColumn}>
              {renderNormalRaidSlot(normalRaidSlots[2], 'right', 2)}
              {renderNormalRaidSlot(normalRaidSlots[3], 'right', 3)}
            </View>
          </View>

          {renderTopStatusRow(true)}
        </>
      ) : (
        <>
          <BossDisplay
            bossName={t(boss.nameKey)}
            bossEmoji={boss.emoji}
            bossColor={boss.color}
            currentHp={bossHp}
            maxHp={boss.maxHp}
            stage={boss.stage}
            participants={participants
              .slice(0, 30)
              .map(p => ({
                rank: p.rank,
                nickname: p.nickname,
                totalDamage: p.totalDamage,
              }))}
            expandedStandings={standingsExpanded}
            onToggleStandings={() => setStandingsExpanded(prev => !prev)}
            showHit={showBossHit}
            hitDamage={damageEffect || 0}
            onHitDone={() => setShowBossHit(false)}
            overlay={renderSummonOverlay(false)}
            bossPose={bossPose}
            playerOverlay={renderRaidPlayerSprite(false)}
          />

          {renderTopStatusRow(false)}
        </>
      )}

      {false && activeSkinIdRef.current > 0 && (
        <View style={[styles.summonCard, isNormalRaid && styles.summonCardCompact]}>
          <View style={styles.summonHeader}>
            <Text style={styles.summonTitle}>소환수</Text>
            <Text style={styles.summonMeta}>
              공격 {summonAttack} / 남은 시간 {Math.ceil(summonRemainingMs / 1000)}초
            </Text>
          </View>
          <View style={styles.summonBarBg}>
            <View
              style={[
                styles.summonBarFill,
                {
                  width: `${summonGaugeRequired > 0 ? (summonGauge / summonGaugeRequired) * 100 : 0}%`,
                },
              ]}
            />
          </View>
          <View style={styles.summonFooter}>
            <Text style={styles.summonMeta}>
              게이지 {summonGauge}/{summonGaugeRequired || '-'}
            </Text>
            <TouchableOpacity
              onPress={handleToggleSummon}
              disabled={
                (summonGauge < summonGaugeRequired && !summonActive) || summonRemainingMs <= 0
              }
              style={[
                styles.summonBtn,
                summonActive && styles.summonBtnActive,
                (summonRemainingMs <= 0 ||
                  (summonGauge < summonGaugeRequired && !summonActive)) &&
                  styles.summonBtnDisabled,
              ]}>
              <Text style={styles.summonBtnText}>{summonActive ? '회수' : '소환'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Skill bar (hidden in spectator) */}
      {!spectatorMode && (
        <SkillBar
          currentGauge={skillGauge}
          charges={skillCharges}
          activeMultiplier={activeMultiplier}
          skillLevels={raidSkillLevels}
          onSelectSkill={handleSelectSkill}
          disabled={gameOverRef.current}
        />
      )}

      {/* Damage info */}
      <View style={[styles.infoBar, isNormalRaid && styles.infoBarCompact]}>
        <Text style={styles.infoText}>{t('raid.yourDamage', myTotalDamage)}</Text>
        <Text style={styles.infoText}>
          {spectatorMode ? '관전 모드' : `${t('raid.gauge')}: ${skillGauge}`}
        </Text>
      </View>

      {/* Main content: Board or Spectator view */}
      {spectatorMode ? (
        <KeyboardAvoidingView
          style={styles.flexFill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Spectator navigation */}
          <View style={styles.spectatorNav}>
            <TouchableOpacity onPress={() => cycleSpectator(-1)} style={styles.arrowBtn}>
              <Text style={styles.arrowText}>◀</Text>
            </TouchableOpacity>
            <Text style={styles.spectatorLabel}>{spectatorNickname}</Text>
            <TouchableOpacity onPress={() => cycleSpectator(1)} style={styles.arrowBtn}>
              <Text style={styles.arrowText}>▶</Text>
            </TouchableOpacity>
          </View>

          {/* Spectator board (read-only) */}
          <View style={styles.boardContainer}>
            <Board board={spectatorBoard} compact />
          </View>

          {/* Chat panel */}
          <View style={styles.chatPanel}>
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatScroll}
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({animated: true})}>
              {chatMessages.length === 0 && (
                <Text style={styles.chatEmpty}>채팅을 시작하세요</Text>
              )}
              {chatMessages.map(m => (
                <View key={m.id} style={styles.chatRow}>
                  <Text style={styles.chatNick}>{m.nickname}</Text>
                  <Text style={styles.chatText}>{m.text}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatTextInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="메시지 입력..."
                placeholderTextColor="#64748b"
                maxLength={100}
                returnKeyType="send"
                onSubmitEditing={handleSendChat}
              />
              <TouchableOpacity onPress={handleSendChat} style={styles.chatSendBtn}>
                <Text style={styles.chatSendText}>전송</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <>
          {/* Board */}
          <View
            style={[styles.boardContainer, isNormalRaid && styles.boardContainerCompact]}
            onLayout={handleBoardLayout}>
            <Board
              ref={boardRef}
              board={board}
              backgroundColor={skinBoardBg}
              compact
              previewCells={dragDrop.previewCells}
              invalidPreview={dragDrop.invalidPreview}
              clearGuideCells={dragDrop.clearGuideCells}
            />
          </View>

          {/* Piece Selector */}
          <PieceSelector
            pieces={pieces}
            onDragStart={dragDrop.onDragStart}
            onDragMove={dragDrop.onDragMove}
            onDragEnd={dragDrop.onDragEnd}
            onDragCancel={dragDrop.onDragCancel}
            compact
          />
        </>
      )}

      {/* Damage flash effect */}
      {damageEffect !== null && !isNormalRaid && (
        <DamageFlash damage={damageEffect} onDone={() => setDamageEffect(null)} />
      )}

      {/* Boss defeated - reward popup */}
      {bossDefeated && rewardData && !rewardCollected && (
        <RaidRewardPopup
          reward={rewardData}
          bossName={t(boss.nameKey)}
          onCollect={handleCollectReward}
        />
      )}

      {/* Non-victory game over (time up / all dead) - NOT shown in spectator */}
      {gameOver && !bossDefeated && !spectatorMode && (
        <View style={styles.overlay}>
          <Text style={styles.resultText}>{getResultText()}</Text>
          <Text style={styles.resultDamage}>{t('raid.yourDamage', myTotalDamage)}</Text>

          <View style={styles.finalRankings}>
            {participants.slice(0, 10).map((p, i) => (
              <View key={p.playerId} style={styles.finalRankRow}>
                <Text style={styles.finalRankNum}>{i + 1}.</Text>
                <Text style={[
                  styles.finalRankName,
                  p.playerId === playerIdRef.current && styles.finalRankNameMe,
                ]}>
                  {p.nickname}
                </Text>
                <Text style={styles.finalRankDmg}>{p.totalDamage}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.exitBtn}
            onPress={() => navigation.replace('Home')}>
            <Text style={styles.exitBtnText}>{t('common.goHome')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading overlay */}
      {pieces.length === 0 && !gameOver && !spectatorMode && (
        <View style={styles.overlay}>
          <Text style={styles.waitingText}>{t('battle.preparing')}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#1a0a3e'},
  timerBar: {
    alignItems: 'center',
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  timerText: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: '900',
  },
  timerTextDanger: {
    color: '#ef4444',
  },
  normalRaidTimerCover: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  normalRaidTimerCoverText: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: '900',
  },
  flexFill: {
    flex: 1,
  },
  normalRaidHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 6,
    marginHorizontal: 10,
    marginBottom: 4,
  },
  normalRaidPartyColumn: {
    width: 72,
    justifyContent: 'space-between',
    gap: 6,
  },
  normalRaidPartySlot: {
    flex: 1,
    minHeight: 56,
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
    gap: 4,
  },
  normalRaidPartySlotLeft: {
    alignItems: 'flex-end',
  },
  normalRaidPartySlotRight: {
    alignItems: 'flex-start',
  },
  normalRaidPartySlotEmpty: {
    opacity: 0.55,
  },
  normalRaidAvatarOrb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(99,102,241,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(165,180,252,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  normalRaidAvatarOrbMe: {
    backgroundColor: 'rgba(56,189,248,0.22)',
    borderColor: 'rgba(56,189,248,0.82)',
  },
  normalRaidAvatarOrbEmpty: {
    backgroundColor: 'rgba(51,65,85,0.4)',
    borderColor: 'rgba(100,116,139,0.45)',
  },
  normalRaidAvatarText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
  },
  normalRaidAvatarName: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '700',
    maxWidth: '100%',
  },
  normalRaidBossCard: {
    flex: 1,
    minHeight: 98,
    backgroundColor: 'rgba(15,10,46,0.52)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(71,85,105,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  normalRaidBossName: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  normalRaidBossOrb: {
    width: 86,
    height: 86,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  normalRaidBossSprite: {
    width: 78,
    height: 78,
  },
  normalRaidBossOverlayHost: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
  raidPlayerSpriteDock: {
    position: 'absolute',
    right: 2,
    bottom: 20,
    width: 54,
    height: 68,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
    zIndex: 3,
  },
  raidPlayerSpriteDockCompact: {
    right: 0,
    bottom: 18,
    width: 46,
    height: 60,
  },
  raidPlayerSpriteImage: {
    width: '100%',
    height: '100%',
  },
  raidPlayerSpriteImageCompact: {
    width: '100%',
    height: '100%',
  },
  raidPlayerSpriteEmoji: {
    fontSize: 34,
  },
  normalRaidBossOrbHit: {
    shadowColor: '#f87171',
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },
  normalRaidBossEmoji: {
    fontSize: 28,
  },
  normalRaidBossHpTrack: {
    width: '100%',
    height: 7,
    backgroundColor: '#111827',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 6,
  },
  normalRaidBossHpFill: {
    height: 7,
    borderRadius: 999,
  },
  normalRaidBossHpFillHigh: {
    backgroundColor: '#22c55e',
  },
  normalRaidBossHpFillMid: {
    backgroundColor: '#f59e0b',
  },
  normalRaidBossHpFillLow: {
    backgroundColor: '#ef4444',
  },
  normalRaidBossHpText: {
    color: '#e2e8f0',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 3,
  },
  topStatusRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 6,
  },
  topStatusRowCompact: {
    marginHorizontal: 10,
    marginBottom: 4,
  },
  statusPanel: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPanelCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusPanelHp: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(59,130,246,0.5)',
  },
  statusPanelSummon: {
    backgroundColor: '#1f2937',
    borderColor: '#475569',
  },
  statusPanelSummonDisabled: {
    opacity: 0.75,
  },
  playerStatusCard: {
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.5)',
  },
  playerStatusCardCompact: {
    marginHorizontal: 10,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  playerStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  playerStatusText: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '700',
  },
  playerHpBarBg: {
    height: 10,
    backgroundColor: '#1e293b',
    borderRadius: 5,
    overflow: 'hidden',
  },
  playerHpBarFill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#38bdf8',
  },
  playerMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  playerMetaText: {
    color: '#bfdbfe',
    fontSize: 11,
    fontWeight: '700',
  },
  playerMetaTextActive: {
    color: '#fbbf24',
  },
  summonCard: {
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
    gap: 8,
  },
  summonCardCompact: {
    marginHorizontal: 10,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  summonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  summonTitle: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
  },
  summonMeta: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  summonBarBg: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 999,
    overflow: 'hidden',
  },
  summonBarFill: {
    height: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 999,
  },
  summonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  summonBtn: {
    backgroundColor: '#4338ca',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  summonBtnActive: {
    backgroundColor: '#16a34a',
  },
  summonBtnDisabled: {
    backgroundColor: '#475569',
  },
  summonBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  infoBarCompact: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 2,
  },
  infoText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  boardContainer: {
    flex: 1,
    flexShrink: 1,
    minHeight: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
  boardContainerCompact: {
    paddingTop: 0,
    paddingBottom: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultText: {color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center'},
  resultDamage: {color: '#fbbf24', fontSize: 18, fontWeight: '800', marginTop: 12},
  finalRankings: {
    marginTop: 20, width: '100%', maxWidth: 300,
    backgroundColor: 'rgba(30,27,75,0.8)', borderRadius: 12, padding: 16,
  },
  finalRankRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 4,
  },
  finalRankNum: {color: '#94a3b8', fontSize: 14, fontWeight: '800', width: 24},
  finalRankName: {color: '#e2e8f0', fontSize: 14, fontWeight: '600', flex: 1},
  finalRankNameMe: {color: '#fbbf24'},
  finalRankDmg: {color: '#f87171', fontSize: 14, fontWeight: '800'},
  exitBtn: {
    marginTop: 24, backgroundColor: '#6366f1',
    paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12,
  },
  exitBtnText: {color: '#fff', fontSize: 18, fontWeight: '800'},
  waitingText: {color: '#e2e8f0', fontSize: 18, fontWeight: '600'},
  damageFlash: {
    position: 'absolute', top: '25%', alignSelf: 'center',
    backgroundColor: 'rgba(239,68,68,0.9)',
    borderRadius: 16, paddingHorizontal: 24, paddingVertical: 10,
  },
  damageFlashText: {color: '#fff', fontSize: 28, fontWeight: '900'},
  // Spectator styles
  spectatorNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 16,
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99,102,241,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: '#a5b4fc',
    fontSize: 18,
    fontWeight: '900',
  },
  spectatorLabel: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '800',
    minWidth: 100,
    textAlign: 'center',
  },
  // Chat styles
  chatPanel: {
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  chatScroll: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  chatEmpty: {
    color: '#475569',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  chatRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    gap: 6,
  },
  chatNick: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '700',
  },
  chatText: {
    color: '#e2e8f0',
    fontSize: 12,
    flex: 1,
  },
  chatInputRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
    alignItems: 'center',
  },
  chatTextInput: {
    flex: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    paddingHorizontal: 14,
    color: '#e2e8f0',
    fontSize: 13,
  },
  chatSendBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  chatSendText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
