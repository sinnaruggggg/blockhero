const RAID_LOBBY_CORE_TTL_MS = 30_000;
const RAID_LOBBY_SOCIAL_TTL_MS = 20_000;
const RAID_LOBBY_PARTY_TTL_MS = 15_000;
const RAID_SCREEN_TTL_MS = 20_000;

export interface RaidLobbyCoreCache {
  playerId: string;
  nickname: string;
  activeRaids: any[];
  normalRaidProgress: any;
  unlockedBossStages: number[];
  isAdmin: boolean;
  partyId: string | null;
  isLeader: boolean;
}

export interface RaidLobbySocialCache {
  friendList: any[];
  incomingInvites: any[];
}

export interface RaidLobbyPartyCache {
  partyMembers: any[];
}

export interface RaidScreenCache {
  bossHp: number;
  expiresAt: number;
  participants: any[];
  alivePlayerIds: string[];
}

interface Timestamped<T> {
  updatedAt: number;
  value: T;
}

interface RaidLobbyCacheState {
  core: Timestamped<RaidLobbyCoreCache> | null;
  social: Timestamped<RaidLobbySocialCache> | null;
  party: Timestamped<RaidLobbyPartyCache> | null;
}

const raidLobbyCacheState: RaidLobbyCacheState = {
  core: null,
  social: null,
  party: null,
};

const raidScreenCacheState = new Map<string, Timestamped<RaidScreenCache>>();

function cloneValue<T>(value: T): T {
  if (value === null || typeof value === 'undefined') {
    return value;
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function readFreshValue<T>(
  entry: Timestamped<T> | null,
  ttlMs: number,
): T | null {
  if (!entry) {
    return null;
  }

  if (Date.now() - entry.updatedAt > ttlMs) {
    return null;
  }

  return cloneValue(entry.value);
}

export function readRaidLobbyCoreCache() {
  return readFreshValue(raidLobbyCacheState.core, RAID_LOBBY_CORE_TTL_MS);
}

export function writeRaidLobbyCoreCache(value: RaidLobbyCoreCache) {
  raidLobbyCacheState.core = {
    updatedAt: Date.now(),
    value: cloneValue(value),
  };
}

export function readRaidLobbySocialCache() {
  return readFreshValue(raidLobbyCacheState.social, RAID_LOBBY_SOCIAL_TTL_MS);
}

export function writeRaidLobbySocialCache(value: RaidLobbySocialCache) {
  raidLobbyCacheState.social = {
    updatedAt: Date.now(),
    value: cloneValue(value),
  };
}

export function readRaidLobbyPartyCache() {
  return readFreshValue(raidLobbyCacheState.party, RAID_LOBBY_PARTY_TTL_MS);
}

export function writeRaidLobbyPartyCache(value: RaidLobbyPartyCache) {
  raidLobbyCacheState.party = {
    updatedAt: Date.now(),
    value: cloneValue(value),
  };
}

export function clearRaidLobbyPartyCache() {
  raidLobbyCacheState.party = null;
}

export function readRaidScreenCache(instanceId: string) {
  return readFreshValue(
    raidScreenCacheState.get(instanceId) ?? null,
    RAID_SCREEN_TTL_MS,
  );
}

export function writeRaidScreenCache(
  instanceId: string,
  value: RaidScreenCache,
) {
  raidScreenCacheState.set(instanceId, {
    updatedAt: Date.now(),
    value: cloneValue(value),
  });
}

export function clearRaidScreenCache(instanceId: string) {
  raidScreenCacheState.delete(instanceId);
}
