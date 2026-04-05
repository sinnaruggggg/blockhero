import {
  checkAndClearLines,
  createBoard,
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
        itemType: 'hammer',
      },
      1,
      0,
    );

    fillRowForClear(placed, 1, 3);
    const result = checkAndClearLines(placed);

    expect(result.gemsFound).toBe(0);
    expect(result.itemsFound).toEqual(['hammer']);
  });

  it('caps collected battle items at two per type and ignores unsupported drops', async () => {
    const data: GameData = {
      hearts: 10,
      lastHeartTime: Date.now(),
      gold: 0,
      diamonds: 5,
      items: {
        hammer: 1,
        refresh: 0,
        addTurns: 0,
        bomb: 2,
        piece_square3: 0,
        piece_rect: 0,
        piece_line5: 0,
        piece_num2: 0,
        piece_diag: 0,
      },
    };

    const rewardResult = await collectSpecialBlockRewards(data, 2, [
      'hammer',
      'hammer',
      'bomb',
      'refresh',
      'addTurns',
    ]);

    expect(rewardResult.data.diamonds).toBe(7);
    expect(rewardResult.data.items.hammer).toBe(2);
    expect(rewardResult.data.items.bomb).toBe(2);
    expect(rewardResult.data.items.refresh).toBe(1);
    expect(rewardResult.itemsCollected).toEqual(['hammer', 'refresh']);
    expect(rewardResult.itemsSkipped).toEqual(['hammer', 'bomb']);
  });
});
