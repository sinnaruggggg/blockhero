import {
  checkAndClearLines,
  createBoard,
  getPieceRewardMarkerCell,
  placePiece,
  type Board,
} from '../src/game/engine';
import {collectSpecialBlockRewards, type GameData} from '../src/stores/gameStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
  },
}));

function fillRowForClear(board: Board, row: number, startCol: number) {
  for (let col = startCol; col < board[row].length; col += 1) {
    board[row][col] = {color: '#ffffff'};
  }
}

describe('special block rewards', () => {
  it('uses the first filled cell as the visible reward marker', () => {
    expect(
      getPieceRewardMarkerCell([
        [0, 1, 0],
        [1, 1, 1],
      ]),
    ).toEqual({row: 0, col: 1});
  });

  it('keeps gem metadata on the board and rewards one diamond per special piece', () => {
    const board = createBoard();
    const placed = placePiece(
      board,
      {
        id: 1,
        color: '#f59e0b',
        shape: [[1, 1]],
        isGem: true,
      },
      0,
      0,
    );

    fillRowForClear(placed, 0, 2);
    const result = checkAndClearLines(placed);

    expect(result.gemsFound).toBe(1);
    expect(result.itemsFound).toEqual([]);
  });

  it('keeps item metadata on the board and rewards one item per special piece', () => {
    const board = createBoard();
    const placed = placePiece(
      board,
      {
        id: 2,
        color: '#ec4899',
        shape: [[1, 1, 1]],
        isItem: true,
        itemType: 'heal_small',
      },
      1,
      0,
    );

    fillRowForClear(placed, 1, 3);
    const result = checkAndClearLines(placed);

    expect(result.gemsFound).toBe(0);
    expect(result.itemsFound).toEqual(['heal_small']);
  });

  it('collects new active items up to the expanded cap and ignores unsupported drops', async () => {
    const data: GameData = {
      hearts: 10,
      lastHeartTime: Date.now(),
      gold: 0,
      diamonds: 5,
      items: {
        hammer: 0,
        refresh: 98,
        heal_small: 97,
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

    const rewardResult = await collectSpecialBlockRewards(data, 2, [
      'heal_small',
      'heal_small',
      'refresh',
      'refresh',
      'addTurns',
    ]);

    expect(rewardResult.data.diamonds).toBe(7);
    expect(rewardResult.data.items.heal_small).toBe(99);
    expect(rewardResult.data.items.refresh).toBe(99);
    expect(rewardResult.itemsCollected).toEqual([
      'heal_small',
      'heal_small',
      'refresh',
    ]);
    expect(rewardResult.itemsSkipped).toEqual(['refresh']);
  });
});
