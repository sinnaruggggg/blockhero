import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {Piece} from '../game/engine';

function MiniPiece({
  piece,
  compact = false,
}: {
  piece: Piece;
  compact?: boolean;
}) {
  return (
    <View style={[styles.pieceBox, compact && styles.pieceBoxCompact]}>
      {piece.shape.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((cell, cellIndex) => (
            <View
              key={cellIndex}
              style={[
                styles.cell,
                compact && styles.cellCompact,
                cell === 1
                  ? {backgroundColor: piece.color, borderColor: 'rgba(255,255,255,0.2)'}
                  : styles.emptyCell,
              ]}
            />
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
}: {
  pieces: Piece[];
  title?: string;
  variant?: 'horizontal' | 'side';
}) {
  if (!pieces.length) {
    return null;
  }

  const compact = variant === 'side';

  return (
    <View style={[styles.container, compact && styles.containerSide]}>
      <Text style={[styles.title, compact && styles.titleSide]}>{title}</Text>
      <View style={[styles.list, compact && styles.listSide]}>
        {pieces.map(piece => (
          <MiniPiece key={piece.id} piece={piece} compact={compact} />
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
  pieceBoxCompact: {
    minWidth: 44,
    minHeight: 44,
    padding: 3,
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
  },
  cellCompact: {
    width: 7,
    height: 7,
  },
  emptyCell: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
});
