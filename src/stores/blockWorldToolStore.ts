import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BLOCK_WORLD_RARE_TOOL_DROP_RATE,
  BLOCK_WORLD_TOOL_DEFINITIONS,
  getBlockWorldToolMaxDurability,
  type BlockWorldToolGradeId,
  type BlockWorldToolInstance,
  type BlockWorldToolKind,
  type BlockWorldToolRewardSource,
} from '../game/blockWorldTools';
import type {RankingMode, RankingPeriod} from '../services/rankingService';

export type {BlockWorldToolInstance} from '../game/blockWorldTools';

export type BlockWorldToolInventory = {
  tools: BlockWorldToolInstance[];
  selectedToolId: string | null;
  claimedRankingRewards: Record<string, true>;
};

type WeightedGrade = {
  id: BlockWorldToolGradeId;
  weight: number;
};

const STORAGE_KEY = 'hiddenBlockWorldTools:v1';

const TOOL_KINDS = BLOCK_WORLD_TOOL_DEFINITIONS.map(tool => tool.id);
const TOOL_GRADES: BlockWorldToolGradeId[] = [
  'poor',
  'useful',
  'sturdy',
  'strong',
  'shining',
  'radiant',
];
const TOOL_SOURCES: BlockWorldToolRewardSource[] = [
  'rareGameDrop',
  'dailyRanking',
  'weeklyRanking',
  'monthlyRanking',
];

const GRADE_WEIGHTS: Record<BlockWorldToolRewardSource, WeightedGrade[]> = {
  rareGameDrop: [
    {id: 'poor', weight: 36},
    {id: 'useful', weight: 30},
    {id: 'sturdy', weight: 19},
    {id: 'strong', weight: 10},
    {id: 'shining', weight: 4},
    {id: 'radiant', weight: 1},
  ],
  dailyRanking: [
    {id: 'poor', weight: 48},
    {id: 'useful', weight: 34},
    {id: 'sturdy', weight: 14},
    {id: 'strong', weight: 4},
    {id: 'shining', weight: 0.8},
    {id: 'radiant', weight: 0.2},
  ],
  weeklyRanking: [
    {id: 'poor', weight: 18},
    {id: 'useful', weight: 34},
    {id: 'sturdy', weight: 28},
    {id: 'strong', weight: 14},
    {id: 'shining', weight: 5},
    {id: 'radiant', weight: 1},
  ],
  monthlyRanking: [
    {id: 'poor', weight: 4},
    {id: 'useful', weight: 18},
    {id: 'sturdy', weight: 32},
    {id: 'strong', weight: 26},
    {id: 'shining', weight: 15},
    {id: 'radiant', weight: 5},
  ],
};

function createEmptyInventory(): BlockWorldToolInventory {
  return {
    tools: [],
    selectedToolId: null,
    claimedRankingRewards: {},
  };
}

export function createEmptyBlockWorldToolInventory() {
  return createEmptyInventory();
}

function isToolKind(value: unknown): value is BlockWorldToolKind {
  return typeof value === 'string' && TOOL_KINDS.includes(value as BlockWorldToolKind);
}

function isToolGrade(value: unknown): value is BlockWorldToolGradeId {
  return typeof value === 'string' && TOOL_GRADES.includes(value as BlockWorldToolGradeId);
}

function isToolSource(value: unknown): value is BlockWorldToolRewardSource {
  return typeof value === 'string' && TOOL_SOURCES.includes(value as BlockWorldToolRewardSource);
}

function sanitizeTool(value: any): BlockWorldToolInstance | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  if (!isToolKind(value.kind) || !isToolGrade(value.grade) || !isToolSource(value.source)) {
    return null;
  }

  const id =
    typeof value.id === 'string' && value.id.trim()
      ? value.id
      : createToolId();
  const acquiredAt =
    typeof value.acquiredAt === 'string' && value.acquiredAt.trim()
      ? value.acquiredAt
      : new Date().toISOString();
  const maxDurability = getBlockWorldToolMaxDurability(value.grade);
  const savedMaxDurability =
    typeof value.maxDurability === 'number' && Number.isFinite(value.maxDurability)
      ? Math.max(1, Math.floor(value.maxDurability))
      : maxDurability;
  const durability =
    typeof value.durability === 'number' && Number.isFinite(value.durability)
      ? Math.max(0, Math.min(savedMaxDurability, Math.floor(value.durability)))
      : savedMaxDurability;

  return {
    id,
    kind: value.kind,
    grade: value.grade,
    source: value.source,
    acquiredAt,
    durability,
    maxDurability: savedMaxDurability,
  };
}

function sanitizeInventory(value: any): BlockWorldToolInventory {
  if (!value || typeof value !== 'object') {
    return createEmptyInventory();
  }

  const tools: BlockWorldToolInstance[] = Array.isArray(value.tools)
    ? value.tools
        .map((tool: unknown) => sanitizeTool(tool))
        .filter(
          (tool: BlockWorldToolInstance | null): tool is BlockWorldToolInstance =>
            tool !== null,
        )
    : [];
  const selectedToolId =
    typeof value.selectedToolId === 'string' &&
    tools.some(tool => tool?.id === value.selectedToolId)
      ? value.selectedToolId
      : tools[0]?.id ?? null;
  const claimedRankingRewards: Record<string, true> = {};

  if (value.claimedRankingRewards && typeof value.claimedRankingRewards === 'object') {
    Object.keys(value.claimedRankingRewards).forEach(key => {
      if (value.claimedRankingRewards[key]) {
        claimedRankingRewards[key] = true;
      }
    });
  }

  return {
    tools: tools as BlockWorldToolInstance[],
    selectedToolId,
    claimedRankingRewards,
  };
}

function createToolId() {
  return `bwt_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function pickWeightedGrade(
  source: BlockWorldToolRewardSource,
  rank = 100,
): BlockWorldToolGradeId {
  const rankBonus = rank <= 3 ? 2.4 : rank <= 10 ? 1.7 : rank <= 30 ? 1.25 : 1;
  const weights = GRADE_WEIGHTS[source].map(weight => {
    const highGrade =
      weight.id === 'strong' || weight.id === 'shining' || weight.id === 'radiant';
    return {
      ...weight,
      weight: highGrade ? weight.weight * rankBonus : weight.weight,
    };
  });
  const total = weights.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;

  for (const item of weights) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.id;
    }
  }

  return weights[weights.length - 1].id;
}

function pickToolKind(): BlockWorldToolKind {
  return TOOL_KINDS[Math.floor(Math.random() * TOOL_KINDS.length)] ?? 'pickaxe';
}

function createToolReward(
  source: BlockWorldToolRewardSource,
  rank?: number,
): BlockWorldToolInstance {
  const grade = pickWeightedGrade(source, rank);
  const maxDurability = getBlockWorldToolMaxDurability(grade);
  return {
    id: createToolId(),
    kind: pickToolKind(),
    grade,
    source,
    acquiredAt: new Date().toISOString(),
    durability: maxDurability,
    maxDurability,
  };
}

async function saveInventory(inventory: BlockWorldToolInventory) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeInventory(inventory)));
}

export async function loadBlockWorldToolInventory(): Promise<BlockWorldToolInventory> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createEmptyInventory();
    }
    return sanitizeInventory(JSON.parse(raw));
  } catch {
    return createEmptyInventory();
  }
}

export async function saveSelectedBlockWorldTool(toolId: string | null) {
  const inventory = await loadBlockWorldToolInventory();
  const selectedToolId = inventory.tools.some(tool => tool.id === toolId)
    ? toolId
    : null;
  const next = {
    ...inventory,
    selectedToolId,
  };
  await saveInventory(next);
  return next;
}

export async function updateBlockWorldToolDurability(
  toolId: string,
  durability: number,
) {
  const inventory = await loadBlockWorldToolInventory();
  const nextTools = inventory.tools.map(tool => {
    if (tool.id !== toolId) {
      return tool;
    }

    return {
      ...tool,
      durability: Math.max(0, Math.min(tool.maxDurability, Math.floor(durability))),
    };
  });
  const next = {
    ...inventory,
    tools: nextTools,
  };
  await saveInventory(next);
  return next;
}

export async function grantBlockWorldTool(
  source: BlockWorldToolRewardSource,
  rank?: number,
) {
  const inventory = await loadBlockWorldToolInventory();
  const tool = createToolReward(source, rank);
  const next = {
    ...inventory,
    tools: [...inventory.tools, tool],
    selectedToolId: inventory.selectedToolId ?? tool.id,
  };
  await saveInventory(next);
  return tool;
}

export async function maybeGrantRareBlockWorldTool(
  chance = BLOCK_WORLD_RARE_TOOL_DROP_RATE,
) {
  if (Math.random() >= chance) {
    return null;
  }

  try {
    return await grantBlockWorldTool('rareGameDrop');
  } catch {
    return null;
  }
}

function getKstDateParts() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
  };
}

function padNumber(value: number) {
  return String(value).padStart(2, '0');
}

function getRankingPeriodKey(period: RankingPeriod) {
  const {year, month, day} = getKstDateParts();
  if (period === 'monthly') {
    return `${year}-${padNumber(month)}`;
  }
  if (period === 'weekly') {
    const localDate = new Date(Date.UTC(year, month - 1, day));
    const weekday = localDate.getUTCDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    const monday = new Date(localDate);
    monday.setUTCDate(localDate.getUTCDate() + mondayOffset);
    return `${monday.getUTCFullYear()}-${padNumber(
      monday.getUTCMonth() + 1,
    )}-${padNumber(monday.getUTCDate())}`;
  }
  return `${year}-${padNumber(month)}-${padNumber(day)}`;
}

function sourceFromPeriod(period: RankingPeriod): BlockWorldToolRewardSource {
  if (period === 'monthly') {
    return 'monthlyRanking';
  }
  if (period === 'weekly') {
    return 'weeklyRanking';
  }
  return 'dailyRanking';
}

export async function claimBlockWorldRankingReward(params: {
  mode: RankingMode;
  period: RankingPeriod;
  rank: number;
}) {
  const inventory = await loadBlockWorldToolInventory();
  const claimKey = `${params.mode}:${params.period}:${getRankingPeriodKey(
    params.period,
  )}`;
  if (inventory.claimedRankingRewards[claimKey]) {
    return {
      alreadyClaimed: true,
      tool: null,
      inventory,
    };
  }

  const source = sourceFromPeriod(params.period);
  const tool = createToolReward(source, params.rank);
  const next = {
    ...inventory,
    tools: [...inventory.tools, tool],
    selectedToolId: inventory.selectedToolId ?? tool.id,
    claimedRankingRewards: {
      ...inventory.claimedRankingRewards,
      [claimKey]: true as const,
    },
  };
  await saveInventory(next);

  return {
    alreadyClaimed: false,
    tool,
    inventory: next,
  };
}
