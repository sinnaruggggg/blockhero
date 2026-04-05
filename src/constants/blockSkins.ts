// Block skin definitions
// id 0 = default, id 1-20 = boss drop skins

export interface BlockSkin {
  id: number;
  nameKey: string;
  colors: string[];
  boardBg: string;
}

export const BLOCK_SKINS: BlockSkin[] = [
  // Default
  {id: 0, nameKey: 'skin.default', boardBg: '#0a0820', colors: [
    '#ec4899', '#f472b6', '#8b5cf6', '#a78bfa',
    '#06b6d4', '#22d3ee', '#ef4444', '#f87171',
    '#22c55e', '#4ade80', '#f59e0b', '#fbbf24',
  ]},
  // Boss 1: Slime Green
  {id: 1, nameKey: 'skin.slime', boardBg: '#071a0a', colors: [
    '#22c55e', '#4ade80', '#86efac', '#a7f3d0',
    '#16a34a', '#15803d', '#34d399', '#6ee7b7',
    '#10b981', '#059669', '#bbf7d0', '#dcfce7',
  ]},
  // Boss 2: Toxic Purple
  {id: 2, nameKey: 'skin.toxic', boardBg: '#0f0720', colors: [
    '#a855f7', '#c084fc', '#7c3aed', '#8b5cf6',
    '#d946ef', '#e879f9', '#6d28d9', '#5b21b6',
    '#a78bfa', '#c4b5fd', '#f0abfc', '#e9d5ff',
  ]},
  // Boss 3: Thorn Rose
  {id: 3, nameKey: 'skin.thorn', boardBg: '#1a0a0a', colors: [
    '#e11d48', '#f43f5e', '#fb7185', '#fda4af',
    '#be123c', '#9f1239', '#ff6b8a', '#ff8fa3',
    '#fecdd3', '#ffe4e6', '#f87171', '#ef4444',
  ]},
  // Boss 4: Water Blue
  {id: 4, nameKey: 'skin.water', boardBg: '#061520', colors: [
    '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd',
    '#0284c7', '#0369a1', '#06b6d4', '#22d3ee',
    '#67e8f9', '#a5f3fc', '#0891b2', '#0e7490',
  ]},
  // Boss 5: Tidal Cyan
  {id: 5, nameKey: 'skin.tidal', boardBg: '#041a1a', colors: [
    '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc',
    '#0891b2', '#0e7490', '#14b8a6', '#2dd4bf',
    '#5eead4', '#99f6e4', '#0d9488', '#0f766e',
  ]},
  // Boss 6: Magic Crystal
  {id: 6, nameKey: 'skin.crystal', boardBg: '#0d0825', colors: [
    '#818cf8', '#a5b4fc', '#6366f1', '#4f46e5',
    '#c7d2fe', '#e0e7ff', '#8b5cf6', '#a78bfa',
    '#7c3aed', '#6d28d9', '#c4b5fd', '#ddd6fe',
  ]},
  // Boss 7: Thunder Yellow
  {id: 7, nameKey: 'skin.thunder', boardBg: '#1a1500', colors: [
    '#fbbf24', '#f59e0b', '#fcd34d', '#fde68a',
    '#d97706', '#b45309', '#eab308', '#facc15',
    '#fef08a', '#fef9c3', '#ca8a04', '#a16207',
  ]},
  // Boss 8: Vortex Indigo
  {id: 8, nameKey: 'skin.vortex', boardBg: '#0a0530', colors: [
    '#4f46e5', '#6366f1', '#818cf8', '#a5b4fc',
    '#3730a3', '#312e81', '#4338ca', '#5b21b6',
    '#7c3aed', '#8b5cf6', '#c4b5fd', '#c7d2fe',
  ]},
  // Boss 9: Diamond White
  {id: 9, nameKey: 'skin.diamond', boardBg: '#101020', colors: [
    '#e2e8f0', '#cbd5e1', '#f1f5f9', '#f8fafc',
    '#94a3b8', '#64748b', '#bfdbfe', '#93c5fd',
    '#a5f3fc', '#d1fae5', '#fecaca', '#fef3c7',
  ]},
  // Boss 10: Crown Gold
  {id: 10, nameKey: 'skin.crown', boardBg: '#1a1000', colors: [
    '#fbbf24', '#f59e0b', '#d97706', '#b45309',
    '#fcd34d', '#fde68a', '#eab308', '#ca8a04',
    '#a16207', '#854d0e', '#fef08a', '#fef9c3',
  ]},
  // Boss 11: Flame Red
  {id: 11, nameKey: 'skin.flame', boardBg: '#200505', colors: [
    '#ef4444', '#f87171', '#dc2626', '#b91c1c',
    '#fca5a5', '#fecaca', '#f97316', '#fb923c',
    '#fdba74', '#fed7aa', '#ea580c', '#c2410c',
  ]},
  // Boss 12: Meteor Orange
  {id: 12, nameKey: 'skin.meteor', boardBg: '#200d00', colors: [
    '#f97316', '#fb923c', '#fdba74', '#fed7aa',
    '#ea580c', '#c2410c', '#f59e0b', '#fbbf24',
    '#ef4444', '#f87171', '#d97706', '#b45309',
  ]},
  // Boss 13: Skull Dark
  {id: 13, nameKey: 'skin.skull', boardBg: '#0a0a0a', colors: [
    '#475569', '#64748b', '#94a3b8', '#cbd5e1',
    '#334155', '#1e293b', '#6b7280', '#9ca3af',
    '#d1d5db', '#e5e7eb', '#4b5563', '#374151',
  ]},
  // Boss 14: Oni Red-Black
  {id: 14, nameKey: 'skin.oni', boardBg: '#150000', colors: [
    '#dc2626', '#991b1b', '#7f1d1d', '#450a0a',
    '#ef4444', '#b91c1c', '#f87171', '#fca5a5',
    '#374151', '#1f2937', '#4b5563', '#6b7280',
  ]},
  // Boss 15: Dragon Fire
  {id: 15, nameKey: 'skin.dragon', boardBg: '#1a0800', colors: [
    '#ef4444', '#f97316', '#fbbf24', '#f59e0b',
    '#dc2626', '#ea580c', '#d97706', '#b91c1c',
    '#fb923c', '#fdba74', '#fcd34d', '#fde68a',
  ]},
  // Boss 16: Volcano Magma
  {id: 16, nameKey: 'skin.volcano', boardBg: '#200200', colors: [
    '#991b1b', '#dc2626', '#ef4444', '#f87171',
    '#7f1d1d', '#450a0a', '#f97316', '#fb923c',
    '#fdba74', '#ea580c', '#b91c1c', '#fca5a5',
  ]},
  // Boss 17: War Steel
  {id: 17, nameKey: 'skin.war', boardBg: '#0d0d12', colors: [
    '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0',
    '#475569', '#334155', '#dc2626', '#ef4444',
    '#f87171', '#6b7280', '#9ca3af', '#d1d5db',
  ]},
  // Boss 18: Kraken Deep
  {id: 18, nameKey: 'skin.kraken', boardBg: '#020815', colors: [
    '#1e3a5f', '#2563eb', '#3b82f6', '#60a5fa',
    '#1d4ed8', '#1e40af', '#6366f1', '#818cf8',
    '#93c5fd', '#bfdbfe', '#4f46e5', '#a5b4fc',
  ]},
  // Boss 19: Dragon Lord
  {id: 19, nameKey: 'skin.dragonLord', boardBg: '#100020', colors: [
    '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd',
    '#6d28d9', '#5b21b6', '#ef4444', '#f87171',
    '#fbbf24', '#f59e0b', '#dc2626', '#d946ef',
  ]},
  // Boss 20: BlockHero Overlord - Rainbow
  {id: 20, nameKey: 'skin.overlord', boardBg: '#050510', colors: [
    '#ef4444', '#f97316', '#fbbf24', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef',
    '#ec4899', '#14b8a6', '#eab308', '#6366f1',
  ]},
];
