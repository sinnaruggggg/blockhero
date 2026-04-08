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
      studioSnapshots: {
        level: {
          assetKey: 'runtime-level-shot',
          capturedAt: '2026-04-08T10:00:00.000Z',
          viewport: {width: 412, height: 915, safeTop: 34, safeBottom: 34},
          referenceViewport: {width: 412, height: 915, safeTop: 34, safeBottom: 34},
          elementFrames: {
            board: {x: 20, y: 300, width: 340, height: 340},
          },
          elementRules: {
            board: {
              offsetX: 0,
              offsetY: 0,
              scale: 1,
              opacity: 1,
              visible: true,
              zIndex: 0,
              safeAreaAware: false,
            },
          },
        },
      },
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
      'runtime-level-shot',
      'shared-bg',
    ]);
  });

  it('sanitizes studio snapshot metadata', () => {
    const manifest = sanitizeVisualConfigManifest({
      studioSnapshots: {
        raid: {
          assetKey: ' studio-shot ',
          capturedAt: '2026-04-08T11:00:00.000Z',
          viewport: {width: 430, height: 932, safeTop: 59, safeBottom: 34},
          referenceViewport: {width: 412, height: 915, safeTop: 34, safeBottom: 34},
          elementFrames: {
            board: {x: 24.6, y: 320.1, width: 344.4, height: 344.8},
          },
          elementRules: {
            board: {
              offsetX: 12.4,
              offsetY: -6.2,
              scale: 1.1,
              opacity: 0.9,
              visible: true,
              zIndex: 3,
              safeAreaAware: false,
            },
          },
        },
      },
    });

    expect(manifest.studioSnapshots?.raid?.assetKey).toBe('studio-shot');
    expect(manifest.studioSnapshots?.raid?.elementFrames.board).toEqual({
      x: 25,
      y: 320,
      width: 344,
      height: 345,
    });
    expect(manifest.studioSnapshots?.raid?.elementRules.board.offsetX).toBe(12);
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
