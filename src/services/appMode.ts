import {NativeModules} from 'react-native';

export type RuntimeAppMode = 'game' | 'admin';

type AppModeNativeModule = {
  isAdminApp?: boolean;
  appMode?: string;
  adminAutoEmail?: string;
  adminAutoAccessToken?: string;
  adminAutoRefreshToken?: string;
};

const nativeModule =
  NativeModules.AppModeModule as AppModeNativeModule | undefined;

function normalizeMode(value: string | undefined): RuntimeAppMode {
  return value === 'admin' ? 'admin' : 'game';
}

export function getRuntimeAppMode(): RuntimeAppMode {
  return normalizeMode(nativeModule?.appMode);
}

export function isAdminRuntimeApp(): boolean {
  return nativeModule?.isAdminApp === true || getRuntimeAppMode() === 'admin';
}

function normalizeOptionalString(value: string | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getAdminAutoSessionSeed():
  | {
      email: string | null;
      accessToken: string;
      refreshToken: string;
    }
  | null {
  const accessToken = normalizeOptionalString(nativeModule?.adminAutoAccessToken);
  const refreshToken = normalizeOptionalString(
    nativeModule?.adminAutoRefreshToken,
  );

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    email: normalizeOptionalString(nativeModule?.adminAutoEmail),
    accessToken,
    refreshToken,
  };
}
