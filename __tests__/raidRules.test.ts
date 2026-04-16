import {RAID_BOSSES} from '../src/constants/raidBosses';
import {MAX_RAID_PLAYERS} from '../src/constants/raidConfig';
import {
  formatBossRaidCountdownLabel,
  getBossRaidWindowInfo,
  getNormalRaidRewardPreview,
} from '../src/game/raidRules';

describe('raid rules', () => {
  test('boss raid is configured for 10 stages with doubled max hp', () => {
    expect(RAID_BOSSES).toHaveLength(10);
    expect(MAX_RAID_PLAYERS).toBe(30);
    expect(RAID_BOSSES.map(boss => boss.maxHp)).toEqual([
      4000000,
      8000000,
      12000000,
      16000000,
      20000000,
      24000000,
      28000000,
      32000000,
      36000000,
      40000000,
    ]);
  });

  test('boss raid window opens for 10 minutes every 4 hours', () => {
    const closed = getBossRaidWindowInfo(10 * 60 * 1000 + 1);
    expect(closed.isOpen).toBe(false);
    expect(closed.windowStartAt).toBe(4 * 60 * 60 * 1000);

    const open = getBossRaidWindowInfo(4 * 60 * 60 * 1000 + 2 * 60 * 1000);
    expect(open.isOpen).toBe(true);
    expect(open.windowEndAt).toBe(4 * 60 * 60 * 1000 + 10 * 60 * 1000);
    expect(formatBossRaidCountdownLabel(4 * 60 * 60 * 1000 + 9 * 60 * 1000)).toContain('진행 중');
  });

  test('normal raid rewards use first-clear diamonds and unlock skin on 10th kill', () => {
    const firstClear = getNormalRaidRewardPreview(1, {});
    expect(firstClear.diamonds).toBe(15);
    expect(firstClear.firstClearReward).toBe(true);
    expect(firstClear.killCountAfter).toBe(1);
    expect(firstClear.unlocksSkin).toBe(false);

    const repeat = getNormalRaidRewardPreview(1, {
      1: {firstCleared: true, killCount: 4, firstClearDiaClaimed: true},
    });
    expect(repeat.diamonds).toBe(1);
    expect(repeat.firstClearReward).toBe(false);
    expect(repeat.killCountAfter).toBe(5);

    const unlock = getNormalRaidRewardPreview(2, {
      2: {firstCleared: true, killCount: 9, firstClearDiaClaimed: true},
    });
    expect(unlock.diamonds).toBe(1);
    expect(unlock.unlocksSkin).toBe(true);
    expect(unlock.killCountAfter).toBe(10);
  });
});
