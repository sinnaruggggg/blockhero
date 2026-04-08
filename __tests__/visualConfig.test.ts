import {
  collectReferencedVisualAssetKeys,
  DEFAULT_VISUAL_CONFIG_MANIFEST,
  getLevelBackgroundOverride,
  getRaidBackgroundOverride,
  sanitizeVisualConfigManifest,
} from '../src/game/visualConfig';

describe('visualConfig helpers', () => {
  it('prioritizes level-specific background over world background', () => {
    const manifest = sanitizeVisualConfigManifest({
      screens: {
        ...DEFAULT_VISUAL_CONFIG_MANIFEST.screens,
        level: {
          ...DEFAULT_VISUAL_CONFIG_MANIFEST.screens.level,
          backgrounds: {
            byWorld: {
              '1': {
                assetKey: 'world-bg',
                tintColor: '#112233',
                tintOpacity: 0.4,
                removeImage: false,
              },
            },
            byLevel: {
              '3': {
                assetKey: 'level-bg',
                tintColor: '#445566',
                tintOpacity: 0.7,
                removeImage: false,
              },
            },
          },
        },
      },
    });

    expect(getLevelBackgroundOverride(manifest, 3, 1)?.assetKey).toBe('level-bg');
    expect(getLevelBackgroundOverride(manifest, 9, 1)?.assetKey).toBe('world-bg');
  });

  it('returns raid background override by boss stage', () => {
    const manifest = sanitizeVisualConfigManifest({
      screens: {
        ...DEFAULT_VISUAL_CONFIG_MANIFEST.screens,
        raid: {
          ...DEFAULT_VISUAL_CONFIG_MANIFEST.screens.raid,
          backgrounds: {
            byBossStage: {
              '5': {
                assetKey: 'raid-bg',
                tintColor: '#000000',
                tintOpacity: 0.5,
                removeImage: false,
              },
            },
          },
        },
      },
    });

    expect(getRaidBackgroundOverride(manifest, 5)?.assetKey).toBe('raid-bg');
    expect(getRaidBackgroundOverride(manifest, 1)).toBeNull();
  });

  it('collects referenced asset keys without duplicates', () => {
    const manifest = sanitizeVisualConfigManifest({
      screens: {
        ...DEFAULT_VISUAL_CONFIG_MANIFEST.screens,
        level: {
          ...DEFAULT_VISUAL_CONFIG_MANIFEST.screens.level,
          backgrounds: {
            byWorld: {
              '1': {
                assetKey: 'shared-bg',
                tintColor: '#000000',
                tintOpacity: 0.2,
                removeImage: false,
              },
            },
            byLevel: {
              '7': {
                assetKey: 'shared-bg',
                tintColor: '#000000',
                tintOpacity: 0.2,
                removeImage: false,
              },
            },
          },
        },
        raid: {
          ...DEFAULT_VISUAL_CONFIG_MANIFEST.screens.raid,
          backgrounds: {
            byBossStage: {
              '2': {
                assetKey: 'raid-only-bg',
                tintColor: '#000000',
                tintOpacity: 0.3,
                removeImage: false,
              },
            },
          },
        },
      },
    });

    expect(collectReferencedVisualAssetKeys(manifest).sort()).toEqual([
      'raid-only-bg',
      'shared-bg',
    ]);
  });
});
