import {normalizeSfxPlaybackVolume} from '../src/services/gameAudioVolume';

describe('normalizeSfxPlaybackVolume', () => {
  it('maps the editor max to full runtime playback volume', () => {
    expect(normalizeSfxPlaybackVolume(3)).toBe(1);
  });

  it('keeps mid-range values distinct so per-sfx tuning is audible', () => {
    expect(normalizeSfxPlaybackVolume(1.5)).toBeCloseTo(0.5);
    expect(normalizeSfxPlaybackVolume(0.75)).toBeCloseTo(0.25);
  });

  it('clamps invalid values safely', () => {
    expect(normalizeSfxPlaybackVolume(-1)).toBe(0);
    expect(normalizeSfxPlaybackVolume(9)).toBe(1);
    expect(normalizeSfxPlaybackVolume(Number.NaN)).toBe(0);
  });
});
