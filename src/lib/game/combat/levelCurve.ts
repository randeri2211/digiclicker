// PLACEHOLDER level curve - not final game balance.
const BASE_XP = 50;
const EXPONENT = 1.5;

export function xpToReachLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(BASE_XP * Math.pow(level - 1, EXPONENT));
}

export function levelForXp(totalXp: number): number {
  let level = 1;
  while (xpToReachLevel(level + 1) <= totalXp) {
    level += 1;
  }
  return level;
}
