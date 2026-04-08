import React, {useRef, forwardRef} from 'react';
import {View, StyleSheet, Dimensions, TouchableOpacity, Text} from 'react-native';
import {ROWS, COLS} from '../constants';
import {Board as BoardType, CellValue} from '../game/engine';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_PADDING = 8;
const CELL_GAP = 2;
const BOARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 388);
const CELL_SIZE = (BOARD_WIDTH - BOARD_PADDING * 2 - CELL_GAP * (COLS - 1)) / COLS;

// Compact mode for battle screen
const COMPACT_SCALE = 0.82;
const COMPACT_CELL_SIZE = CELL_SIZE * COMPACT_SCALE;
const COMPACT_CELL_GAP = CELL_GAP * COMPACT_SCALE;
const COMPACT_BOARD_PADDING = BOARD_PADDING * COMPACT_SCALE;

// Voxel 3D helpers
function hexToRgb(hex: string): {r: number; g: number; b: number} {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function lighten(hex: string, amount: number): string {
  const {r, g, b} = hexToRgb(hex);
  return `rgb(${Math.min(255, r + amount)},${Math.min(255, g + amount)},${Math.min(255, b + amount)})`;
}

function darken(hex: string, amount: number): string {
  const {r, g, b} = hexToRgb(hex);
  return `rgb(${Math.max(0, r - amount)},${Math.max(0, g - amount)},${Math.max(0, b - amount)})`;
}

interface BoardProps {
  board: BoardType;
  previewCells?: {row: number; col: number; color: string}[];
  invalidPreview?: boolean;
  clearGuideCells?: {row: number; col: number}[];
  onCellPress?: (row: number, col: number) => void;
  small?: boolean;
  compact?: boolean;
  backgroundColor?: string;
  viewportWidth?: number;
}

const Cell = React.memo(function Cell({
  cell,
  isPreview,
  previewColor,
  isInvalid,
  size,
}: {
  cell: CellValue;
  isPreview: boolean;
  previewColor?: string;
  isInvalid: boolean;
  size: number;
}) {
  if (!cell && !isPreview) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 4,
          backgroundColor: '#110d24',
          borderWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      />
    );
  }

  if (!cell && isPreview) {
    const color = isInvalid ? '#ef4444' : (previewColor || '#ffffff');
    return (
      <View style={{
        width: size, height: size, borderRadius: 3,
        backgroundColor: color, opacity: isInvalid ? 0.25 : 0.4,
      }} />
    );
  }

  const baseColor = cell!.color;
  const bevel = Math.max(2, Math.floor(size * 0.08));
  let opacity = 1;

  if (cell!.type === 'ice' && cell!.hits && cell!.hits > 0) opacity = 0.6;

  if (cell!.type === 'stone') {
    return (
      <View style={{width: size, height: size, borderRadius: 3, opacity}}>
        <View style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 3, backgroundColor: darken('#6b7280', 50)}} />
        <View style={{position: 'absolute', top: 0, left: 0, right: bevel, bottom: bevel, borderRadius: 3, backgroundColor: lighten('#6b7280', 40)}} />
        <View style={{position: 'absolute', top: bevel, left: bevel, right: bevel, bottom: bevel, borderRadius: 2, backgroundColor: '#6b7280'}} />
      </View>
    );
  }

  return (
    <View style={{width: size, height: size, borderRadius: 4, opacity}}>
      {/* Shadow edge */}
      <View style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 3, backgroundColor: darken(baseColor, 70)}} />
      {/* Highlight edge */}
      <View style={{position: 'absolute', top: 0, left: 0, right: bevel, bottom: bevel, borderRadius: 3, backgroundColor: lighten(baseColor, 60)}} />
      {/* Face */}
      <View style={{position: 'absolute', top: bevel, left: bevel, right: bevel, bottom: bevel, borderRadius: 2, backgroundColor: baseColor}} />
      {/* Gloss */}
      <View style={{position: 'absolute', top: bevel + 1, left: bevel + 1, width: Math.floor((size - bevel * 2) * 0.4), height: Math.floor((size - bevel * 2) * 0.25), borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.3)'}} />
      {cell!.type === 'hard' && typeof cell!.hits === 'number' && (
        <View style={styles.hardBadge}>
          <Text style={styles.hardBadgeText}>x{cell!.hits}</Text>
        </View>
      )}
    </View>
  );
});

const BoardComponent = forwardRef<View, BoardProps>(function BoardComponent(
  {
    board,
    previewCells = [],
    invalidPreview = false,
    clearGuideCells = [],
    onCellPress,
    small = false,
    compact = false,
    backgroundColor = '#0a0820',
    viewportWidth,
  },
  ref,
) {
  const scale = small ? 0.4 : compact ? COMPACT_SCALE : 1;
  const baseBoardWidth = Math.min((viewportWidth ?? SCREEN_WIDTH) - 48, 388);
  const baseCellSize =
    (baseBoardWidth - BOARD_PADDING * 2 - CELL_GAP * (COLS - 1)) / COLS;
  const cellSize = baseCellSize * scale;
  const gap = CELL_GAP * scale;
  const padding = BOARD_PADDING * scale;

  const previewMap = useRef(new Map<string, string>());
  previewMap.current.clear();
  for (const p of previewCells) {
    previewMap.current.set(`${p.row},${p.col}`, p.color);
  }

  const clearGuideMap = useRef(new Set<string>());
  clearGuideMap.current.clear();
  for (const g of clearGuideCells) {
    clearGuideMap.current.add(`${g.row},${g.col}`);
  }

  return (
    <View
      ref={ref}
      style={[styles.board, {
        padding,
        width: cellSize * COLS + gap * (COLS - 1) + padding * 2,
        gap,
        backgroundColor,
      }]}>
      <View pointerEvents="none" style={styles.boardFrame}>
        <View style={[styles.corner, styles.cornerTopLeft]} />
        <View style={[styles.corner, styles.cornerTopRight]} />
        <View style={[styles.corner, styles.cornerBottomLeft]} />
        <View style={[styles.corner, styles.cornerBottomRight]} />
      </View>
      {board.map((row, r) => (
        <View key={r} style={{flexDirection: 'row', gap}}>
          {row.map((cell, c) => {
            const key = `${r},${c}`;
            const isPreview = previewMap.current.has(key);
            const isClearGuide = clearGuideMap.current.has(key);
            const cellNode = (
              <View key={c} style={{width: cellSize, height: cellSize}}>
                <Cell
                  cell={cell} isPreview={isPreview}
                  previewColor={previewMap.current.get(key)}
                  isInvalid={invalidPreview && isPreview} size={cellSize}
                />
                {isClearGuide && (
                  <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: 3,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.3)',
                  }} />
                )}
              </View>
            );
            if (onCellPress) {
              return (
                <TouchableOpacity key={c} activeOpacity={0.7} onPress={() => onCellPress(r, c)}>
                  {cellNode}
                </TouchableOpacity>
              );
            }
            return cellNode;
          })}
        </View>
      ))}
    </View>
  );
});

export default BoardComponent;

// Helper: convert absolute screen position to board row/col
export function screenToBoard(
  x: number, y: number, boardX: number, boardY: number, compact?: boolean,
): {row: number; col: number} | null {
  const cs = compact ? COMPACT_CELL_SIZE : CELL_SIZE;
  const cg = compact ? COMPACT_CELL_GAP : CELL_GAP;
  const bp = compact ? COMPACT_BOARD_PADDING : BOARD_PADDING;
  const localX = x - boardX - bp;
  const localY = y - boardY - bp;
  const cellStep = cs + cg;
  const col = Math.floor(localX / cellStep);
  const row = Math.floor(localY / cellStep);
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
  return {row, col};
}

export {CELL_SIZE, BOARD_WIDTH, BOARD_PADDING, CELL_GAP, COMPACT_SCALE};

const styles = StyleSheet.create({
  board: {
    backgroundColor: '#0a0820',
    borderRadius: 16,
    alignSelf: 'center',
    position: 'relative',
    shadowColor: '#040211',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 8},
    elevation: 10,
  },
  boardFrame: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(191, 132, 74, 0.9)',
    backgroundColor: 'rgba(21, 16, 44, 0.08)',
  },
  corner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: '#f6c26b',
  },
  cornerTopLeft: {
    top: 5,
    left: 5,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 5,
    right: 5,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    left: 5,
    bottom: 5,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    right: 5,
    bottom: 5,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  hardBadge: {
    position: 'absolute',
    right: 2,
    bottom: 1,
    backgroundColor: 'rgba(15,23,42,0.9)',
    paddingHorizontal: 2,
    borderRadius: 4,
  },
  hardBadgeText: {
    color: '#f8fafc',
    fontSize: 8,
    fontWeight: '800',
  },
});
