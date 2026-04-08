import {
  collectReferencedVisualAssetKeys,
  DEFAULT_VISUAL_CONFIG_MANIFEST,
  getLevelBackgroundOverride,
  getRaidBackgroundOverride,
  resolveVisualOffset,
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

  it('sanitizes and preserves reference viewport metadata', () => {
    const manifest = sanitizeVisualConfigManifest({
      version: 3,
      referenceViewport: {
        width: 430,
        height: 932,
        safeTop: 59,
        safeBottom: 34,
      },
    });

    expect(manifest.referenceViewport).toEqual({
      width: 430,
      height: 932,
      safeTop: 59,
      safeBottom: 34,
    });
  });

  it('scales offsets against the reference viewport', () => {
    expect(
      resolveVisualOffset(
        40,
        60,
        {width: 360, height: 800, safeTop: 28, safeBottom: 24},
        {width: 412, height: 915, safeTop: 34, safeBottom: 34},
      ),
    ).toEqual({
      x: 35,
      y: 52,
    });
  });

  it('uses safe area aware height scaling when requested', () => {
    expect(
      resolveVisualOffset(
        0,
        100,
        {width: 393, height: 852, safeTop: 59, safeBottom: 34},
        {width: 412, height: 915, safeTop: 34, safeBottom: 34},
        true,
      ),
    ).toEqual({
      x: 0,
      y: 90,
    });
  });
});
