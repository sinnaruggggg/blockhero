import {
  DEFAULT_VISUAL_CONFIG_MANIFEST,
  getVisualElementRule,
  hasVisualElementCharacterOverride,
  sanitizeVisualConfigManifest,
} from '../src/game/visualConfig';

describe('visual config character overrides', () => {
  it('falls back to common rule when character override is missing', () => {
    const manifest = sanitizeVisualConfigManifest({
      screens: {
        ...DEFAULT_VISUAL_CONFIG_MANIFEST.screens,
        level: {
          ...DEFAULT_VISUAL_CONFIG_MANIFEST.screens.level,
          elements: {
            ...DEFAULT_VISUAL_CONFIG_MANIFEST.screens.level.elements,
            board: {
              ...DEFAULT_VISUAL_CONFIG_MANIFEST.screens.level.elements.board,
              offsetX: 12,
              offsetY: -7,
            },
          },
        },
      },
    });

    const boardRule = getVisualElementRule(manifest, 'level', 'board', 'mage');
    expect(boardRule.offsetX).toBe(12);
    expect(boardRule.offsetY).toBe(-7);
    expect(hasVisualElementCharacterOverride(manifest, 'level', 'board', 'mage')).toBe(
      false,
    );
  });

  it('uses character-specific override when present', () => {
    const manifest = sanitizeVisualConfigManifest({
      screens: {
        ...DEFAULT_VISUAL_CONFIG_MANIFEST.screens,
        battle: {
          ...DEFAULT_VISUAL_CONFIG_MANIFEST.screens.battle,
          characterElements: {
            mage: {
              next_preview: {
                ...DEFAULT_VISUAL_CONFIG_MANIFEST.screens.battle.elements.next_preview,
                offsetX: 44,
                scale: 1.2,
              },
            },
          },
        },
      },
    });

    const previewRule = getVisualElementRule(
      manifest,
      'battle',
      'next_preview',
      'mage',
    );
    expect(previewRule.offsetX).toBe(44);
    expect(previewRule.scale).toBeCloseTo(1.2, 5);
    expect(
      hasVisualElementCharacterOverride(manifest, 'battle', 'next_preview', 'mage'),
    ).toBe(true);
  });
});
