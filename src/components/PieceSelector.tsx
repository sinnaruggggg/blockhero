import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Piece } from '../game/engine';
import DraggablePiece from './DraggablePiece';
import { getGameplayLayoutScale } from '../game/layoutScale';
import type { VisualViewport } from '../game/visualConfig';

const PIECE_TRAY_HEIGHT = 124;
const PIECE_TRAY_HEIGHT_COMPACT = 108;

interface PieceSelectorProps {
  pieces: (Piece | null)[];
  onDragStart: (index: number) => void;
  onDragMove: (index: number, x: number, y: number) => void;
  onDragEnd: (index: number, x: number, y: number) => void;
  onDragCancel: (index: number) => void;
  compact?: boolean;
  boardCompact?: boolean;
  viewport?: Partial<VisualViewport>;
}

export default function PieceSelector({
  pieces,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  compact = false,
  boardCompact = false,
  viewport,
}: PieceSelectorProps) {
  const layoutScale = getGameplayLayoutScale(viewport);
  const trayHeight = Math.max(
    88,
    Math.round(
      (compact ? PIECE_TRAY_HEIGHT_COMPACT : PIECE_TRAY_HEIGHT) * layoutScale,
    ),
  );
  const rowGap = Math.max(8, Math.round((compact ? 10 : 16) * layoutScale));

  return (
    <View style={[styles.container, { height: trayHeight }]}>
      <View style={[styles.piecesViewport, { height: trayHeight }]}>
        <View style={[styles.piecesRow, { gap: rowGap }]}>
          {pieces.map((piece, i) => (
            <DraggablePiece
              key={piece?.id ?? `empty-${i}`}
              piece={piece}
              onDragStart={() => onDragStart(i)}
              onDragMove={(x, y) => onDragMove(i, x, y)}
              onDragEnd={(x, y) => onDragEnd(i, x, y)}
              onDragCancel={() => onDragCancel(i)}
              compact={compact}
              boardCompact={boardCompact}
              viewport={viewport}
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
    justifyContent: 'center',
    flexShrink: 0,
  },
  piecesViewport: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  piecesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
