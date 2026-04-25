export interface SkillDef {
  id: string;
  name: string;
  desc: string;
  category: 'personal' | 'party';
}

export interface CharacterClass {
  id: string;
  name: string;
  emoji: string;
  description: string;
  baseAtk: number;
  atkPerLevel: number;
  baseHp: number;
  hpPerLevel: number;
  personalSkills: SkillDef[];
  partySkills: SkillDef[];
}

const knightPersonal: SkillDef[] = [
  {
    id: 'kp1',
    name: '철벽 수비',
    desc: '받는 피해가 감소합니다.',
    category: 'personal',
  },
  {
    id: 'kp2',
    name: '강철 의지',
    desc: '콤보 보너스 공격력이 증가합니다.',
    category: 'personal',
  },
  {
    id: 'kp3',
    name: '방패 돌진',
    desc: '레이드 스킬 게이지 충전 속도가 빨라집니다.',
    category: 'personal',
  },
  {
    id: 'kp4',
    name: '전투 경험',
    desc: '대전 모드 공격 라인이 늘어납니다.',
    category: 'personal',
  },
  {
    id: 'kp5',
    name: '진격의 깃발',
    desc: '클리하지 않은 레벨모드 연속 돌파 시 공격력이 누적상승합니다.(사망하거나 다음레벨이 아닌 다른 레벨 도전 시 초기화)',
    category: 'personal',
  },
  {
    id: 'kp6',
    name: '수호의 갑옷',
    desc: '무한 모드 장애물 등장 확률이 감소합니다.',
    category: 'personal',
  },
  {
    id: 'kp7',
    name: '전장의 함성',
    desc: '고콤보 달성 시 일정 시간 공격력이 상승합니다.',
    category: 'personal',
  },
  {
    id: 'kp8',
    name: '반격',
    desc: '대전에서 피격 시 반격할 확률이 생깁니다.',
    category: 'personal',
  },
  {
    id: 'kp9',
    name: '불굴의 정신',
    desc: '치명타 직전에 1회 버티고 보호막을 얻습니다.',
    category: 'personal',
  },
  {
    id: 'kp10',
    name: '왕의 위엄',
    desc: '블록 배치 시 주변 줄 자동 정리 확률이 생깁니다.',
    category: 'personal',
  },
];

const knightParty: SkillDef[] = [
  {
    id: 'kr1',
    name: '수호의 방벽',
    desc: '파티 전체가 받는 피해가 감소합니다.',
    category: 'party',
  },
  {
    id: 'kr2',
    name: '도발의 함성',
    desc: '적 공격을 자신에게 끌어와 탱킹합니다.',
    category: 'party',
  },
  {
    id: 'kr3',
    name: '돌격 명령',
    desc: '파티 전체 레이드 대미지가 상승합니다.',
    category: 'party',
  },
  {
    id: 'kr4',
    name: '전장 지휘',
    desc: '파티 전체 스킬 대미지가 상승합니다.',
    category: 'party',
  },
  {
    id: 'kr5',
    name: '철벽 진형',
    desc: '보스 특수 공격을 무효화할 확률이 생깁니다.',
    category: 'party',
  },
  {
    id: 'kr6',
    name: '결전의 의지',
    desc: '보스 HP가 낮아지면 파티 대미지가 상승합니다.',
    category: 'party',
  },
  {
    id: 'kr7',
    name: '사기 충전',
    desc: '파티 전체 스킬 게이지 충전 속도가 상승합니다.',
    category: 'party',
  },
  {
    id: 'kr8',
    name: '보호의 맹세',
    desc: '파티원이 쓰러질 때 1회 보호막과 생존 효과를 부여합니다.',
    category: 'party',
  },
  {
    id: 'kr9',
    name: '승리의 돌파',
    desc: '레이드 클리어 보상이 증가합니다.',
    category: 'party',
  },
  {
    id: 'kr10',
    name: '단결의 힘',
    desc: '파티 인원 수에 비례해 공격력이 상승합니다.',
    category: 'party',
  },
];

const magePersonal: SkillDef[] = [
  {
    id: 'mp1',
    name: '예지력',
    desc: '다음 블록을 더 많이 미리 볼 수 있습니다.',
    category: 'personal',
  },
  {
    id: 'mp2',
    name: '시간 왜곡',
    desc: '무한 모드 난이도 상승 속도가 느려집니다.',
    category: 'personal',
  },
  {
    id: 'mp3',
    name: '원소 폭발',
    desc: '고콤보 시 추가 줄 정리 효과가 발동합니다. 콤보판정됨.',
    category: 'personal',
  },
  {
    id: 'mp4',
    name: '마나 쉴드',
    desc: '줄 클리어 시 보호막이 생성될 수 있습니다.',
    category: 'personal',
  },
  {
    id: 'mp5',
    name: '블록 소환',
    desc: '배치한 블록의 동서남북 빈칸에 보조 블록이 생성되어 줄을 완성할 수 있습니다.',
    category: 'personal',
  },
  {
    id: 'mp6',
    name: '연금술',
    desc: '1포인트당 다이아 생성 확률이 1% 증가하며 최대 5%까지 오릅니다.',
    category: 'personal',
  },
  {
    id: 'mp7',
    name: '마법 시야',
    desc: '원하는 블록을 골라 쓸 수 있는 기회가 생깁니다.',
    category: 'personal',
  },
  {
    id: 'mp8',
    name: '마력 증폭',
    desc: '피버 게이지 충전 속도가 증가합니다.',
    category: 'personal',
  },
  {
    id: 'mp9',
    name: '차원 균열',
    desc: '고콤보 시 랜덤 줄이 자동 정리됩니다.',
    category: 'personal',
  },
  {
    id: 'mp10',
    name: '마법 변환',
    desc: '마나가 응집된 뒤 줄 클리어가 되는 빈칸에 떨어져 여러 줄을 연쇄로 완성합니다.',
    category: 'personal',
  },
];

const mageParty: SkillDef[] = [
  {
    id: 'mr1',
    name: '마력 공유',
    desc: '파티 전체 기본 공격력이 상승합니다.',
    category: 'party',
  },
  {
    id: 'mr2',
    name: '지혜의 빛',
    desc: '파티 전체 다음 블록 미리보기가 강화됩니다.',
    category: 'party',
  },
  {
    id: 'mr3',
    name: '시공간 왜곡',
    desc: '레이드 제한 시간이 증가합니다.',
    category: 'party',
  },
  {
    id: 'mr4',
    name: '원소 조화',
    desc: '줄 클리어 시 파티 추가 공격력이 증가합니다.',
    category: 'party',
  },
  {
    id: 'mr5',
    name: '마력 폭주',
    desc: '피버 지속 시간이 늘어납니다.',
    category: 'party',
  },
  {
    id: 'mr6',
    name: '보급의 마법',
    desc: '레이드 중 파티에 보조 아이템을 지급합니다.',
    category: 'party',
  },
  {
    id: 'mr7',
    name: '정신 집중',
    desc: '콤보 유지 시간이 늘어납니다.',
    category: 'party',
  },
  {
    id: 'mr8',
    name: '마나 쉴드',
    desc: '빈사 상태의 파티원에게 보호막을 부여합니다.',
    category: 'party',
  },
  {
    id: 'mr9',
    name: '비전 해방',
    desc: '보스 체력이 낮아지면 피버 조건이 완화됩니다.',
    category: 'party',
  },
  {
    id: 'mr10',
    name: '마법진',
    desc: '줄 클리어 시 파티 피버를 촉진합니다.',
    category: 'party',
  },
];

const archerPersonal: SkillDef[] = [
  {
    id: 'ap1',
    name: '속사',
    desc: '작은 블록 등장 확률과 연속 배치 보너스가 증가합니다.',
    category: 'personal',
  },
  {
    id: 'ap2',
    name: '신속 배치',
    desc: '빠른 연속 배치 시 추가 피해가 누적됩니다.',
    category: 'personal',
  },
  {
    id: 'ap3',
    name: '정밀 사격',
    desc: '연속 줄 클리어 시 높은 피해 보너스를 얻습니다.',
    category: 'personal',
  },
  {
    id: 'ap4',
    name: '연사',
    desc: '피버 중 추가 대미지를 얻습니다.',
    category: 'personal',
  },
  {
    id: 'ap5',
    name: '화살비',
    desc: '고콤보 시 랜덤 줄 파괴가 발동합니다.',
    category: 'personal',
  },
  {
    id: 'ap6',
    name: '매의 눈',
    desc: '배치 가능한 위치와 완성 지점을 더 잘 보여줍니다.',
    category: 'personal',
  },
  {
    id: 'ap7',
    name: '관통 사격',
    desc: '특수 발동 시 드래그한 줄을 바로 정리합니다.',
    category: 'personal',
  },
  {
    id: 'ap8',
    name: '바람의 가호',
    desc: '피버 배수를 한층 더 강화할 수 있습니다.',
    category: 'personal',
  },
  {
    id: 'ap9',
    name: '집중 조준',
    desc: '피버 발동 조건이 낮아집니다.',
    category: 'personal',
  },
  {
    id: 'ap10',
    name: '회피 본능',
    desc: '받는 공격을 회피할 확률이 생깁니다.',
    category: 'personal',
  },
];

const archerParty: SkillDef[] = [
  {
    id: 'ar1',
    name: '지원 사격',
    desc: '파티 전체 줄 클리어 대미지가 증가합니다.',
    category: 'party',
  },
  {
    id: 'ar2',
    name: '정찰',
    desc: '보스 특수 패턴을 미리 알려줍니다.',
    category: 'party',
  },
  {
    id: 'ar3',
    name: '화살 세례',
    desc: '파티 고콤보 시 추가 보스 대미지를 줍니다.',
    category: 'party',
  },
  {
    id: 'ar4',
    name: '급소 공략',
    desc: '보스 약점을 노출시켜 파티 대미지를 높입니다.',
    category: 'party',
  },
  {
    id: 'ar5',
    name: '연막 화살',
    desc: '보스 패턴 준비 시간과 주기를 지연시킵니다.',
    category: 'party',
  },
  {
    id: 'ar6',
    name: '포진 지원',
    desc: '작은 블록 등장 확률을 파티 전체에 부여합니다.',
    category: 'party',
  },
  {
    id: 'ar7',
    name: '신속의 바람',
    desc: '빠른 연속 배치 보너스를 파티 전체로 확장합니다.',
    category: 'party',
  },
  {
    id: 'ar8',
    name: '독 화살',
    desc: '줄 클리어 시 보스에게 지속 피해를 부여합니다.',
    category: 'party',
  },
  {
    id: 'ar9',
    name: '질풍 지원',
    desc: '공격이 한 번 더 발동할 확률을 부여합니다.',
    category: 'party',
  },
  {
    id: 'ar10',
    name: '명궁의 집중',
    desc: '파티 인원 수에 따라 질풍 지원 확률이 상승합니다.',
    category: 'party',
  },
];

const roguePersonal: SkillDef[] = [
  {
    id: 'rp1',
    name: '보물 사냥',
    desc: '다이아 드랍 확률과 추가 획득 확률이 증가합니다.',
    category: 'personal',
  },
  {
    id: 'rp2',
    name: '레어 감지',
    desc: '희귀 아이템 블록 등장 확률이 증가합니다.',
    category: 'personal',
  },
  {
    id: 'rp3',
    name: '행운의 주사위',
    desc: '줄 클리어 결과가 2배가 될 확률이 생깁니다.',
    category: 'personal',
  },
  {
    id: 'rp4',
    name: '그림자 손놀림',
    desc: '회전 가능한 블록이 등장할 수 있습니다.',
    category: 'personal',
  },
  {
    id: 'rp5',
    name: '은신',
    desc: '배치 직후 잠시 받는 피해가 감소합니다.',
    category: 'personal',
  },
  {
    id: 'rp6',
    name: '약탈',
    desc: '승리 보상과 추가 다이아 획득 기회를 얻습니다.',
    category: 'personal',
  },
  {
    id: 'rp7',
    name: '침묵의 일격',
    desc: '스킬 브레이크를 저장해 강한 반격을 가합니다.',
    category: 'personal',
  },
  {
    id: 'rp8',
    name: '잭팟',
    desc: '클리어 보상이 크게 증가할 확률이 있습니다.',
    category: 'personal',
  },
  {
    id: 'rp9',
    name: '비밀 주머니',
    desc: '아이템 보유 한도와 시작 아이템이 늘어납니다.',
    category: 'personal',
  },
  {
    id: 'rp10',
    name: '교활한 눈',
    desc: '상점 가격과 새로고침 비용이 감소합니다.',
    category: 'personal',
  },
];

const rogueParty: SkillDef[] = [
  {
    id: 'rr1',
    name: '전리품 분배',
    desc: '파티 전체 재화와 다이아 보상이 증가합니다.',
    category: 'party',
  },
  {
    id: 'rr2',
    name: '도둑의 행운',
    desc: '상위 등급 보상 등장 확률이 증가합니다.',
    category: 'party',
  },
  {
    id: 'rr3',
    name: '은밀한 지원',
    desc: '파티 디버프를 무효화할 확률이 생깁니다.',
    category: 'party',
  },
  {
    id: 'rr4',
    name: '함정 설치',
    desc: '보스 특수 패턴 쿨타임을 지연시킵니다.',
    category: 'party',
  },
  {
    id: 'rr5',
    name: '급소 표시',
    desc: '고콤보 시 보스 표식을 부여해 대미지를 높입니다.',
    category: 'party',
  },
  {
    id: 'rr6',
    name: '그림자 분신',
    desc: '줄 클리어 대미지의 일부를 추가 타격으로 줍니다.',
    category: 'party',
  },
  {
    id: 'rr7',
    name: '보물 지도',
    desc: '히든 보상과 상자 등장 확률이 증가합니다.',
    category: 'party',
  },
  {
    id: 'rr8',
    name: '독 바르기',
    desc: '보스가 받는 피해 증가 디버프를 누적합니다.',
    category: 'party',
  },
  {
    id: 'rr9',
    name: '탈출 연막',
    desc: '전멸 직전 추가 시간을 벌고 보스를 멈춥니다.',
    category: 'party',
  },
  {
    id: 'rr10',
    name: '밀거래',
    desc: '고콤보 달성 시 파티에 임시 보조 아이템을 지급합니다.',
    category: 'party',
  },
];

const healerPersonal: SkillDef[] = [
  {
    id: 'hp1',
    name: '회복',
    desc: '주기적으로 HP를 자동 회복합니다.',
    category: 'personal',
  },
  {
    id: 'hp2',
    name: '축복의 준비',
    desc: '레벨 모드 시작 전에 준비 턴을 얻습니다.',
    category: 'personal',
  },
  {
    id: 'hp3',
    name: '치유의 손길',
    desc: '줄 클리어 누적으로 HP를 회복합니다.',
    category: 'personal',
  },
  {
    id: 'hp4',
    name: '생명력',
    desc: '최대 하트와 하트 회복 속도가 강화됩니다.',
    category: 'personal',
  },
  {
    id: 'hp5',
    name: '재생의 빛',
    desc: '2줄 클리어마다 HP를 회복합니다.',
    category: 'personal',
  },
  {
    id: 'hp6',
    name: '평온',
    desc: '콤보가 끊기기 직전 잠시 시간을 늘립니다.',
    category: 'personal',
  },
  {
    id: 'hp7',
    name: '기적',
    desc: '직접 그려 사용하는 보조 블록 기회를 얻습니다.',
    category: 'personal',
  },
  {
    id: 'hp8',
    name: '보살핌',
    desc: '아이템이 소모되지 않을 확률이 생깁니다.',
    category: 'personal',
  },
  {
    id: 'hp9',
    name: '신성한 일격',
    desc: '치유 포인트를 강한 공격 보너스로 전환합니다.',
    category: 'personal',
  },
  {
    id: 'hp10',
    name: '영혼 수확',
    desc: '한 번에 지운 줄 수만큼 HP를 회복합니다.',
    category: 'personal',
  },
];

const healerParty: SkillDef[] = [
  {
    id: 'hr1',
    name: '치유의 손길',
    desc: '블록 배치 시 파티 HP를 회복할 수 있습니다.',
    category: 'party',
  },
  {
    id: 'hr2',
    name: '재생의 오라',
    desc: '파티 전체에 지속 회복 효과를 부여합니다.',
    category: 'party',
  },
  {
    id: 'hr3',
    name: '축복의 빛',
    desc: '전투 시작 시 파티에 보조 아이템을 지급합니다.',
    category: 'party',
  },
  {
    id: 'hr4',
    name: '정화의 바람',
    desc: '줄 클리어 시 디버프를 제거할 수 있습니다.',
    category: 'party',
  },
  {
    id: 'hr5',
    name: '생명의 샘',
    desc: '레이드 제한 시간을 증가시킵니다.',
    category: 'party',
  },
  {
    id: 'hr6',
    name: '치유의 파동',
    desc: '파티 전체 보호막을 부여할 수 있습니다.',
    category: 'party',
  },
  {
    id: 'hr7',
    name: '신성한 땅',
    desc: '골드와 보석 획득량을 증가시킵니다.',
    category: 'party',
  },
  {
    id: 'hr8',
    name: '부활의 기적',
    desc: '레이드 실패 시 1회 재도전 기회를 부여합니다.',
    category: 'party',
  },
  {
    id: 'hr9',
    name: '영혼 연결',
    desc: '고콤보 달성 시 파티 전체 콤보 보너스를 강화합니다.',
    category: 'party',
  },
  {
    id: 'hr10',
    name: '대자연의 축복',
    desc: '파티 인원 수에 비례해 최대 HP가 증가합니다.',
    category: 'party',
  },
];

export const CHARACTER_CLASSES: CharacterClass[] = [
  {
    id: 'knight',
    name: '기사',
    emoji: '🛡️',
    description: '공격과 방어가 균형 잡힌 전사 계열 직업',
    baseAtk: 10,
    atkPerLevel: 2,
    baseHp: 200,
    hpPerLevel: 20,
    personalSkills: knightPersonal,
    partySkills: knightParty,
  },
  {
    id: 'mage',
    name: '매지션',
    emoji: '🔮',
    description: '유틸과 특수 효과가 강한 마법 직업',
    baseAtk: 15,
    atkPerLevel: 5,
    baseHp: 120,
    hpPerLevel: 10,
    personalSkills: magePersonal,
    partySkills: mageParty,
  },
  {
    id: 'archer',
    name: '궁수',
    emoji: '🏹',
    description: '속도와 정밀 화력이 강한 원거리 직업',
    baseAtk: 13,
    atkPerLevel: 3,
    baseHp: 150,
    hpPerLevel: 15,
    personalSkills: archerPersonal,
    partySkills: archerParty,
  },
  {
    id: 'rogue',
    name: '도적',
    emoji: '🗡️',
    description: '재화와 확률 효과가 강한 행운형 직업',
    baseAtk: 14,
    atkPerLevel: 4,
    baseHp: 130,
    hpPerLevel: 13,
    personalSkills: roguePersonal,
    partySkills: rogueParty,
  },
  {
    id: 'healer',
    name: '힐러',
    emoji: '✨',
    description: '회복과 생존 지원에 특화된 지속형 직업',
    baseAtk: 11,
    atkPerLevel: 2,
    baseHp: 110,
    hpPerLevel: 12,
    personalSkills: healerPersonal,
    partySkills: healerParty,
  },
];

export function getCharacterClass(id: string): CharacterClass | undefined {
  return CHARACTER_CLASSES.find(character => character.id === id);
}

function getBalancedCharacterStats(characterId: string) {
  const fallback = getCharacterClass(characterId);
  if (!fallback) {
    return null;
  }

  try {
    const {getCachedCreatorManifest} = require('../services/creatorService') as {
      getCachedCreatorManifest: () => {
        balance?: {
          characters?: Record<
            string,
            {
              baseAtk?: number;
              atkPerLevel?: number;
              baseHp?: number;
              hpPerLevel?: number;
            }
          >;
        };
      };
    };
    const manifest = getCachedCreatorManifest?.();
    const override = manifest?.balance?.characters?.[characterId];
    if (!override) {
      return fallback;
    }

    return {
      ...fallback,
      baseAtk: override.baseAtk ?? fallback.baseAtk,
      atkPerLevel: override.atkPerLevel ?? fallback.atkPerLevel,
      baseHp: override.baseHp ?? fallback.baseHp,
      hpPerLevel: override.hpPerLevel ?? fallback.hpPerLevel,
    };
  } catch {
    return fallback;
  }
}

export function getCharacterAtk(characterId: string, level: number): number {
  const characterClass = getBalancedCharacterStats(characterId);
  if (!characterClass) {
    return 10;
  }

  return characterClass.baseAtk + characterClass.atkPerLevel * (level - 1);
}

export function getCharacterHp(characterId: string, level: number): number {
  const characterClass = getBalancedCharacterStats(characterId);
  if (!characterClass) {
    return 200;
  }

  return characterClass.baseHp + characterClass.hpPerLevel * (level - 1);
}

export function xpToNextLevel(level: number): number {
  return Math.floor(100 * level * (1 + level * 0.1));
}

export function isSkillUnlocked(
  skillIndex: number,
  allocations: number[],
): boolean {
  if (skillIndex === 0) {
    return true;
  }

  return (allocations[skillIndex - 1] ?? 0) >= 5;
}

export function canAllocateSkill(
  skillIndex: number,
  allocations: number[],
  availablePoints: number,
): boolean {
  if (availablePoints <= 0) {
    return false;
  }

  if (!isSkillUnlocked(skillIndex, allocations)) {
    return false;
  }

  return (allocations[skillIndex] ?? 0) < 5;
}
