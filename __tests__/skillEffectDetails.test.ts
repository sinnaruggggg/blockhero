import { getSkillEffectDetail } from '../src/game/skillEffectDetails';
import type { CharacterData } from '../src/stores/gameStore';

function createCharacterData(
  overrides: Partial<CharacterData> = {},
): CharacterData {
  return {
    characterId: 'knight',
    level: 1,
    xp: 0,
    skillPoints: 0,
    personalAllocations: Array(10).fill(0),
    partyAllocations: Array(10).fill(0),
    ...overrides,
  };
}

describe('getSkillEffectDetail', () => {
  it('describes current and next values for additive passive skills', () => {
    const detail = getSkillEffectDetail(
      'knight',
      createCharacterData({
        personalAllocations: [0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
      }),
      'personal',
      1,
    );

    expect(detail.currentLines).toContain('콤보 피해 +4%');
    expect(detail.nextLines).toContain('콤보 피해 +2%');
  });

  it('includes composite healing details for healer passive skills', () => {
    const detail = getSkillEffectDetail(
      'healer',
      createCharacterData({
        characterId: 'healer',
        personalAllocations: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      }),
      'personal',
      0,
    );

    expect(detail.currentLines).toContain('자동 회복 주기 60초');
    expect(detail.currentLines).toContain('자동 회복량 4%');
  });

  it('provides a raid context note for party skills', () => {
    const detail = getSkillEffectDetail(
      'archer',
      createCharacterData({
        characterId: 'archer',
        partyAllocations: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      }),
      'party',
      0,
    );

    expect(detail.contextNote).toContain('레이드 4인 기준');
  });

  it('shows battle-only details with a battle marker for knight skills', () => {
    const detail = getSkillEffectDetail(
      'knight',
      createCharacterData(),
      'personal',
      3,
    );

    expect(detail.contextNote).toContain('[대전]');
    expect(detail.nextLines).toContain(
      '[대전] 공격 시 추가 1줄 발사 확률 +10%',
    );
  });
});
