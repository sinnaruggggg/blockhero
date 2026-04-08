import React from 'react';
import VisualRuntimePreview from './VisualRuntimePreview';
import {
  DEFAULT_VISUAL_REFERENCE_VIEWPORT,
  type VisualConfigManifest,
  type VisualElementFrame,
  type VisualElementId,
  type VisualElementRule,
  type VisualScreenId,
} from '../game/visualConfig';

const LEGACY_PREVIEW_SCALE = 0.78;

type Props = {
  screenId: VisualScreenId;
  manifest: VisualConfigManifest;
  assetUris: Record<string, string>;
  selectedElementId: VisualElementId;
  previewWorld: number;
  previewLevelId: number;
  previewRaidStage: number;
  onSelectElement: (elementId: VisualElementId) => void;
  onMoveElement: (
    elementId: VisualElementId,
    nextOffsetX: number,
    nextOffsetY: number,
  ) => void;
  onMeasureElement?: (
    screenId: VisualScreenId,
    elementId: VisualElementId,
    payload: {
      frame: VisualElementFrame;
      rule: VisualElementRule;
    },
  ) => void;
  onInteractionChange?: (active: boolean) => void;
};

export default function VisualStudioPreview(props: Props) {
  return (
    <VisualRuntimePreview
      {...props}
      viewport={props.manifest.referenceViewport ?? DEFAULT_VISUAL_REFERENCE_VIEWPORT}
      displayScale={LEGACY_PREVIEW_SCALE}
    />
  );
}
