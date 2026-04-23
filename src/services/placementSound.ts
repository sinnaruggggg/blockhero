import {playGameAudioEvent} from './gameAudio';

let lastPlayAt = 0;

export function playBlockPlacementSound() {
  const now = Date.now();
  if (now - lastPlayAt < 35) {
    return;
  }

  lastPlayAt = now;

  try {
    playGameAudioEvent('blockPlace');
  } catch {
    // Sound must never block or break placement gameplay.
  }
}
