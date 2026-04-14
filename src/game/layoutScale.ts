import {
  DEFAULT_VISUAL_REFERENCE_VIEWPORT,
  type VisualViewport,
} from './visualConfig';

export type GameplayViewport = Partial<VisualViewport> &
  Pick<VisualViewport, 'width' | 'height'>;

export function normalizeGameplayViewport(
  viewport?: Partial<VisualViewport> | null,
): VisualViewport {
  return {
    ...DEFAULT_VISUAL_REFERENCE_VIEWPORT,
    ...(viewport ?? {}),
  };
}

export function getGameplayLayoutScale(
  viewport?: Partial<VisualViewport> | null,
): number {
  const currentViewport = normalizeGameplayViewport(viewport);
  const currentUsableHeight = Math.max(
    1,
    currentViewport.height -
      currentViewport.safeTop -
      currentViewport.safeBottom,
  );
  const referenceUsableHeight = Math.max(
    1,
    DEFAULT_VISUAL_REFERENCE_VIEWPORT.height -
      DEFAULT_VISUAL_REFERENCE_VIEWPORT.safeTop -
      DEFAULT_VISUAL_REFERENCE_VIEWPORT.safeBottom,
  );

  return Math.min(
    currentViewport.width / DEFAULT_VISUAL_REFERENCE_VIEWPORT.width,
    currentUsableHeight / referenceUsableHeight,
  );
}

export function scaleGameplayUnit(
  baseSize: number,
  viewport?: Partial<VisualViewport> | null,
  minimum = 0,
): number {
  return Math.max(
    minimum,
    Math.round(baseSize * getGameplayLayoutScale(viewport)),
  );
}
