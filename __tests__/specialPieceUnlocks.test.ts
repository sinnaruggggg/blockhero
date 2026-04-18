jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
  },
}));

import {
  getUnlockedSpecialPieceShapeIndices,
  normalizeGameDataSpecialPieceUnlocks,
  type GameData,
} from '../src/stores/gameStore';

describe('special piece unlock migration', () => {
  it('migrates legacy consumable counts into permanent unlocks', () => {
    const data: GameData = {
      hearts: 10,
      lastHeartTime: 0,
      gold: 0,
      diamonds: 0,
      items: {
        hammer: 0,
        refresh: 0,
        heal_small: 0,
        heal_medium: 0,
        heal_large: 0,
        power_small: 0,
        power_medium: 0,
        power_large: 0,
        addTurns: 0,
        bomb: 0,
        piece_square3: 2,
        piece_rect: 1,
        piece_line5: 0,
        piece_num2: 1,
        piece_diag: 3,
      },
    };

    const normalized = normalizeGameDataSpecialPieceUnlocks(data);

    expect(normalized.unlockedSpecialPieces).toEqual(
      expect.arrayContaining([
        'piece_square3',
        'piece_rect',
        'piece_diag',
        'piece_num2',
      ]),
    );
    expect(normalized.items.piece_square3).toBe(0);
    expect(normalized.items.piece_rect).toBe(0);
    expect(normalized.items.piece_diag).toBe(0);
    expect(normalized.items.piece_num2).toBe(0);
  });

  it('maps unlocked permanent pieces to engine shape indices', () => {
    const data: GameData = {
      hearts: 10,
      lastHeartTime: 0,
      gold: 0,
      diamonds: 0,
      unlockedSpecialPieces: ['piece_single', 'piece_line5', 'piece_diag'],
      items: {
        hammer: 0,
        refresh: 0,
        heal_small: 0,
        heal_medium: 0,
        heal_large: 0,
        power_small: 0,
        power_medium: 0,
        power_large: 0,
        addTurns: 0,
        bomb: 0,
        piece_square3: 0,
        piece_rect: 0,
        piece_line5: 0,
        piece_num2: 0,
        piece_diag: 0,
      },
    };

    expect(getUnlockedSpecialPieceShapeIndices(data)).toEqual(
      expect.arrayContaining([0, 23, 24, 26, 27]),
    );
  });
});
