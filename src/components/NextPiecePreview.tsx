import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  type Piece,
  getPieceRewardMarkerCell,
} from '../game/engine';
import { getGameplayLayoutScale } from '../game/layoutScale';
import type { VisualViewport } from '../game/visualConfig';
import SpecialBlockBadge from './SpecialBlockBadge';

function MiniPiece({
  piece,
  compact = false,
  viewport,
}: {
  piece: Piece;
  compact?: boolean;
  viewport?: Partial<VisualViewport>;
}) {
  const layoutScale = getGameplayLayoutScale(viewport);
  const boxSize = Math.max(34, Math.round((compact ? 44 : 46) * layoutScale));
  const boxPadding = Math.max(2, Math.round((compact ? 3 : 4) * layoutScale));
  const cellSize = Math.max(5, Math.round((compact ? 7 : 8) * layoutScale));
  const rewardMarker =
    piece.isGem || piece.isItem ? getPieceRewardMarkerCell(piece.shape) : null;

  return (
    <View
      style={[
        styles.pieceBox,
        {
          minWidth: boxSize,
          minHeight: boxSize,
          padding: boxPadding,
        },
      ]}
    >
      {piece.shape.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((cell, cellIndex) => (
            <View
              key={cellIndex}
              style={[
                styles.cell,
                {
                  width: cellSize,
                  height: cellSize,
                },
                cell === 1
                  ? {
                      backgroundColor: piece.color,
                      borderColor: 'rgba(255,255,255,0.2)',
                    }
                  : styles.emptyCell,
              ]}
            >
              {cell === 1 && rewardMarker !== null && (
                <SpecialBlockBadge
                  isGem={
                    rewardMarker.row === rowIndex &&
                    rewardMarker.col === cellIndex &&
                    piece.isGem === true
                  }
                  isItem={
                    rewardMarker.row === rowIndex &&
                    rewardMarker.col === cellIndex &&
                    piece.isItem === true
                  }
                  itemType={
                    rewardMarker.row === rowIndex &&
                    rewardMarker.col === cellIndex
                      ? piece.itemType
                      : undefined
                  }
                  size={cellSize}
                />
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function NextPiecePreview({
  pieces,
  title = '다음 블록',
  variant = 'horizontal',
  viewport,
}: {
  pieces: Piece[];
  title?: string;
  variant?: 'horizontal' | 'side';
  viewport?: Partial<VisualViewport>;
}) {
  if (!pieces.length) {
    return null;
  }

  const compact = variant === 'side';
  const layoutScale = getGameplayLayoutScale(viewport);
  const sideWidth = Math.max(74, Math.round(94 * layoutScale));
  const titleFontSize = Math.max(
    9,
    Math.round((compact ? 10 : 11) * layoutScale),
  );
  const titleMarginBottom = Math.max(
    3,
    Math.round((compact ? 4 : 6) * layoutScale),
  );
  const listGap = Math.max(4, Math.round((compact ? 6 : 8) * layoutScale));

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerSide,
        compact ? { width: sideWidth } : null,
      ]}
    >
      <Text
        style={[
          styles.title,
          compact && styles.titleSide,
          { fontSize: titleFontSize, marginBottom: titleMarginBottom },
        ]}
      >
        {title}
      </Text>
      <View style={[styles.list, compact && styles.listSide, { gap: listGap }]}>
        {pieces.map(piece => (
          <MiniPiece
            key={piece.id}
            piece={piece}
            compact={compact}
            viewport={viewport}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  containerSide: {
    width: 94,
    marginHorizontal: 0,
    marginBottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  title: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  titleSide: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
  },
  list: {
    flexDirection: 'row',
    gap: 8,
  },
  listSide: {
    flexDirection: 'column',
    gap: 6,
  },
  pieceBox: {
    minWidth: 46,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30,41,59,0.8)',
    borderRadius: 8,
    padding: 4,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 8,
    height: 8,
    margin: 1,
    borderRadius: 2,
    borderWidth: 0.5,
    position: 'relative',
  },
  emptyCell: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
});
