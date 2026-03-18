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
];

// Piece difficulty groups (indices into PIECE_SHAPES)
export const PIECES_EASY = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
export const PIECES_MEDIUM = [...PIECES_EASY, 10, 11, 12, 13, 14, 15];
export const PIECES_HARD = [...PIECES_MEDIUM, 16, 17, 18, 19];

// Endless mode level thresholds
export const LEVEL_THRESHOLDS = [
  0, 1000, 2500, 5000, 8000, 12000, 17000, 23000, 30000, 40000, 50000,
];

// Fever system
export const FEVER_MAX = 100;
export const FEVER_DURATION = 10000;

// Hearts
export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 30 * 60 * 1000; // 30 minutes

// Battle attacks
export const ATTACKS = [
  {cost: 40, lines: 1},
  {cost: 80, lines: 2},
  {cost: 120, lines: 3},
  {cost: 200, lines: 4},
];

// Level definitions
export interface LevelDef {
  id: number;
  world: number;
  name: string;
  goal: {type: 'score' | 'lines' | 'stone' | 'ice'; target: number};
  turns: number | null;
  stars: [number, number, number];
  obstacles?: {type: 'stone' | 'ice'; count: number}[];
}

export const LEVELS: LevelDef[] = [
  {id: 1, world: 1, name: '시작!', goal: {type: 'score', target: 500}, turns: null, stars: [500, 800, 1200]},
  {id: 2, world: 1, name: '워밍업', goal: {type: 'score', target: 800}, turns: null, stars: [800, 1200, 1800]},
  {id: 3, world: 1, name: '첫 도전', goal: {type: 'score', target: 1000}, turns: 20, stars: [1000, 1500, 2200]},
  {id: 4, world: 1, name: '줄 맞추기', goal: {type: 'lines', target: 3}, turns: 15, stars: [1000, 1800, 2500]},
  {id: 5, world: 1, name: '콤보 연습', goal: {type: 'score', target: 1500}, turns: 20, stars: [1500, 2200, 3000]},
  {id: 6, world: 1, name: '돌 부수기', goal: {type: 'stone', target: 3}, turns: 20, stars: [1500, 2500, 3500], obstacles: [{type: 'stone', count: 5}]},
  {id: 7, world: 1, name: '얼음 깨기', goal: {type: 'ice', target: 4}, turns: 20, stars: [2000, 3000, 4000], obstacles: [{type: 'ice', count: 6}]},
  {id: 8, world: 1, name: '복합 도전', goal: {type: 'score', target: 2000}, turns: 20, stars: [2000, 3000, 4500], obstacles: [{type: 'stone', count: 3}, {type: 'ice', count: 3}]},
  {id: 9, world: 1, name: '줄 마스터', goal: {type: 'lines', target: 8}, turns: 25, stars: [2500, 3500, 5000]},
  {id: 10, world: 1, name: '초원 보스', goal: {type: 'score', target: 3000}, turns: 25, stars: [3000, 4500, 6000], obstacles: [{type: 'stone', count: 5}, {type: 'ice', count: 5}]},
  {id: 11, world: 2, name: '뜨거운 시작', goal: {type: 'score', target: 2000}, turns: 20, stars: [2000, 3000, 4000]},
  {id: 12, world: 2, name: '사막 폭풍', goal: {type: 'lines', target: 5}, turns: 18, stars: [2000, 3500, 5000]},
  {id: 13, world: 2, name: '오아시스', goal: {type: 'score', target: 2500}, turns: 20, stars: [2500, 4000, 5500], obstacles: [{type: 'stone', count: 4}]},
  {id: 14, world: 2, name: '신기루', goal: {type: 'ice', target: 6}, turns: 22, stars: [3000, 4500, 6000], obstacles: [{type: 'ice', count: 8}]},
  {id: 15, world: 2, name: '모래 폭풍', goal: {type: 'score', target: 3000}, turns: 20, stars: [3000, 5000, 7000], obstacles: [{type: 'stone', count: 5}]},
  {id: 16, world: 2, name: '피라미드', goal: {type: 'lines', target: 10}, turns: 25, stars: [3500, 5500, 7500]},
  {id: 17, world: 2, name: '스핑크스', goal: {type: 'stone', target: 8}, turns: 25, stars: [4000, 6000, 8000], obstacles: [{type: 'stone', count: 10}]},
  {id: 18, world: 2, name: '사막의 밤', goal: {type: 'score', target: 4000}, turns: 22, stars: [4000, 6000, 8000], obstacles: [{type: 'stone', count: 4}, {type: 'ice', count: 4}]},
  {id: 19, world: 2, name: '최후 관문', goal: {type: 'lines', target: 12}, turns: 25, stars: [4500, 6500, 8500], obstacles: [{type: 'stone', count: 6}, {type: 'ice', count: 6}]},
  {id: 20, world: 2, name: '사막 보스', goal: {type: 'score', target: 5000}, turns: 25, stars: [5000, 7000, 9000], obstacles: [{type: 'stone', count: 8}, {type: 'ice', count: 8}]},
];

// Worlds
export const WORLDS = [
  {id: 1, name: '초원', color: '#22c55e', emoji: '🌿'},
  {id: 2, name: '사막', color: '#f59e0b', emoji: '🏜️'},
];

// Daily missions
export const DAILY_MISSIONS = [
  {id: 'play3', title: '게임 3판 플레이', target: 3, reward: 30, stat: 'dailyGames'},
  {id: 'score5000', title: '총 5,000점 획득', target: 5000, reward: 50, stat: 'dailyScore'},
  {id: 'lines10', title: '10줄 클리어', target: 10, reward: 40, stat: 'dailyLines'},
  {id: 'combo5', title: '5콤보 달성', target: 5, reward: 60, stat: 'dailyMaxCombo'},
  {id: 'level1', title: '레벨 1개 클리어', target: 1, reward: 30, stat: 'dailyLevelClears'},
];

// Achievements
export const ACHIEVEMENTS = [
  {id: 'firstWin', title: '첫 승리', desc: '첫 레벨 클리어', target: 1, reward: 50, stat: 'totalLevelClears'},
  {id: 'score10k', title: '만점 도전자', desc: '무한 모드 10,000점', target: 10000, reward: 100, stat: 'endlessHighScore'},
  {id: 'score50k', title: '점수 마스터', desc: '무한 모드 50,000점', target: 50000, reward: 200, stat: 'endlessHighScore'},
  {id: 'lines100', title: '줄 클리어 100', desc: '총 100줄 클리어', target: 100, reward: 80, stat: 'totalLines'},
  {id: 'lines500', title: '줄 클리어 500', desc: '총 500줄 클리어', target: 500, reward: 150, stat: 'totalLines'},
  {id: 'combo10', title: '콤보 마스터', desc: '10콤보 달성', target: 10, reward: 100, stat: 'maxCombo'},
  {id: 'levels10', title: '모험가', desc: '10레벨 클리어', target: 10, reward: 100, stat: 'totalLevelClears'},
  {id: 'levels20', title: '탐험가', desc: '20레벨 클리어', target: 20, reward: 200, stat: 'totalLevelClears'},
  {id: 'combo15', title: '콤보 달인', desc: '15콤보 달성', target: 15, reward: 150, stat: 'maxCombo'},
  {id: 'games50', title: '열정 플레이어', desc: '50판 플레이', target: 50, reward: 100, stat: 'totalGames'},
  {id: 'endless5', title: '무한 도전', desc: '무한 모드 레벨 5', target: 5, reward: 80, stat: 'endlessMaxLevel'},
  {id: 'endless10', title: '무한 마스터', desc: '무한 모드 레벨 10', target: 10, reward: 150, stat: 'endlessMaxLevel'},
];
