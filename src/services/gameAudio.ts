import {NativeModules, Platform} from 'react-native';
import {
  getGameplayAudioConfig,
  type GameplayBgmTrackId,
  type GameplaySfxEventId,
} from '../game/visualConfig';
import {
  downloadPublishedVisualConfigIfNeeded,
  getCachedVisualConfigSnapshot,
  type VisualConfigSnapshot,
} from './visualConfigService';
import {
  DEFAULT_GAME_SETTINGS,
  loadGameSettings,
  type GameSettings,
} from '../stores/gameSettings';

type GameAudioNativeModule = {
  playSound?: (
    uri: string | null,
    volume: number,
    cooldownMs: number,
    allowOverlap: boolean,
  ) => void;
  playBgm?: (
    uri: string | null,
    volume: number,
    loop: boolean,
    fadeInMs: number,
  ) => void;
  setBgmVolume?: (volume: number) => void;
  stopBgm?: (fadeOutMs: number) => void;
};

const nativeAudio =
  NativeModules.PlacementSound as GameAudioNativeModule | undefined;

let cachedSettings: GameSettings = {...DEFAULT_GAME_SETTINGS};
let settingsLoaded = false;
let settingsLoadInFlight: Promise<GameSettings> | null = null;
let currentBgmTrack: GameplayBgmTrackId | null = null;
let audioRefreshInFlight: Promise<VisualConfigSnapshot> | null = null;
const MAX_AUDIO_VOLUME = 3;

function ensureSettingsLoaded() {
  if (settingsLoaded || settingsLoadInFlight) {
    return;
  }

  settingsLoadInFlight = loadGameSettings()
    .then(settings => {
      cachedSettings = settings;
      settingsLoaded = true;
      return settings;
    })
    .catch(() => cachedSettings)
    .finally(() => {
      settingsLoadInFlight = null;
    });
}

export async function refreshCachedAudioSettings() {
  try {
    cachedSettings = await loadGameSettings();
    settingsLoaded = true;
  } catch {
    cachedSettings = {...DEFAULT_GAME_SETTINGS};
  }
}

function getSnapshot(): VisualConfigSnapshot {
  return getCachedVisualConfigSnapshot();
}

function getAssetUri(assetKey: string | null, snapshot: VisualConfigSnapshot) {
  if (!assetKey) {
    return null;
  }
  return snapshot.assetUris[assetKey] ?? null;
}

function refreshAudioAssetsInBackground() {
  if (audioRefreshInFlight) {
    return audioRefreshInFlight;
  }

  audioRefreshInFlight = downloadPublishedVisualConfigIfNeeded(true)
    .then(snapshot => {
      if (currentBgmTrack) {
        playGameBgm(currentBgmTrack);
      }
      return snapshot;
    })
    .catch(() => getSnapshot())
    .finally(() => {
      audioRefreshInFlight = null;
    });

  return audioRefreshInFlight;
}

function getVolume(...values: number[]) {
  const multiplied = values.reduce(
    (acc, value) => acc * Math.max(0, Math.min(MAX_AUDIO_VOLUME, value)),
    1,
  );
  return Math.min(MAX_AUDIO_VOLUME, multiplied);
}

export function playGameAudioEvent(eventId: GameplaySfxEventId) {
  if (Platform.OS !== 'android') {
    return;
  }

  ensureSettingsLoaded();

  const snapshot = getSnapshot();
  const audio = getGameplayAudioConfig(snapshot.manifest);
  const rule = audio.sfx[eventId];
  if (
    audio.muted ||
    !cachedSettings.sfx ||
    !rule.enabled ||
    getVolume(audio.masterVolume, audio.sfxVolume, rule.volume) <= 0
  ) {
    return;
  }

  const volume = getVolume(audio.masterVolume, audio.sfxVolume, rule.volume);
  if (!rule.assetKey) {
    return;
  }

  const uri = getAssetUri(rule.assetKey, snapshot);
  if (rule.assetKey && !uri) {
    void refreshAudioAssetsInBackground();
    return;
  }
  if (!uri) {
    return;
  }

  try {
    if (nativeAudio?.playSound) {
      nativeAudio.playSound(uri, volume, rule.cooldownMs, rule.allowOverlap);
    }
  } catch {
    // Audio must never block gameplay.
  }
}

export function playGameBgm(trackId: GameplayBgmTrackId) {
  if (Platform.OS !== 'android') {
    return;
  }

  ensureSettingsLoaded();

  const snapshot = getSnapshot();
  const audio = getGameplayAudioConfig(snapshot.manifest);
  const rule = audio.bgm[trackId];
  const volume = getVolume(audio.masterVolume, audio.bgmVolume, rule.volume);
  if (audio.muted || !cachedSettings.bgm || !rule.enabled || volume <= 0) {
    stopGameBgm(rule.fadeOutMs);
    return;
  }

  const uri = getAssetUri(rule.assetKey, snapshot);
  if (!uri) {
    if (rule.assetKey) {
      void refreshAudioAssetsInBackground();
    }
    stopGameBgm(rule.fadeOutMs);
    return;
  }

  currentBgmTrack = trackId;

  try {
    nativeAudio?.playBgm?.(uri, volume, rule.loop, rule.fadeInMs);
  } catch {
    // BGM failures should stay silent.
  }
}

export function stopGameBgm(fadeOutMs = 500) {
  if (Platform.OS !== 'android') {
    return;
  }

  currentBgmTrack = null;

  try {
    nativeAudio?.stopBgm?.(fadeOutMs);
  } catch {
    // BGM failures should stay silent.
  }
}

export function refreshCurrentBgm() {
  if (currentBgmTrack) {
    playGameBgm(currentBgmTrack);
  }
}
