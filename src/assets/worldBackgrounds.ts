import type {ImageSourcePropType} from 'react-native';

export const WORLD_BACKGROUND_IMAGES: Partial<Record<number, ImageSourcePropType>> = {
  1: require('./ui/optimized/world_background_01.jpg'),
  2: require('./ui/optimized/world_background_02.jpg'),
  3: require('./ui/optimized/world_background_03.jpg'),
  4: require('./ui/optimized/world_background_04.jpg'),
  5: require('./ui/optimized/world_background_05.jpg'),
  6: require('./ui/optimized/world_background_06.jpg'),
  7: require('./ui/optimized/world_background_07.jpg'),
  8: require('./ui/optimized/world_background_08.jpg'),
  9: require('./ui/optimized/world_background_09.jpg'),
  10: require('./ui/optimized/world_background_10.jpg'),
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
