// Wild HP's level curve - pure, no constants import, so the game
// (combat/spawn.ts computeWildMaxHp) and the Balance Lab (balance/model.ts)
// run the same code, like fightTimer.ts and rosterFalloff.ts.
//
// HP = base × stage multiplier × ((level + offset) / (1 + offset)) ^ exponent
//
// A power of the level, like the roster's damage (Attack and Speed both grow
// with level), so "enemy level" keeps meaning the same thing at any level and
// levels can go on without a cap: at exponent 3.5 an equal-level fight gets
// only gently harder as levels climb, where the old compounding 1.1^level
// outran the roster by ~26x at Lv 100 and ~10^8x at Lv 200. The offset keeps
// the first levels from being tiny (the curve is 1 at level 1).

export interface WildHpLevelParams {
  offset: number;
  exponent: number;
}

export function wildHpLevelMultiplier(level: number, p: WildHpLevelParams): number {
  return Math.pow((Math.max(1, level) + p.offset) / (1 + p.offset), p.exponent);
}
