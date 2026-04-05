import {
  addEndlessHardObstacles,
  checkAndClearLines,
  createBoard,
  type Board,
} from '../src/game/engine';

describe('endless mode hard obstacles', () => {
  it('keeps hard obstacles on the board until their hit count reaches zero', () => {
    const board: Board = createBoard();
    board[0][0] = {color: '#7c3aed', type: 'hard', hits: 3};
    for (let col = 1; col < board[0].length; col += 1) {
      board[0][col] = {color: '#ffffff'};
    }

    const result = checkAndClearLines(board);

    expect(result.clearedRows).toEqual([0]);
    expect(result.hardBlocksHit).toBe(1);
    expect(result.newBoard[0][0]).toEqual({
      color: '#7c3aed',
      type: 'hard',
      hits: 2,
    });
    for (let col = 1; col < board[0].length; col += 1) {
      expect(result.newBoard[0][col]).toBeNull();
    }
  });

  it('adds score-scaled hard obstacles with visible durability tiers', () => {
    const board = createBoard();
    const levelEightBoard = addEndlessHardObstacles(board, 8);
    const hardCells = levelEightBoard
      .flat()
      .filter(cell => cell?.type === 'hard');

    expect(hardCells).toHaveLength(3);
    expect(hardCells.every(cell => cell?.hits === 3)).toBe(true);
  });

  it('does not add hard obstacles in early endless levels', () => {
    const board = createBoard();
    const levelTwoBoard = addEndlessHardObstacles(board, 2);
    const hardCells = levelTwoBoard
      .flat()
      .filter(cell => cell?.type === 'hard');

    expect(hardCells).toHaveLength(0);
  });
});
