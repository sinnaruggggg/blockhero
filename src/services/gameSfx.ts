import type {GameplaySfxEventId} from '../game/visualConfig';
import {playGameAudioEvent} from './gameAudio';

const lastPlayAtByEvent: Partial<Record<GameplaySfxEventId, number>> = {};

const MIN_INTERVAL_MS: Partial<Record<GameplaySfxEventId, number>> = {
  blockPlace: 35,
  blockPlaceFail: 60,
  lineClear: 80,
  combo: 120,
  levelUp: 250,
  skillUse: 80,
  reward: 180,
  button: 50,
  battleStart: 300,
  victory: 300,
  defeat: 300,
};

export function playGameSfx(eventId: GameplaySfxEventId) {
  const now = Date.now();
  const minInterval = MIN_INTERVAL_MS[eventId] ?? 0;
  const lastPlayAt = lastPlayAtByEvent[eventId] ?? 0;
  if (minInterval > 0 && now - lastPlayAt < minInterval) {
    return;
  }

  lastPlayAtByEvent[eventId] = now;

  try {
    playGameAudioEvent(eventId);
  } catch {
    // Sound must never block or break gameplay.
  }
}
