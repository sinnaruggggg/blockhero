import {NativeModules, Platform} from 'react-native';

type ScreenOrientationNativeModule = {
  allowFullSensor?: () => void;
  lockPortrait?: () => void;
};

const nativeModule =
  NativeModules.ScreenOrientationModule as ScreenOrientationNativeModule | undefined;

export function allowBlockWorldOrientation() {
  if (Platform.OS !== 'android') {
    return;
  }
  nativeModule?.allowFullSensor?.();
}

export function lockGamePortraitOrientation() {
  if (Platform.OS !== 'android') {
    return;
  }
  nativeModule?.lockPortrait?.();
}
