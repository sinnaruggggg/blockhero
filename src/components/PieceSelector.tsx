import React from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {Piece} from '../game/engine';
import {t} from '../i18n';
import DraggablePiece from './DraggablePiece';

interface PieceSelectorProps {
  pieces: (Piece | null)[];
  onDragStart: (index: number) => void;
  onDragMove: (index: number, x: number, y: number) => void;
  onDragEnd: (index: number, x: number, y: number) => void;
  onDragCancel: (index: number) => void;
}

export default function PieceSelector({
  pieces,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: PieceSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('game.dragHint')}</Text>
      <View style={styles.piecesRow}>
        {pieces.map((piece, i) => (
          <DraggablePiece
            key={piece?.id ?? `empty-${i}`}
            piece={piece}
            onDragStart={() => onDragStart(i)}
            onDragMove={(x, y) => onDragMove(i, x, y)}
            onDragEnd={(x, y) => onDragEnd(i, x, y)}
            onDragCancel={() => onDragCancel(i)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 6,
  },
  piecesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
});
