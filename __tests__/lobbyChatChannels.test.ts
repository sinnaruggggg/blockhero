import {
  buildLobbyChatChannelInfos,
  buildLobbyChatChannelOptions,
  getLobbyChatOccupancy,
  pickRandomLobbyChatChannel,
} from '../src/game/lobbyChatChannels';

describe('lobbyChatChannels', () => {
  it('builds occupancy counts from presence state', () => {
    const infos = buildLobbyChatChannelInfos({
      a: [{channelId: 1}],
      b: [{channelId: 2}],
      c: [{channelId: 1}],
    });

    expect(infos).toEqual([
      {id: 1, count: 2},
      {id: 2, count: 1},
    ]);
  });

  it('picks a random eligible existing channel before creating a new one', () => {
    const picked = pickRandomLobbyChatChannel(
      [
        {id: 1, count: 12},
        {id: 2, count: 8},
      ],
      30,
      () => 0.9,
    );

    expect(picked).toBe(2);
  });

  it('creates the next channel when all existing channels are full', () => {
    expect(
      pickRandomLobbyChatChannel(
        [
          {id: 1, count: 30},
          {id: 2, count: 30},
        ],
        30,
      ),
    ).toBe(3);
  });

  it('includes the current and next channel in selector options', () => {
    expect(
      buildLobbyChatChannelOptions([{id: 1, count: 4}], 3, 6),
    ).toEqual([
      {id: 1, count: 4},
      {id: 3, count: 0},
      {id: 4, count: 0},
    ]);
  });

  it('returns zero occupancy for missing channels', () => {
    expect(getLobbyChatOccupancy([{id: 2, count: 9}], 1)).toBe(0);
  });
});
