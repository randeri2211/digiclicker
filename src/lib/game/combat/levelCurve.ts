import { LEVEL_CURVE_BASE_XP, LEVEL_CURVE_EXPONENT } from '../constants';

export function xpToReachLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(LEVEL_CURVE_BASE_XP * Math.pow(level - 1, LEVEL_CURVE_EXPONENT));
}

export function levelForXp(totalXp: number): number {
  let level = 1;
  while (xpToReachLevel(level + 1) <= totalXp) {
    level += 1;
  }
  return level;
}
