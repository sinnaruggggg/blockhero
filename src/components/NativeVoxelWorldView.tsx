import {
  type NativeSyntheticEvent,
  Platform,
  requireNativeComponent,
  type ViewStyle,
} from 'react-native';

export type NativeVoxelWorldToolDurabilityEvent = {
  durability: number;
  maxDurability: number;
};

export type NativeVoxelWorldViewProps = {
  moveX: number;
  moveZ: number;
  turn: number;
  look: number;
  selectedBlock: string;
  selectedTool: string;
  selectedToolPowerMultiplier: number;
  selectedToolDurability: number;
  selectedToolMaxDurability: number;
  mineCommand: number;
  placeCommand: number;
  resetCommand: number;
  onToolDurabilityChanged?: (
    event: NativeSyntheticEvent<NativeVoxelWorldToolDurabilityEvent>,
  ) => void;
  style?: ViewStyle;
};

const NativeVoxelWorldView =
  Platform.OS === 'android'
    ? requireNativeComponent<NativeVoxelWorldViewProps>('VoxelWorldView')
    : null;

export default NativeVoxelWorldView;
