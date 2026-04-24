const MAX_SFX_EDITOR_VOLUME = 3;

export function normalizeSfxPlaybackVolume(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const clamped = Math.max(0, Math.min(MAX_SFX_EDITOR_VOLUME, value));
  return clamped / MAX_SFX_EDITOR_VOLUME;
}
