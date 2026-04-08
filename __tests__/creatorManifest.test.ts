import {
  buildDefaultCreatorManifest,
  collectReferencedCreatorAssetKeys,
  resolveCreatorLevelRuntime,
  resolveCreatorRaidRuntime,
} from '../src/game/creatorManifest';
import {LEVELS, NORMAL_RAID_REWARDS} from '../src/constants';
import {RAID_BOSSES} from '../src/constants/raidBosses';

describe('creatorManifest helpers', () => {
  it('seeds default creator data from current game constants', () => {
    const manifest = buildDefaultCreatorManifest();

    expect(Object.keys(manifest.levels)).toHaveLength(LEVELS.length);
    expect(Object.keys(manifest.raids.normal)).toHaveLength(NORMAL_RAID_REWARDS.length);
    expect(Object.keys(manifest.raids.boss)).toHaveLength(RAID_BOSSES.length);
    expect(Object.keys(manifest.encounters).length).toBeGreaterThan(LEVELS.length);
  });

  it('resolves level runtime with encounter overrides', () => {
    const manifest = buildDefaultCreatorManifest();
    manifest.levels['1'] = {
      ...manifest.levels['1'],
      name: 'Custom Stage',
      goalValue: 250,
      enemyOverrides: {
        monsterName: 'Custom Slime',
        monsterEmoji: 'S',
        monsterColor: '#ff00aa',
        baseHp: 250,
        baseAttack: 19,
        attackIntervalMs: 4200,
      },
      reward: {
        repeatGold: 10,
        firstClearBonusGold: 20,
        characterExp: 30,
      },
      background: {
        assetKey: 'level-bg',
        tintColor: '#102030',
        tintOpacity: 0.35,
        removeImage: false,
      },
    };

    const runtime = resolveCreatorLevelRuntime(manifest, 1);

    expect(runtime?.name).toBe('Custom Stage');
    expect(runtime?.monsterName).toBe('Custom Slime');
    expect(runtime?.monsterEmoji).toBe('S');
    expect(runtime?.monsterColor).toBe('#ff00aa');
    expect(runtime?.monsterHp).toBe(250);
    expect(runtime?.enemyAttack).toBe(19);
    expect(runtime?.attackIntervalMs).toBe(4200);
    expect(runtime?.background.assetKey).toBe('level-bg');
  });

  it('resolves raid runtime with boss overrides', () => {
    const manifest = buildDefaultCreatorManifest();
    manifest.raids.boss['2'] = {
      ...manifest.raids.boss['2'],
      name: 'Ancient Hydra',
      encounterOverrides: {
        monsterEmoji: 'H',
        monsterColor: '#44ff88',
        baseHp: 99999,
        baseAttack: 88,
        attackIntervalMs: 2400,
      },
      reward: {
        firstClearDiamondReward: 75,
        repeatDiamondReward: 9,
      },
      timeLimitMs: 480000,
      raidWindowHours: 4,
      joinWindowMinutes: 15,
      maxParticipants: 8,
      background: {
        assetKey: 'raid-bg',
        tintColor: '#000000',
        tintOpacity: 0.45,
        removeImage: false,
      },
    };

    const runtime = resolveCreatorRaidRuntime(manifest, 'boss', 2);

    expect(runtime?.name).toBe('Ancient Hydra');
    expect(runtime?.monsterEmoji).toBe('H');
    expect(runtime?.monsterColor).toBe('#44ff88');
    expect(runtime?.maxHp).toBe(99999);
    expect(runtime?.enemyAttack).toBe(88);
    expect(runtime?.attackIntervalMs).toBe(2400);
    expect(runtime?.reward.firstClearDiamondReward).toBe(75);
    expect(runtime?.maxParticipants).toBe(8);
  });

  it('collects referenced background asset keys without duplicates', () => {
    const manifest = buildDefaultCreatorManifest();
    manifest.levels['1'] = {
      ...manifest.levels['1'],
      background: {
        assetKey: 'shared-bg',
        tintColor: '#000000',
        tintOpacity: 0.3,
        removeImage: false,
      },
    };
    manifest.raids.normal['1'] = {
      ...manifest.raids.normal['1'],
      background: {
        assetKey: 'shared-bg',
        tintColor: '#111111',
        tintOpacity: 0.5,
        removeImage: false,
      },
    };
    manifest.raids.boss['1'] = {
      ...manifest.raids.boss['1'],
      background: {
        assetKey: 'boss-bg',
        tintColor: '#222222',
        tintOpacity: 0.6,
        removeImage: false,
      },
    };

    expect(collectReferencedCreatorAssetKeys(manifest).sort()).toEqual([
      'boss-bg',
      'shared-bg',
    ]);
  });
});
