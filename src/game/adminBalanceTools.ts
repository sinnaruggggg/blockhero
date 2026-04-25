import {
  cloneCreatorManifest,
  type CreatorCharacterBalanceConfig,
  type CreatorManifest,
} from './creatorManifest';
import {
  SKILL_EFFECT_NUMERIC_FIELDS,
  type SkillEffectFieldDefinition,
  getSkillEffectFieldDefinition,
} from './skillEffectCatalog';

export type EncounterBalanceField = 'baseHp' | 'baseAttack' | 'attackIntervalMs';
export type CharacterBalanceField =
  | 'baseAtk'
  | 'atkPerLevel'
  | 'baseHp'
  | 'hpPerLevel';

export const ENCOUNTER_BALANCE_FIELD_DEFINITIONS: Array<{
  key: EncounterBalanceField;
  label: string;
}> = [
  {key: 'baseHp', label: '체력'},
  {key: 'baseAttack', label: '공격력'},
  {key: 'attackIntervalMs', label: '공격 주기(ms)'},
];

export const CHARACTER_BALANCE_FIELD_DEFINITIONS: Array<{
  key: CharacterBalanceField;
  label: string;
}> = [
  {key: 'baseAtk', label: '기본 공격력'},
  {key: 'atkPerLevel', label: '레벨당 공격력'},
  {key: 'baseHp', label: '기본 체력'},
  {key: 'hpPerLevel', label: '레벨당 체력'},
];

function applyPercent(value: number, percent: number) {
  return value * (1 + percent / 100);
}

function roundBalanceField(
  field: EncounterBalanceField | CharacterBalanceField,
  value: number,
) {
  if (field === 'attackIntervalMs') {
    return Math.max(250, Math.round(value));
  }
  return Math.max(1, Math.round(value));
}

export function getLevelEncounterIdsByWorld(
  manifest: CreatorManifest,
  worldId: number,
) {
  return Object.values(manifest.levels)
    .filter(level => level.worldId === worldId)
    .map(level => level.enemyTemplateId);
}

export function getRaidEncounterIds(
  manifest: CreatorManifest,
  raidType: 'normal' | 'boss',
) {
  return Object.values(manifest.raids[raidType]).map(raid => raid.encounterTemplateId);
}

export function applyPercentToEncounterFields(
  manifest: CreatorManifest,
  encounterIds: string[],
  fields: EncounterBalanceField[],
  percent: number,
) {
  const nextManifest = cloneCreatorManifest(manifest);
  const idSet = new Set(encounterIds);

  Object.values(nextManifest.encounters).forEach(encounter => {
    if (!idSet.has(encounter.id)) {
      return;
    }

    fields.forEach(field => {
      encounter[field] = roundBalanceField(
        field,
        applyPercent(encounter[field], percent),
      ) as never;
    });
  });

  return nextManifest;
}

export function applyPercentToCharacterFields(
  manifest: CreatorManifest,
  characterIds: string[],
  fields: CharacterBalanceField[],
  percent: number,
) {
  const nextManifest = cloneCreatorManifest(manifest);

  characterIds.forEach(characterId => {
    const character = nextManifest.balance.characters[characterId];
    if (!character) {
      return;
    }

    fields.forEach(field => {
      character[field] = roundBalanceField(
        field,
        applyPercent(character[field], percent),
      ) as never;
    });
  });

  return nextManifest;
}

function roundSkillMultiplier(field: SkillEffectFieldDefinition, value: number) {
  const clamped = Math.max(0, Math.min(10, value));
  return field.type === 'int' ? Number(clamped.toFixed(2)) : Number(clamped.toFixed(3));
}

export function applyPercentToSkillFields(
  manifest: CreatorManifest,
  characterIds: string[],
  fields: typeof SKILL_EFFECT_NUMERIC_FIELDS,
  percent: number,
) {
  const nextManifest = cloneCreatorManifest(manifest);

  characterIds.forEach(characterId => {
    const target = nextManifest.balance.skillEffects.characters[characterId];
    if (!target) {
      return;
    }

    fields.forEach(fieldKey => {
      const field = getSkillEffectFieldDefinition(fieldKey);
      const currentValue = target.numeric[fieldKey] ?? 1;
      target.numeric[fieldKey] = roundSkillMultiplier(
        field,
        applyPercent(currentValue, percent),
      );
    });
  });

  return nextManifest;
}

export function applyPercentToGlobalSkillFields(
  manifest: CreatorManifest,
  fields: typeof SKILL_EFFECT_NUMERIC_FIELDS,
  percent: number,
) {
  const nextManifest = cloneCreatorManifest(manifest);
  fields.forEach(fieldKey => {
    const field = getSkillEffectFieldDefinition(fieldKey);
    const currentValue = nextManifest.balance.skillEffects.global.numeric[fieldKey] ?? 1;
    nextManifest.balance.skillEffects.global.numeric[fieldKey] = roundSkillMultiplier(
      field,
      applyPercent(currentValue, percent),
    );
  });
  return nextManifest;
}

export function listCharacterBalanceEntries(manifest: CreatorManifest) {
  return Object.values(manifest.balance.characters).sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

export function patchCharacterBalance(
  manifest: CreatorManifest,
  characterId: string,
  patch: Partial<CreatorCharacterBalanceConfig>,
) {
  const nextManifest = cloneCreatorManifest(manifest);
  const current = nextManifest.balance.characters[characterId];
  if (!current) {
    return nextManifest;
  }

  nextManifest.balance.characters[characterId] = {
    ...current,
    ...patch,
  };
  return nextManifest;
}
