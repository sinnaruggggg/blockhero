import {buildSkillTriggerNotice} from '../src/game/skillTriggerNotice';

describe('buildSkillTriggerNotice', () => {
  it('hides all notices when mode is off', () => {
    expect(buildSkillTriggerNotice('off', ['dodge', 'combo_bonus'])).toBeNull();
  });

  it('shows only triggered events in triggered_only mode', () => {
    expect(
      buildSkillTriggerNotice('triggered_only', [
        'combo_bonus',
        'double_attack',
        'line_clear_bonus',
        'dodge',
      ]),
    ).toBe('추가 타격 발동 · 회피 발동');
  });

  it('shows deterministic and triggered events in all_effects mode', () => {
    expect(
      buildSkillTriggerNotice('all_effects', [
        'combo_bonus',
        'line_clear_bonus',
        'double_attack',
      ]),
    ).toBe('콤보 강화 · 라인 클리어 강화 · 추가 타격 발동');
  });
});
