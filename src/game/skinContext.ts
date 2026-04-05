import {COLORS} from '../constants';
import {BLOCK_SKINS} from '../constants/blockSkins';

let activeColors: string[] = [...COLORS];
let activeBoardBg: string = '#0a0820';
let activeSkinId: number = 0;

export function setActiveSkin(skinId: number) {
  const skin = BLOCK_SKINS.find(s => s.id === skinId);
  activeSkinId = skinId;
  activeColors = skin ? [...skin.colors] : [...COLORS];
  activeBoardBg = skin?.boardBg || '#0a0820';
}

export function getSkinColors(): string[] {
  return activeColors;
}

export function getSkinBoardBg(): string {
  return activeBoardBg;
}

export function getActiveSkinId(): number {
  return activeSkinId;
}

export function randomSkinColor(): string {
  return activeColors[Math.floor(Math.random() * activeColors.length)];
}
