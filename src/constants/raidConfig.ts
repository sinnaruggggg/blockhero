export interface TierConfig {
  tier: number;
  stages: number[];
  cooldownMs: number;
  label: string;
}

export const ATTACK_WINDOW_MS = 10 * 60 * 1000;
export const BOSS_RAID_INTERVAL_MS = 4 * 60 * 60 * 1000;
export const MAX_RAID_PLAYERS = 30;
export const MAX_PARTY_SIZE = 5;

export const TIER_CONFIGS: TierConfig[] = [
  {tier: 1, stages: [1, 2], cooldownMs: 0, label: '1~2단계'},
  {tier: 2, stages: [3, 4], cooldownMs: 0, label: '3~4단계'},
  {tier: 3, stages: [5, 6], cooldownMs: 0, label: '5~6단계'},
  {tier: 4, stages: [7, 8], cooldownMs: 0, label: '7~8단계'},
  {tier: 5, stages: [9, 10], cooldownMs: 0, label: '9~10단계'},
];

export function getTierForStage(stage: number): number {
  return Math.max(1, Math.ceil(stage / 2));
}

export function getCooldownMs(tier: number): number {
  const config = TIER_CONFIGS.find(entry => entry.tier === tier);
  return config?.cooldownMs ?? 0;
}

export function formatCooldown(remainingMs: number): string {
  if (remainingMs <= 0) {
    return 'READY';
  }

  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  const mins = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  const secs = Math.floor((remainingMs % (60 * 1000)) / 1000);

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }

  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }

  return `${secs}s`;
}

export function formatAttackTimer(remainingMs: number): string {
  if (remainingMs <= 0) {
    return '0:00';
  }

  const mins = Math.floor(remainingMs / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
