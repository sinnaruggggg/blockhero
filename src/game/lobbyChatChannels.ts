export interface LobbyChatChannelInfo {
  id: number;
  count: number;
}

type PresenceMeta = {
  channelId?: number | string | null;
};

type PresenceEntry = PresenceMeta | PresenceMeta[] | undefined;

function normalizeChannelId(value: number | string | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function toPresenceMetas(entry: PresenceEntry): PresenceMeta[] {
  if (!entry) {
    return [];
  }

  return Array.isArray(entry) ? entry : [entry];
}

export function buildLobbyChatChannelInfos(
  presenceState: Record<string, PresenceEntry> | null | undefined,
): LobbyChatChannelInfo[] {
  const counts = new Map<number, number>();

  Object.values(presenceState ?? {}).forEach(entry => {
    toPresenceMetas(entry).forEach(meta => {
      const channelId = normalizeChannelId(meta.channelId);
      if (!channelId) {
        return;
      }
      counts.set(channelId, (counts.get(channelId) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([id, count]) => ({id, count}))
    .sort((left, right) => left.id - right.id);
}

export function getLobbyChatOccupancy(
  channelInfos: LobbyChatChannelInfo[],
  channelId: number | null | undefined,
): number {
  if (!channelId) {
    return 0;
  }
  return channelInfos.find(info => info.id === channelId)?.count ?? 0;
}

export function pickRandomLobbyChatChannel(
  channelInfos: LobbyChatChannelInfo[],
  capacity: number,
  rng: () => number = Math.random,
): number {
  const eligible = channelInfos.filter(info => info.count < capacity);
  if (eligible.length === 0) {
    const maxId = channelInfos.reduce((max, info) => Math.max(max, info.id), 0);
    return Math.max(1, maxId + 1);
  }

  const index = Math.min(
    eligible.length - 1,
    Math.max(0, Math.floor(rng() * eligible.length)),
  );
  return eligible[index].id;
}

export function buildLobbyChatChannelOptions(
  channelInfos: LobbyChatChannelInfo[],
  currentChannelId: number | null,
  limit = 6,
): LobbyChatChannelInfo[] {
  const merged = new Map<number, LobbyChatChannelInfo>();

  channelInfos.forEach(info => {
    merged.set(info.id, info);
  });

  if (currentChannelId && !merged.has(currentChannelId)) {
    merged.set(currentChannelId, {id: currentChannelId, count: 0});
  }

  const nextChannelId = Math.max(
    1,
    channelInfos.reduce((max, info) => Math.max(max, info.id), currentChannelId ?? 0) + 1,
  );
  if (!merged.has(nextChannelId)) {
    merged.set(nextChannelId, {id: nextChannelId, count: 0});
  }

  const sorted = Array.from(merged.values()).sort((left, right) => left.id - right.id);
  const resolvedLimit = Math.max(1, limit);
  if (sorted.length <= resolvedLimit || currentChannelId == null) {
    return sorted.slice(0, resolvedLimit);
  }

  const currentIndex = sorted.findIndex(info => info.id === currentChannelId);
  if (currentIndex === -1) {
    return sorted.slice(0, resolvedLimit);
  }

  const start = Math.max(
    0,
    Math.min(currentIndex - Math.floor(resolvedLimit / 2), sorted.length - resolvedLimit),
  );
  return sorted.slice(start, start + resolvedLimit);
}
