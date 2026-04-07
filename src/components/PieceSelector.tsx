import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Piece} from '../game/engine';
import DraggablePiece from './DraggablePiece';

const PIECE_TRAY_HEIGHT = 124;
const PIECE_TRAY_HEIGHT_COMPACT = 108;

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
      <View style={[styles.piecesViewport, compact && styles.piecesViewportCompact]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    height: PIECE_TRAY_HEIGHT,
    justifyContent: 'center',
    flexShrink: 0,
  },
  containerCompact: {
    height: PIECE_TRAY_HEIGHT_COMPACT,
  },
  piecesViewport: {
    width: '100%',
    height: PIECE_TRAY_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  piecesViewportCompact: {
    height: PIECE_TRAY_HEIGHT_COMPACT,
  },
  piecesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  piecesRowCompact: {
    gap: 10,
  },
});
