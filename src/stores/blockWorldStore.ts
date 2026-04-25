import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createInitialBlockWorld,
  sanitizeBlockWorldState,
  type BlockWorldState,
} from '../game/blockWorld';

const STORAGE_KEY = 'hiddenBlockWorld:v1';

export async function loadBlockWorldState(): Promise<BlockWorldState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialBlockWorld();
    }
    return sanitizeBlockWorldState(JSON.parse(raw));
  } catch {
    return createInitialBlockWorld();
  }
}

export async function saveBlockWorldState(state: BlockWorldState) {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(sanitizeBlockWorldState(state)),
  );
}

export async function resetBlockWorldState() {
  const next = createInitialBlockWorld();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
