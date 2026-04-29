import type {ImageSourcePropType} from 'react-native';

export const WORLD_BACKGROUND_IMAGES: Partial<Record<number, ImageSourcePropType>> = {
  1: require('./ui/world_background_01.jpg'),
  2: require('./ui/world_background_02.png'),
  3: require('./ui/world_background_03.png'),
  4: require('./ui/world_background_04.png'),
  5: require('./ui/world_background_05.png'),
  6: require('./ui/world_background_06.png'),
  7: require('./ui/world_background_07.png'),
  8: require('./ui/world_background_08.png'),
  9: require('./ui/world_background_09.png'),
  10: require('./ui/world_background_10.png'),
};

export function getWorldBackgroundSource(
  worldId?: number | null,
): ImageSourcePropType | null {
  const safeWorldId = Math.max(1, Math.round(Number(worldId) || 1));

  for (let id = safeWorldId; id >= 1; id -= 1) {
    const source = WORLD_BACKGROUND_IMAGES[id];
    if (source) {
      return source;
    }
  }

  return null;
}
