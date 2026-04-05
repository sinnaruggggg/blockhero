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
  compact?: boolean;
}

export default function PieceSelector({
  pieces,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  compact = false,
}: PieceSelectorProps) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <Text style={[styles.label, compact && styles.labelCompact]}>{t('game.dragHint')}</Text>
      <View style={[styles.piecesRow, compact && styles.piecesRowCompact]}>
        {pieces.map((piece, i) => (
          <DraggablePiece
            key={piece?.id ?? `empty-${i}`}
            piece={piece}
            onDragStart={() => onDragStart(i)}
            onDragMove={(x, y) => onDragMove(i, x, y)}
            onDragEnd={(x, y) => onDragEnd(i, x, y)}
            onDragCancel={() => onDragCancel(i)}
            compact={compact}
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
    flexShrink: 0,
  },
  containerCompact: {
    paddingVertical: 4,
  },
  label: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 6,
  },
  labelCompact: {
    marginBottom: 4,
    fontSize: 10,
  },
  piecesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  piecesRowCompact: {
    gap: 10,
  },
});
