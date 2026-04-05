// Grid dimensions
export const ROWS = 10;
export const COLS = 8;

// Colors for blocks
export const COLORS = [
  '#ec4899', '#f472b6', '#8b5cf6', '#a78bfa',
  '#06b6d4', '#22d3ee', '#ef4444', '#f87171',
  '#22c55e', '#4ade80', '#f59e0b', '#fbbf24',
];

// All piece shapes
export const PIECE_SHAPES = [
  [[1]],
  [[1, 1]],
  [[1], [1]],
  [[1, 1, 1]],
  [[1], [1], [1]],
  [[1, 1], [1, 0]],
  [[1, 1], [0, 1]],
  [[1, 0], [1, 1]],
  [[0, 1], [1, 1]],
  [[1, 1], [1, 1]],
  [[1, 1, 1, 1]],
  [[1], [1], [1], [1]],
  [[1, 1, 1], [1, 0, 0]],
  [[1, 1, 1], [0, 0, 1]],
  [[1, 0], [1, 0], [1, 1]],
  [[0, 1], [0, 1], [1, 1]],
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 1], [0, 1, 0]],
  [[0, 1, 0], [1, 1, 1]],
  // Special purchasable pieces (index 20+)
  [[1, 1, 1], [1, 1, 1], [1, 1, 1]],                   // 20: 3x3 square (9)
  [[1, 1, 1], [1, 1, 1]],                               // 21: 2x3 rectangle (6)
  [[1, 1], [1, 1], [1, 1]],                             // 22: 3x2 rectangle (6)
  [[1, 1, 1, 1, 1]],                                    // 23: 5-line horizontal (5)
  [[1], [1], [1], [1], [1]],                            // 24: 5-line vertical (5)
  [[1, 1, 1], [0, 0, 1], [0, 1, 0], [1, 0, 0], [1, 1, 1]], // 25: number "2" shape (9)
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]],                   // 26: diagonal down-right (3)
  [[0, 0, 1], [0, 1, 0], [1, 0, 0]],                   // 27: diagonal down-left (3)
];

// Piece difficulty groups (indices into PIECE_SHAPES)
export const PIECES_EASY = [
  /* 1칸 */ 0,
  /* 2칸 */ 1, 2,
  /* 3칸 */ 3, 3, 4, 4, 5, 6, 7, 8,
  /* 4칸 */ 9, 9, 10, 10, 11, 11,
];
export const PIECES_MEDIUM = [
  0,
  1, 2,
  3, 3, 4, 4, 5, 6, 7, 8,
  9, 9, 10, 10, 11, 11,
  12, 12, 13, 13, 14, 14, 15, 15,
];
export const PIECES_HARD = [
  0,
  1, 2,
  3, 3, 4, 4, 5, 6, 7, 8,
  9, 9, 10, 10, 11, 11,
  12, 12, 13, 13, 14, 14, 15, 15,
  16, 16, 17, 17, 18, 18, 19, 19,
];

// Endless mode level thresholds
export const LEVEL_THRESHOLDS = [
  0, 1000, 2500, 5000, 8000, 12000, 17000, 23000, 30000, 40000, 50000,
];

// Fever system — triggers at 20 lines cleared
export const FEVER_MAX = 100;
export const FEVER_DURATION = 10000;
export const FEVER_LINES_REQUIRED = 20; // lines to clear to trigger fever

// Combo timeout
export const COMBO_TIMEOUT_MS = 5000; // 5 seconds to maintain combo

// Hearts — 10 max, 1 per 5 minutes
export const MAX_HEARTS = 10;
export const HEART_REGEN_MS = 5 * 60 * 1000; // 5 minutes
export const INFINITE_HEARTS_ENABLED = true;
export const INFINITE_HEARTS_VALUE = 999999;
export const INFINITE_HEARTS_LABEL = '∞';

export function getConfiguredMaxHearts(maxHearts: number): number {
  return INFINITE_HEARTS_ENABLED ? INFINITE_HEARTS_VALUE : maxHearts;
}

export function formatHeartValue(hearts: number): string {
  return INFINITE_HEARTS_ENABLED ? INFINITE_HEARTS_LABEL : String(hearts);
}

export function formatHeartStatus(hearts: number, maxHearts: number): string {
  return INFINITE_HEARTS_ENABLED
    ? INFINITE_HEARTS_LABEL
    : `${hearts}/${maxHearts}`;
}

// Max items per type and total types
export const MAX_ITEM_TYPES = 3;
export const MAX_ITEM_PER_TYPE = 2;

// Battle attacks
export const ATTACKS = [
  {cost: 40, lines: 1},
  {cost: 80, lines: 2},
  {cost: 120, lines: 3},
  {cost: 200, lines: 4},
];

// Endless mode gold milestones (score → gold reward)
export const ENDLESS_GOLD_MILESTONES = [
  {score: 1000,   gold: 10},
  {score: 3000,   gold: 20},
  {score: 6000,   gold: 30},
  {score: 10000,  gold: 50},
  {score: 15000,  gold: 70},
  {score: 21000,  gold: 100},
  {score: 28000,  gold: 130},
  {score: 36000,  gold: 170},
  {score: 45000,  gold: 220},
  {score: 55000,  gold: 280},
  {score: 70000,  gold: 360},
  {score: 90000,  gold: 460},
  {score: 120000, gold: 600},
  {score: 160000, gold: 800},
  {score: 200000, gold: 1000},
];

// Level definitions — 300 stages across 10 worlds
export interface LevelDef {
  id: number;
  world: number;
  name: string;
  goal: {
    type: 'monster';
    monsterHp: number;
    monsterName: string;
    monsterEmoji: string;
    monsterColor: string;
  };
  obstacles?: {type: 'stone' | 'ice' | 'hard'; count: number; hits?: number}[];
}

// ─── World definitions ────────────────────────────────────────
export const WORLDS = [
  {id: 1,  name: '초원',      color: '#22c55e', emoji: '🌿', bossName: '킹슬라임',     bossEmoji: '👑', bossColor: '#4ade80'},
  {id: 2,  name: '사막',      color: '#f59e0b', emoji: '🏜️', bossName: '전갈왕',       bossEmoji: '🦂', bossColor: '#fbbf24'},
  {id: 3,  name: '설원',      color: '#93c5fd', emoji: '❄️', bossName: '설빙 여왕',    bossEmoji: '👸', bossColor: '#bfdbfe'},
  {id: 4,  name: '해저 동굴', color: '#06b6d4', emoji: '🌊', bossName: '크라켄',       bossEmoji: '🦑', bossColor: '#22d3ee'},
  {id: 5,  name: '독림',      color: '#84cc16', emoji: '🌿', bossName: '히드라',       bossEmoji: '🐍', bossColor: '#a3e635'},
  {id: 6,  name: '고대 유적', color: '#d97706', emoji: '🏛️', bossName: '메두사',       bossEmoji: '🐉', bossColor: '#f59e0b'},
  {id: 7,  name: '암흑 성',   color: '#7c3aed', emoji: '🏰', bossName: '리치 킹',      bossEmoji: '💀', bossColor: '#a78bfa'},
  {id: 8,  name: '천공 섬',   color: '#38bdf8', emoji: '☁️', bossName: '천둥 용',      bossEmoji: '⚡', bossColor: '#7dd3fc'},
  {id: 9,  name: '심연',      color: '#1e3a5f', emoji: '🌑', bossName: '심연의 군주',  bossEmoji: '👿', bossColor: '#334155'},
  {id: 10, name: '화산지대',  color: '#dc2626', emoji: '🌋', bossName: '레드 드래곤',  bossEmoji: '🐲', bossColor: '#ef4444'},
];

// ─── Monster definitions per world zone ──────────────────────
interface ZoneMonster {
  name: string;
  emoji: string;
  color: string;
}

type WorldMonsters = {
  entrance: ZoneMonster[];  // stages 1-10
  center: ZoneMonster[];    // stages 11-20
  boss: ZoneMonster[];      // stages 21-30 (stage 30 = world boss)
};

const WORLD_MONSTERS: WorldMonsters[] = [
  // World 1 — 초원
  {
    entrance: [
      {name: '슬라임',     emoji: '🟢', color: '#4ade80'},
      {name: '초원 토끼',   emoji: '🐰', color: '#86efac'},
      {name: '버섯 병사',   emoji: '🍄', color: '#a3e635'},
    ],
    center: [
      {name: '석상 골렘',   emoji: '🪨', color: '#9ca3af'},
      {name: '덩굴 생물',   emoji: '🌿', color: '#4ade80'},
      {name: '숲의 정령',   emoji: '🧚', color: '#86efac'},
    ],
    boss: [
      {name: '포레스트 가디언', emoji: '🌳', color: '#16a34a'},
      {name: '그린 바실리스크', emoji: '🦎', color: '#4ade80'},
      {name: '킹슬라임',        emoji: '👑', color: '#22c55e'},
    ],
  },
  // World 2 — 사막
  {
    entrance: [
      {name: '모래 게',     emoji: '🦀', color: '#fbbf24'},
      {name: '사막 도마뱀', emoji: '🦎', color: '#f59e0b'},
      {name: '선인장 병사', emoji: '🌵', color: '#86efac'},
    ],
    center: [
      {name: '미라',        emoji: '🧟', color: '#d97706'},
      {name: '모래 지렁이', emoji: '🐛', color: '#fbbf24'},
      {name: '사막 여우',   emoji: '🦊', color: '#f97316'},
    ],
    boss: [
      {name: '사막 골렘',   emoji: '🪨', color: '#d97706'},
      {name: '스핑크스',    emoji: '🦁', color: '#f59e0b'},
      {name: '전갈왕',      emoji: '🦂', color: '#ef4444'},
    ],
  },
  // World 3 — 설원
  {
    entrance: [
      {name: '얼음 늑대',  emoji: '🐺', color: '#93c5fd'},
      {name: '눈 토끼',    emoji: '🐰', color: '#bfdbfe'},
      {name: '서리 요정',  emoji: '🧚', color: '#dbeafe'},
    ],
    center: [
      {name: '얼음 거인',  emoji: '🧊', color: '#60a5fa'},
      {name: '설원 매',    emoji: '🦅', color: '#93c5fd'},
      {name: '동결 골렘',  emoji: '🪨', color: '#bfdbfe'},
    ],
    boss: [
      {name: '빙하 드래곤', emoji: '🐉', color: '#60a5fa'},
      {name: '눈보라 정령', emoji: '❄️', color: '#93c5fd'},
      {name: '설빙 여왕',   emoji: '👸', color: '#38bdf8'},
    ],
  },
  // World 4 — 해저 동굴
  {
    entrance: [
      {name: '해파리',     emoji: '🪼', color: '#22d3ee'},
      {name: '조개 기사',  emoji: '🐚', color: '#06b6d4'},
      {name: '산호 정령',  emoji: '🌺', color: '#f0abfc'},
    ],
    center: [
      {name: '전기뱀장어', emoji: '⚡', color: '#facc15'},
      {name: '상어 전사',  emoji: '🦈', color: '#0284c7'},
      {name: '심해 용',    emoji: '🐉', color: '#0e7490'},
    ],
    boss: [
      {name: '거대 거북',  emoji: '🐢', color: '#06b6d4'},
      {name: '심해 레비아탄', emoji: '🐋', color: '#0369a1'},
      {name: '크라켄',     emoji: '🦑', color: '#0c4a6e'},
    ],
  },
  // World 5 — 독림
  {
    entrance: [
      {name: '독버섯',     emoji: '🍄', color: '#a3e635'},
      {name: '독 개구리',  emoji: '🐸', color: '#84cc16'},
      {name: '덩굴 거미',  emoji: '🕷️', color: '#65a30d'},
    ],
    center: [
      {name: '역병 박쥐',  emoji: '🦇', color: '#7c3aed'},
      {name: '독사',       emoji: '🐍', color: '#16a34a'},
      {name: '독 트레인트', emoji: '🌳', color: '#4d7c0f'},
    ],
    boss: [
      {name: '독 골렘',    emoji: '🟣', color: '#8b5cf6'},
      {name: '킹 독거미',  emoji: '🕷️', color: '#7c3aed'},
      {name: '히드라',     emoji: '🐍', color: '#6d28d9'},
    ],
  },
  // World 6 — 고대 유적
  {
    entrance: [
      {name: '석상',       emoji: '🗿', color: '#92400e'},
      {name: '저주받은 풍뎅이', emoji: '🐞', color: '#d97706'},
      {name: '유적 유령',  emoji: '👻', color: '#fbbf24'},
    ],
    center: [
      {name: '골렘 기사',  emoji: '🪨', color: '#78716c'},
      {name: '고대 스핑크스', emoji: '🦁', color: '#d97706'},
      {name: '용암 정령',  emoji: '🔥', color: '#ef4444'},
    ],
    boss: [
      {name: '고대 감시자', emoji: '👁️', color: '#d97706'},
      {name: '석판 골렘',  emoji: '🪨', color: '#92400e'},
      {name: '메두사',     emoji: '🐉', color: '#dc2626'},
    ],
  },
  // World 7 — 암흑 성
  {
    entrance: [
      {name: '그림자 박쥐', emoji: '🦇', color: '#6d28d9'},
      {name: '해골 병사',  emoji: '💀', color: '#9ca3af'},
      {name: '유령 기사',  emoji: '👻', color: '#7c3aed'},
    ],
    center: [
      {name: '흡혈 박쥐',  emoji: '🧛', color: '#7f1d1d'},
      {name: '암흑 마법사', emoji: '🧙', color: '#4c1d95'},
      {name: '죽음 골렘',  emoji: '💀', color: '#1e1b4b'},
    ],
    boss: [
      {name: '밴시',        emoji: '👁️', color: '#7c3aed'},
      {name: '다크 나이트', emoji: '⚔️', color: '#4c1d95'},
      {name: '리치 킹',     emoji: '💀', color: '#1e1b4b'},
    ],
  },
  // World 8 — 천공 섬
  {
    entrance: [
      {name: '바람 요정',  emoji: '🧚', color: '#7dd3fc'},
      {name: '구름 토끼',  emoji: '🐰', color: '#bfdbfe'},
      {name: '천둥새',     emoji: '🦅', color: '#38bdf8'},
    ],
    center: [
      {name: '폭풍 독수리', emoji: '🦅', color: '#0ea5e9'},
      {name: '하늘 수호자', emoji: '⚔️', color: '#38bdf8'},
      {name: '천상 기사',  emoji: '🛡️', color: '#bae6fd'},
    ],
    boss: [
      {name: '스톰 피닉스', emoji: '🔥', color: '#f97316'},
      {name: '천공 가디언', emoji: '☁️', color: '#7dd3fc'},
      {name: '천둥 용',     emoji: '⚡', color: '#facc15'},
    ],
  },
  // World 9 — 심연
  {
    entrance: [
      {name: '허공 슬라임', emoji: '🌑', color: '#334155'},
      {name: '암흑 거머리', emoji: '🖤', color: '#1e293b'},
      {name: '심연 감시자', emoji: '👁️', color: '#475569'},
    ],
    center: [
      {name: '혼돈 기사',  emoji: '⚔️', color: '#312e81'},
      {name: '악몽 짐승',  emoji: '👹', color: '#1e1b4b'},
      {name: '허공 드래곤', emoji: '🐉', color: '#0f172a'},
    ],
    boss: [
      {name: '심연 왕',    emoji: '👑', color: '#1e293b'},
      {name: '공허의 신',  emoji: '🌑', color: '#0f172a'},
      {name: '심연의 군주', emoji: '👿', color: '#020617'},
    ],
  },
  // World 10 — 화산지대
  {
    entrance: [
      {name: '용암 슬라임', emoji: '🟠', color: '#f97316'},
      {name: '불 도마뱀',  emoji: '🦎', color: '#ef4444'},
      {name: '마그마 게',  emoji: '🦀', color: '#dc2626'},
    ],
    center: [
      {name: '화염 거인',  emoji: '🔥', color: '#ef4444'},
      {name: '용융 골렘',  emoji: '🪨', color: '#b91c1c'},
      {name: '불꽃 와이번', emoji: '🦎', color: '#f97316'},
    ],
    boss: [
      {name: '화산 군주',  emoji: '🌋', color: '#dc2626'},
      {name: '인페르노 드레이크', emoji: '🐉', color: '#b91c1c'},
      {name: '레드 드래곤', emoji: '🐲', color: '#991b1b'},
    ],
  },
];

// ─── Generate 300 levels ──────────────────────────────────────
function getMonsterForStage(worldIdx: number, stage: number): ZoneMonster {
  const monsters = WORLD_MONSTERS[worldIdx];
  if (stage <= 10) {
    return monsters.entrance[Math.floor(((stage - 1) / 10) * monsters.entrance.length) % monsters.entrance.length];
  } else if (stage <= 20) {
    return monsters.center[Math.floor(((stage - 11) / 10) * monsters.center.length) % monsters.center.length];
  } else {
    // stage 21-29: boss zone enemies, stage 30 = world boss
    if (stage === 30) return monsters.boss[monsters.boss.length - 1];
    const idx = Math.min(Math.floor(((stage - 21) / 9) * (monsters.boss.length - 1)), monsters.boss.length - 2);
    return monsters.boss[idx];
  }
}

// Stage names per zone
const STAGE_NAME_PREFIXES = ['입구', '초입', '전초', '외곽', '접경'];
const STAGE_NAME_CENTER   = ['중심부', '핵심', '심층부', '요새', '본거지'];
const STAGE_NAME_BOSS     = ['결전 구역', '보스 영역', '왕의 거처'];

function getStageName(world: number, stage: number): string {
  const w = WORLDS[world - 1];
  if (stage <= 10) {
    const prefix = STAGE_NAME_PREFIXES[(stage - 1) % STAGE_NAME_PREFIXES.length];
    return `${w.emoji} ${w.name} ${prefix} ${stage}`;
  } else if (stage <= 20) {
    const prefix = STAGE_NAME_CENTER[(stage - 11) % STAGE_NAME_CENTER.length];
    return `${w.emoji} ${w.name} ${prefix} ${stage}`;
  } else if (stage < 30) {
    const prefix = STAGE_NAME_BOSS[(stage - 21) % STAGE_NAME_BOSS.length];
    return `${w.emoji} ${w.name} ${prefix} ${stage}`;
  } else {
    // Stage 30 = world boss
    return `${w.emoji} ${w.name} — ${w.bossName}`;
  }
}

// HP scaling: exponential growth across 10 worlds × 30 stages
// W1S1: ~800, W1S30: ~10k, W5S30: ~300k, W10S30: ~5M
const WORLD_BASE_HP = [800, 1800, 3200, 5200, 8000, 12000, 17500, 25000, 36000, 50000];

function getMonsterHp(world: number, stage: number): number {
  const base = WORLD_BASE_HP[world - 1];
  // Linear within world: stage 1 = base, stage 30 = base × 5
  const multiplier = 1 + (stage - 1) / 29 * 4;
  return Math.round(base * multiplier);
}

// Obstacle configs per world/stage
function getObstacles(
  world: number,
  stage: number,
): LevelDef['obstacles'] {
  if (world <= 2 && stage <= 10) return undefined;
  if (world <= 2) {
    return [{type: 'stone', count: 1}];
  }
  if (world <= 4) {
    if (stage <= 10) return [{type: 'stone', count: 1}];
    if (stage <= 20) return [{type: 'ice', count: 2}];
    return [{type: 'ice', count: 2}, {type: 'stone', count: 1}];
  }
  if (world <= 6) {
    if (stage <= 10) return [{type: 'ice', count: 2}];
    if (stage <= 20) return [{type: 'ice', count: 2}, {type: 'stone', count: 2}];
    return [{type: 'hard', count: 2, hits: 2}, {type: 'stone', count: 1}];
  }
  if (world <= 8) {
    if (stage <= 10) return [{type: 'hard', count: 2, hits: 2}];
    if (stage <= 20) return [{type: 'hard', count: 3, hits: 3}];
    return [{type: 'hard', count: 3, hits: 3}, {type: 'stone', count: 2}];
  }
  // Worlds 9-10
  if (stage <= 10) return [{type: 'hard', count: 3, hits: 3}];
  if (stage <= 20) return [{type: 'hard', count: 4, hits: 4}];
  return [{type: 'hard', count: 4, hits: 5}, {type: 'stone', count: 2}];
}

function generateLevels(): LevelDef[] {
  const levels: LevelDef[] = [];
  for (let world = 1; world <= 10; world++) {
    for (let stage = 1; stage <= 30; stage++) {
      const id = (world - 1) * 30 + stage;
      const monster = getMonsterForStage(world - 1, stage);
      levels.push({
        id,
        world,
        name: getStageName(world, stage),
        goal: {
          type: 'monster',
          monsterHp: getMonsterHp(world, stage),
          monsterName: monster.name,
          monsterEmoji: monster.emoji,
          monsterColor: monster.color,
        },
        obstacles: getObstacles(world, stage),
      });
    }
  }
  return levels;
}

export const LEVELS: LevelDef[] = generateLevels();

// Raid skill multipliers
export interface RaidSkillDef {
  multiplier: number;
  gaugeThreshold: number;
  label: string;
  name: string;
}

export const RAID_SKILLS: RaidSkillDef[] = [
  {multiplier: 1,  gaugeThreshold: 0,   label: '×1',  name: '타격'},
  {multiplier: 3,  gaugeThreshold: 20,  label: '×3',  name: '강타'},
  {multiplier: 7,  gaugeThreshold: 50,  label: '×7',  name: '질풍'},
  {multiplier: 12, gaugeThreshold: 100, label: '×12', name: '번개'},
  {multiplier: 20, gaugeThreshold: 200, label: '×20', name: '폭풍'},
  {multiplier: 50, gaugeThreshold: 400, label: '×50', name: '멸살'},
];

// Normal raid diamond rewards per stage (first clear + per kill)
export const NORMAL_RAID_REWARDS = [
  {stage: 1,  firstDia: 15,  perKill: 1},
  {stage: 2,  firstDia: 20,  perKill: 1},
  {stage: 3,  firstDia: 30,  perKill: 2},
  {stage: 4,  firstDia: 45,  perKill: 2},
  {stage: 5,  firstDia: 60,  perKill: 3},
  {stage: 6,  firstDia: 80,  perKill: 4},
  {stage: 7,  firstDia: 100, perKill: 5},
  {stage: 8,  firstDia: 130, perKill: 6},
  {stage: 9,  firstDia: 170, perKill: 8},
  {stage: 10, firstDia: 220, perKill: 10},
];

// Boss raid schedule
export const BOSS_RAID_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
export const BOSS_RAID_WINDOW_MS   = 10 * 60 * 1000;      // 10 minutes
export const BOSS_RAID_MAX_PLAYERS = 30;

// Boss raid HP (stage 1 = 100k, +100k per stage)
export const BOSS_RAID_HP = Array.from({length: 10}, (_, i) => (i + 1) * 100000);

// Daily missions
export const DAILY_MISSIONS = [
  {id: 'play3',    title: '게임 3판 플레이',  target: 3,    reward: 30,  stat: 'dailyGames'},
  {id: 'score5000',title: '총 5,000점 획득', target: 5000, reward: 50,  stat: 'dailyScore'},
  {id: 'lines10',  title: '10줄 클리어',      target: 10,   reward: 40,  stat: 'dailyLines'},
  {id: 'combo5',   title: '5콤보 달성',       target: 5,    reward: 60,  stat: 'dailyMaxCombo'},
  {id: 'level1',   title: '스테이지 1개 클리어', target: 1, reward: 30,  stat: 'dailyLevelClears'},
];

// Achievements
export const ACHIEVEMENTS = [
  {id: 'firstWin',  title: '첫 승리',       desc: '첫 스테이지 클리어',       target: 1,     reward: 50,  stat: 'totalLevelClears'},
  {id: 'score10k',  title: '만점 도전자',   desc: '무한 모드 10,000점',        target: 10000, reward: 100, stat: 'endlessHighScore'},
  {id: 'score50k',  title: '점수 마스터',   desc: '무한 모드 50,000점',        target: 50000, reward: 200, stat: 'endlessHighScore'},
  {id: 'lines100',  title: '줄 클리어 100', desc: '총 100줄 클리어',           target: 100,   reward: 80,  stat: 'totalLines'},
  {id: 'lines500',  title: '줄 클리어 500', desc: '총 500줄 클리어',           target: 500,   reward: 150, stat: 'totalLines'},
  {id: 'combo10',   title: '콤보 마스터',   desc: '10콤보 달성',               target: 10,    reward: 100, stat: 'maxCombo'},
  {id: 'levels10',  title: '모험가',        desc: '10스테이지 클리어',         target: 10,    reward: 100, stat: 'totalLevelClears'},
  {id: 'levels50',  title: '탐험가',        desc: '50스테이지 클리어',         target: 50,    reward: 200, stat: 'totalLevelClears'},
  {id: 'combo15',   title: '콤보 달인',     desc: '15콤보 달성',               target: 15,    reward: 150, stat: 'maxCombo'},
  {id: 'games50',   title: '열정 플레이어', desc: '50판 플레이',               target: 50,    reward: 100, stat: 'totalGames'},
  {id: 'endless5',  title: '무한 도전',     desc: '무한 모드 레벨 5',          target: 5,     reward: 80,  stat: 'endlessMaxLevel'},
  {id: 'endless10', title: '무한 마스터',   desc: '무한 모드 레벨 10',         target: 10,    reward: 150, stat: 'endlessMaxLevel'},
  {id: 'levels100', title: '용사',          desc: '100스테이지 클리어',        target: 100,   reward: 300, stat: 'totalLevelClears'},
  {id: 'levels300', title: '전설의 영웅',   desc: '300스테이지 전부 클리어',   target: 300,   reward: 1000,stat: 'totalLevelClears'},
];
