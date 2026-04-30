import type {ImageSourcePropType} from 'react-native';
import type {ActiveItemKey} from '../../constants/itemCatalog';

export const ITEM_ICON_SOURCES: Record<ActiveItemKey, ImageSourcePropType> = {
  refresh: require('./icons/refresh.png'),
  heal_small: require('./icons/heal_small.png'),
  heal_medium: require('./icons/heal_medium.png'),
  heal_large: require('./icons/heal_large.png'),
  power_small: require('./icons/power_small.png'),
  power_medium: require('./icons/power_medium.png'),
  power_large: require('./icons/power_large.png'),
};

export function getItemIconSource(
  itemKey: string | null | undefined,
): ImageSourcePropType | null {
  if (
    !itemKey ||
    !Object.prototype.hasOwnProperty.call(ITEM_ICON_SOURCES, itemKey)
  ) {
    return null;
  }

  return ITEM_ICON_SOURCES[itemKey as ActiveItemKey];
}
