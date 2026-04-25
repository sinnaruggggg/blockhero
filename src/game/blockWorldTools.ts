export type BlockWorldToolKind = 'shovel' | 'axe' | 'pickaxe';

export type BlockWorldToolGradeId =
  | 'poor'
  | 'useful'
  | 'sturdy'
  | 'strong'
  | 'shining'
  | 'radiant';

export type BlockWorldToolRewardSource =
  | 'rareGameDrop'
  | 'dailyRanking'
  | 'weeklyRanking'
  | 'monthlyRanking';

export type BlockWorldToolDefinition = {
  id: BlockWorldToolKind;
  label: string;
  role: string;
  mineTargets: string[];
};

export type BlockWorldToolGradeDefinition = {
  id: BlockWorldToolGradeId;
  label: string;
  hiddenFromCatalog: true;
  powerMultiplier: number;
  maxDurability: number;
};

export type BlockWorldToolRewardDefinition = {
  source: BlockWorldToolRewardSource;
  label: string;
  note: string;
};

export type BlockWorldToolInstance = {
  id: string;
  kind: BlockWorldToolKind;
  grade: BlockWorldToolGradeId;
  source: BlockWorldToolRewardSource;
  acquiredAt: string;
  durability: number;
  maxDurability: number;
};

export const BLOCK_WORLD_TOOL_DEFINITIONS: BlockWorldToolDefinition[] = [
  {
    id: 'shovel',
    label: '블록마법 삽',
    role: '흙, 모래, 부드러운 자원층 채굴',
    mineTargets: ['grass', 'dirt', 'soft_resource'],
  },
  {
    id: 'axe',
    label: '블록마법 도끼',
    role: '원목, 잎, 가구성 블록 채집',
    mineTargets: ['wood', 'leaves', 'plank', 'door', 'chair', 'workbench'],
  },
  {
    id: 'pickaxe',
    label: '블록마법 곡괭이',
    role: '돌, 광석, 화로, 단단한 자원층 채굴',
    mineTargets: ['stone', 'iron_ore', 'furnace', 'hard_resource'],
  },
];

export const BLOCK_WORLD_TOOL_GRADES: BlockWorldToolGradeDefinition[] = [
  {
    id: 'poor',
    label: '부실한',
    hiddenFromCatalog: true,
    powerMultiplier: 0.72,
    maxDurability: 48,
  },
  {
    id: 'useful',
    label: '쓸만한',
    hiddenFromCatalog: true,
    powerMultiplier: 1,
    maxDurability: 80,
  },
  {
    id: 'sturdy',
    label: '튼튼한',
    hiddenFromCatalog: true,
    powerMultiplier: 1.26,
    maxDurability: 120,
  },
  {
    id: 'strong',
    label: '강력한',
    hiddenFromCatalog: true,
    powerMultiplier: 1.62,
    maxDurability: 180,
  },
  {
    id: 'shining',
    label: '빛나는',
    hiddenFromCatalog: true,
    powerMultiplier: 2.15,
    maxDurability: 260,
  },
  {
    id: 'radiant',
    label: '찬란한',
    hiddenFromCatalog: true,
    powerMultiplier: 3.05,
    maxDurability: 420,
  },
];

export const BLOCK_WORLD_TOOL_REWARD_SOURCES: BlockWorldToolRewardDefinition[] = [
  {
    source: 'rareGameDrop',
    label: '게임 중 초희귀 드랍',
    note: '다이아/보너스 아이템 보상 연출에 아주 낮은 확률로 섞어서 지급',
  },
  {
    source: 'dailyRanking',
    label: '일일 랭킹 보상',
    note: '매일 랭킹 보상 풀에서 낮은 등급 중심으로 지급',
  },
  {
    source: 'weeklyRanking',
    label: '주간 랭킹 보상',
    note: '중간 등급 이상 기대값을 일일 보상보다 높게 설정',
  },
  {
    source: 'monthlyRanking',
    label: '월간 랭킹 보상',
    note: '가장 희귀한 도구와 상위 등급 등장 가능성이 있는 핵심 보상',
  },
];

export const BLOCK_WORLD_RARE_TOOL_DROP_RATE = 0.0008;

const BLOCK_TOOL_REQUIREMENTS: Record<string, BlockWorldToolKind> = {
  grass: 'shovel',
  dirt: 'shovel',
  soft_resource: 'shovel',
  wood: 'axe',
  leaves: 'axe',
  plank: 'axe',
  door: 'axe',
  chair: 'axe',
  workbench: 'axe',
  stone: 'pickaxe',
  iron_ore: 'pickaxe',
  furnace: 'pickaxe',
  hard_resource: 'pickaxe',
};

export function getBlockWorldToolDefinition(kind: BlockWorldToolKind) {
  return BLOCK_WORLD_TOOL_DEFINITIONS.find(tool => tool.id === kind);
}

export function getBlockWorldToolGradeDefinition(grade: BlockWorldToolGradeId) {
  return BLOCK_WORLD_TOOL_GRADES.find(item => item.id === grade);
}

export function getBlockWorldToolMaxDurability(grade: BlockWorldToolGradeId) {
  return getBlockWorldToolGradeDefinition(grade)?.maxDurability ?? 80;
}

export function getRequiredBlockWorldToolKind(blockId: string) {
  return BLOCK_TOOL_REQUIREMENTS[blockId] ?? null;
}

export function formatBlockWorldToolName(tool: BlockWorldToolInstance) {
  const definition = getBlockWorldToolDefinition(tool.kind);
  const grade = getBlockWorldToolGradeDefinition(tool.grade);
  return `${grade?.label ?? '알 수 없는'} ${definition?.label ?? '블록마법 도구'}`;
}
