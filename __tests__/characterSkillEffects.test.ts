import {
  applyCombatDamageEffects,
  applyCombatDamageEffectsDetailed,
  applyDamageTakenReduction,
  getCharacterSkillEffects,
  getDynamicHeartCap,
  getDynamicItemCapPerType,
} from '../src/game/characterSkillEffects';
import { MAX_HEARTS } from '../src/constants';
import type { CharacterData } from '../src/stores/gameStore';

function makeCharacterData(characterId: string): CharacterData {
  return {
    characterId,
    level: 10,
    xp: 0,
    skillPoints: 0,
    personalAllocations: Array(10).fill(0),
    partyAllocations: Array(10).fill(0),
  };
}

describe('character skill effects', () => {
  test('knight personal and raid buffs affect defense and raid damage', () => {
    const data = makeCharacterData('knight');
    data.personalAllocations[0] = 5;
    data.personalAllocations[1] = 5;
    data.partyAllocations[2] = 5;
    data.partyAllocations[5] = 5;

    const effects = getCharacterSkillEffects('knight', data, {
      mode: 'raid',
      partySize: 3,
      bossHpRatio: 0.15,
    });

    expect(applyDamageTakenReduction(100, effects)).toBe(70);
    expect(effects.raidDamageMultiplier).toBeCloseTo(1.35, 5);
    expect(
      applyCombatDamageEffects(100, effects, {
        combo: 2,
        didClear: true,
        feverActive: false,
        isRaid: true,
      }),
    ).toBe(149);
  });

  test('archer and mage modify fever thresholds and raid time', () => {
    const archer = makeCharacterData('archer');
    archer.personalAllocations[8] = 5;
    const archerEffects = getCharacterSkillEffects('archer', archer, {
      mode: 'level',
    });
    expect(archerEffects.feverRequirementMultiplier).toBeCloseTo(0.7, 5);

    const mage = makeCharacterData('mage');
    mage.personalAllocations[0] = 5;
    mage.partyAllocations[1] = 1;
    mage.partyAllocations[2] = 5;
    mage.partyAllocations[3] = 5;
    mage.partyAllocations[6] = 5;
    const mageEffects = getCharacterSkillEffects('mage', mage, {
      mode: 'raid',
    });
    expect(mageEffects.previewCountBonus).toBe(3);
    expect(mageEffects.raidTimeBonusMs).toBe(15000);
    expect(mageEffects.lineClearDamageBonus).toBeCloseTo(0.12, 5);
    expect(mageEffects.comboWindowBonusMs).toBe(5000);
  });

  test('rogue and healer change inventory, shop, and hearts', () => {
    const rogue = makeCharacterData('rogue');
    rogue.personalAllocations[8] = 5;
    rogue.personalAllocations[9] = 5;
    const rogueEffects = getCharacterSkillEffects('rogue', rogue, {
      mode: 'level',
    });
    expect(getDynamicItemCapPerType(2, rogueEffects)).toBe(3);
    expect(rogueEffects.shopGoldDiscount).toBeCloseTo(0.15, 5);

    const healer = makeCharacterData('healer');
    healer.personalAllocations[0] = 5;
    healer.personalAllocations[3] = 5;
    healer.personalAllocations[7] = 5;
    const healerEffects = getCharacterSkillEffects('healer', healer, {
      mode: 'level',
    });
    expect(MAX_HEARTS).toBe(20);
    expect(getDynamicHeartCap(10, healerEffects)).toBe(11);
    expect(healerEffects.autoHealIntervalMs).toBe(60000);
    expect(healerEffects.autoHealPercent).toBeCloseTo(0.1, 5);
    expect(healerEffects.itemPreserveChance).toBeCloseTo(0.2, 5);
  });

  test('knight raid gauge and party defense buffs are applied', () => {
    const knight = makeCharacterData('knight');
    knight.personalAllocations[2] = 5;
    knight.partyAllocations[0] = 5;
    knight.partyAllocations[6] = 5;

    const effects = getCharacterSkillEffects('knight', knight, {
      mode: 'raid',
    });
    expect(effects.raidSkillChargeGainMultiplier).toBeCloseTo(1.3, 5);
    expect(effects.damageTakenReduction).toBeCloseTo(0.15, 5);
  });

  test('knight battle-only passives only apply in battle mode', () => {
    const knight = makeCharacterData('knight');
    knight.personalAllocations[3] = 5;
    knight.personalAllocations[7] = 5;

    const battleEffects = getCharacterSkillEffects('knight', knight, {
      mode: 'battle',
    });
    const levelEffects = getCharacterSkillEffects('knight', knight, {
      mode: 'level',
    });

    expect(battleEffects.battleExtraAttackLineChance).toBeCloseTo(0.5, 5);
    expect(battleEffects.battleCounterAttackChance).toBeCloseTo(0.25, 5);
    expect(levelEffects.battleExtraAttackLineChance).toBe(0);
    expect(levelEffects.battleCounterAttackChance).toBe(0);
  });

  test('knight banner stacks attack by consecutive next-level clears', () => {
    const knight = makeCharacterData('knight');
    knight.personalAllocations[4] = 5;

    const idleEffects = getCharacterSkillEffects('knight', knight, {
      mode: 'level',
      levelModeBreakthroughCount: 0,
    });
    const streakEffects = getCharacterSkillEffects('knight', knight, {
      mode: 'level',
      levelModeBreakthroughCount: 20,
    });

    expect(idleEffects.levelModeBreakthroughAttackPerClear).toBeCloseTo(
      0.05,
      5,
    );
    expect(streakEffects.baseAttackMultiplier).toBeCloseTo(2, 5);
  });

  test('fast placement returns trigger detail and bonus amount', () => {
    const archer = makeCharacterData('archer');
    archer.personalAllocations[1] = 5;

    const effects = getCharacterSkillEffects('archer', archer, {
      mode: 'level',
    });
    const result = applyCombatDamageEffectsDetailed(100, effects, {
      combo: 0,
      didClear: false,
      feverActive: false,
      fastPlacement: true,
    });

    expect(result.amount).toBe(120);
    expect(result.events).toContain('fast_placement');
    expect(result.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'fast_placement',
          bonusAmount: 20,
        }),
      ]),
    );
  });
});
