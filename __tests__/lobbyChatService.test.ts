import {
  buildRaidPartyRecruitmentMessage,
  parseRaidPartyRecruitment,
  stripRaidPartyRecruitmentToken,
} from '../src/services/lobbyChatService';

jest.mock('../src/services/supabase', () => ({
  supabase: {},
}));

describe('lobby raid party recruitment messages', () => {
  test('stores party metadata without showing the token as chat text', () => {
    const raw = buildRaidPartyRecruitmentMessage(
      '킹슬라임 파티 모집 중입니다.',
      {
        partyId: 'party-1',
        raidType: 'normal',
        bossStage: 1,
        raidName: '킹슬라임',
        leaderNickname: 'Leader',
      },
    );

    expect(stripRaidPartyRecruitmentToken(raw)).toBe(
      '킹슬라임 파티 모집 중입니다.',
    );
    expect(parseRaidPartyRecruitment(raw)).toEqual({
      partyId: 'party-1',
      raidType: 'normal',
      bossStage: 1,
      raidName: '킹슬라임',
      leaderNickname: 'Leader',
    });
  });

  test('ignores normal chat messages', () => {
    expect(parseRaidPartyRecruitment('파티 구합니다')).toBeUndefined();
    expect(stripRaidPartyRecruitmentToken('파티 구합니다')).toBe(
      '파티 구합니다',
    );
  });
});
