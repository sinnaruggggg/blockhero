import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type ActiveRun,
  type AppState,
  createInitialState,
} from './blockhero_state';
import {createEmptyBoard} from './puzzle_engine';

const STORAGE_KEY = 'blockhero/prototype/state/v1';
const STATE_VERSION = 1;

interface PersistedEnvelope {
  version: number;
  savedAtMs: number;
  state: AppState;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function createFallbackActiveRun(): ActiveRun {
  return {
    id: 0,
    mode: 'level',
    title: 'Recovered run',
    subtitle: '',
    board: createEmptyBoard(),
    pieces: [],
    upcomingPieces: [],
    previewCount: 0,
    pieceGeneration: {},
    selectedPieceId: null,
    selectedTool: 'place',
    combo: {
      comboCount: 0,
      comboStartedAtMs: null,
      lastClearAtMs: null,
      expiresAtMs: null,
    },
    fever: {
      lineGauge: 0,
      requirement: 20,
      active: false,
      startedAtMs: null,
      endsAtMs: null,
    },
    playerHp: 1,
    playerMaxHp: 1,
    enemyHp: null,
    enemyMaxHp: null,
    enemyAttack: 0,
    attackCountdown: 0,
    attackCountdownMax: 0,
    score: 0,
    earnedGold: 0,
    earnedDiamonds: 0,
    totalClearedLines: 0,
    lobbyChat: [],
    voiceEnabled: false,
    partySummary: [],
    logs: [],
    ended: false,
    victory: false,
    nextEndlessRewardScore: null,
    nextEndlessRewardGold: null,
    equippedSkinId: null,
    summonId: null,
    summonGauge: 0,
    summonGaugeRequired: 100,
    summonActive: false,
    summonRemainingMs: 0,
    summonAttack: 0,
    summonExpEarned: 0,
    lastTickAtMs: null,
    raidStandings: [],
  };
}

function sanitizeActiveRun(value: unknown): ActiveRun | null {
  if (!isObject(value)) {
    return null;
  }

  const fallback = createFallbackActiveRun();
  const run = value as unknown as Partial<ActiveRun>;

  return {
    ...fallback,
    ...run,
    board: Array.isArray(run.board) ? run.board : fallback.board,
    pieces: Array.isArray(run.pieces) ? run.pieces : fallback.pieces,
    upcomingPieces: Array.isArray(run.upcomingPieces) ? run.upcomingPieces : fallback.upcomingPieces,
    lobbyChat: Array.isArray(run.lobbyChat) ? run.lobbyChat : fallback.lobbyChat,
    partySummary: Array.isArray(run.partySummary) ? run.partySummary : fallback.partySummary,
    logs: Array.isArray(run.logs) ? run.logs : fallback.logs,
    pieceGeneration:
      typeof run.pieceGeneration === 'object' && run.pieceGeneration !== null
        ? run.pieceGeneration
        : fallback.pieceGeneration,
    raidStandings: Array.isArray(run.raidStandings) ? run.raidStandings : fallback.raidStandings,
  };
}

export function mergePersistedState(snapshot: unknown): AppState {
  const base = createInitialState();

  if (!isObject(snapshot)) {
    return base;
  }

  const player = isObject(snapshot.player) ? snapshot.player : {};
  const characters = isObject(player.characters) ? player.characters : {};
  const inventory = isObject(player.inventory) ? player.inventory : {};

  return {
    ...base,
    ...snapshot,
    player: {
      ...base.player,
      ...player,
      characters: {
        ...base.player.characters,
        ...(characters as AppState['player']['characters']),
      },
      inventory: {
        ...base.player.inventory,
        ...(inventory as AppState['player']['inventory']),
      },
      clearedStageIds: Array.isArray(player.clearedStageIds)
        ? (player.clearedStageIds as number[])
        : base.player.clearedStageIds,
      normalRaidClearCounts: isObject(player.normalRaidClearCounts)
        ? (player.normalRaidClearCounts as Record<number, number>)
        : base.player.normalRaidClearCounts,
      unlockedSkinIds: Array.isArray(player.unlockedSkinIds)
        ? (player.unlockedSkinIds as string[])
        : base.player.unlockedSkinIds,
    },
    raidLobbyMessages: Array.isArray(snapshot.raidLobbyMessages)
      ? snapshot.raidLobbyMessages
      : base.raidLobbyMessages,
    activeRun: sanitizeActiveRun(snapshot.activeRun),
  };
}

export async function loadPersistedAppState(): Promise<AppState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PersistedEnvelope;
    if (!isObject(parsed) || parsed.version !== STATE_VERSION) {
      return null;
    }

    return mergePersistedState(parsed.state);
  } catch {
    return null;
  }
}

export async function persistAppState(state: AppState): Promise<boolean> {
  try {
    const payload: PersistedEnvelope = {
      version: STATE_VERSION,
      savedAtMs: Date.now(),
      state,
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export async function clearPersistedAppState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage clear failures in prototype mode.
  }
}
