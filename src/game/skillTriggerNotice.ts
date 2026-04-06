import type {SkillTriggerNoticeMode} from '../stores/gameSettings';

export type SkillTriggerNoticeEvent =
  | 'combo_bonus'
  | 'line_clear_bonus'
  | 'fever_bonus'
  | 'small_piece_chain'
  | 'raid_bonus'
  | 'jackpot_double'
  | 'double_attack'
  | 'dodge'
  | 'revive'
  | 'auto_heal'
  | 'place_heal'
  | 'item_preserve';

const TRIGGER_ONLY_EVENTS = new Set<SkillTriggerNoticeEvent>([
  'jackpot_double',
  'double_attack',
  'dodge',
  'revive',
  'auto_heal',
  'place_heal',
  'item_preserve',
]);

const EVENT_LABELS: Record<SkillTriggerNoticeEvent, string> = {
  combo_bonus: '콤보 강화',
  line_clear_bonus: '라인 클리어 강화',
  fever_bonus: '피버 강화',
  small_piece_chain: '소형 블록 연계',
  raid_bonus: '레이드 강화',
  jackpot_double: '잭팟 2배 발동',
  double_attack: '추가 타격 발동',
  dodge: '회피 발동',
  revive: '부활 발동',
  auto_heal: '자동 회복 발동',
  place_heal: '배치 회복 발동',
  item_preserve: '아이템 보존 발동',
};

export function buildSkillTriggerNotice(
  mode: SkillTriggerNoticeMode,
  events: SkillTriggerNoticeEvent[],
): string | null {
  if (mode === 'off' || events.length === 0) {
    return null;
  }

  const filtered =
    mode === 'triggered_only'
      ? events.filter(event => TRIGGER_ONLY_EVENTS.has(event))
      : events;

  const unique = Array.from(new Set(filtered));
  if (unique.length === 0) {
    return null;
  }

  return unique.map(event => EVENT_LABELS[event]).join(' · ');
}
