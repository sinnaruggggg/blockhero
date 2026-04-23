import {NativeModules, Platform} from 'react-native';

type PlacementSoundNativeModule = {
  playBlockPlace?: () => void;
};

const placementSound =
  NativeModules.PlacementSound as PlacementSoundNativeModule | undefined;

let lastPlayAt = 0;

export function playBlockPlacementSound() {
  if (Platform.OS !== 'android' || !placementSound?.playBlockPlace) {
    return;
  }

  const now = Date.now();
  if (now - lastPlayAt < 35) {
    return;
  }

  lastPlayAt = now;

  try {
    placementSound.playBlockPlace();
  } catch {
    // Sound must never block or break placement gameplay.
  }
}
