import AsyncStorage from '@react-native-async-storage/async-storage';

export type SkillTriggerNoticeMode = 'off' | 'triggered_only' | 'all_effects';

export interface GameSettings {
  bgm: boolean;
  sfx: boolean;
  vibration: boolean;
  screenShake: boolean;
  notification: boolean;
  skillTriggerNoticeMode: SkillTriggerNoticeMode;
}

const STORAGE_KEY = 'gameSettings';

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  bgm: true,
  sfx: true,
  vibration: true,
  screenShake: true,
  notification: true,
  skillTriggerNoticeMode: 'triggered_only',
};

function sanitizeSettings(
  value: Partial<GameSettings> | null | undefined,
): GameSettings {
  return {
    ...DEFAULT_GAME_SETTINGS,
    ...(value ?? {}),
    skillTriggerNoticeMode:
      value?.skillTriggerNoticeMode === 'off' ||
      value?.skillTriggerNoticeMode === 'all_effects' ||
      value?.skillTriggerNoticeMode === 'triggered_only'
        ? value.skillTriggerNoticeMode
        : DEFAULT_GAME_SETTINGS.skillTriggerNoticeMode,
  };
}

export async function loadGameSettings(): Promise<GameSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {...DEFAULT_GAME_SETTINGS};
    }

    return sanitizeSettings(JSON.parse(raw) as Partial<GameSettings>);
  } catch {
    return {...DEFAULT_GAME_SETTINGS};
  }
}

export async function saveGameSettings(
  patch: Partial<GameSettings>,
): Promise<GameSettings> {
  const current = await loadGameSettings();
  const next = sanitizeSettings({
    ...current,
    ...patch,
  });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function loadSkillTriggerNoticeMode(): Promise<SkillTriggerNoticeMode> {
  const settings = await loadGameSettings();
  return settings.skillTriggerNoticeMode;
}

export async function saveSkillTriggerNoticeMode(
  mode: SkillTriggerNoticeMode,
): Promise<GameSettings> {
  return saveGameSettings({skillTriggerNoticeMode: mode});
}
