import {
  BOSS_RAID_INTERVAL_MS,
  BOSS_RAID_WINDOW_MS,
  NORMAL_RAID_REWARDS,
} from '../constants';
import type {NormalRaidProgress} from '../stores/gameStore';

export interface BossRaidWindowInfo {
  isOpen: boolean;
  windowStartAt: number;
  windowEndAt: number;
  nextWindowAt: number;
  remainingMs: number;
}

export function getBossRaidWindowInfo(
  now = Date.now(),
  intervalMs = BOSS_RAID_INTERVAL_MS,
  windowMs = BOSS_RAID_WINDOW_MS,
): BossRaidWindowInfo {
  const currentWindowStart = Math.floor(now / intervalMs) * intervalMs;
  const elapsed = now - currentWindowStart;
  const isOpen = elapsed < windowMs;
  const windowStartAt = isOpen ? currentWindowStart : currentWindowStart + intervalMs;
  const windowEndAt = windowStartAt + windowMs;

  return {
    isOpen,
    windowStartAt,
    windowEndAt,
    nextWindowAt: isOpen ? windowEndAt : windowStartAt,
    remainingMs: isOpen ? windowEndAt - now : windowStartAt - now,
  };
}

export function isBossRaidWindowOpen(now = Date.now()): boolean {
  return getBossRaidWindowInfo(now).isOpen;
}

export interface NormalRaidRewardPreview {
  diamonds: number;
  killCountAfter: number;
  firstClearReward: boolean;
  unlocksSkin: boolean;
}

export function getNormalRaidRewardPreview(
  stage: number,
  progress: NormalRaidProgress,
): NormalRaidRewardPreview {
  const reward = NORMAL_RAID_REWARDS.find(entry => entry.stage === stage);
  if (!reward) {
    return {
      diamonds: 0,
      killCountAfter: progress[stage]?.killCount ?? 0,
      firstClearReward: false,
      unlocksSkin: false,
    };
  }

  const stageProgress = progress[stage];
  const killCountBefore = stageProgress?.killCount ?? 0;
  const killCountAfter = killCountBefore + 1;
  const firstClearReward = !stageProgress?.firstClearDiaClaimed;

  return {
    diamonds: firstClearReward ? reward.firstDia : reward.perKill,
    killCountAfter,
    firstClearReward,
    unlocksSkin: killCountAfter >= 10 && killCountBefore < 10,
  };
}

export function formatBossRaidCountdownLabel(now = Date.now()): string {
  const windowInfo = getBossRaidWindowInfo(now);
  const totalSeconds = Math.max(0, Math.floor(windowInfo.remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (windowInfo.isOpen) {
    return `진행 중 ${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }

  return `${minutes}분 ${seconds}초`;
}
