// Leveling curves - pure functions of their parameters, with no constants
// import, so the game (combat/levelCurve.ts and computeKillXp in
// combat/spawn.ts, fed from constants.ts) and the Balance Lab (fed from
// its unsaved draft) run the exact same code.
//
// Leveling is described by TWO independent curves over a level L:
//   - XP per level-up: how much XP the level-up L -> L + 1 costs.
//   - Kill XP: how much XP defeating a level-L wild gives.
// Kills per level-up aren't a setting - they follow from both: fighting
// same-level wilds, the level-up from L takes xpCost(L) / killXp(L)
// kills.

export type CurveFormula = 'power' | 'exponential' | 'parabola';

export interface CurveParams {
  formula: CurveFormula;
  /** Value at level 1, for every formula. */
  first: number;
  /** parabola only: value at level maxLevel - 1 (the last level-up). */
  last: number;
  /** power only: value(L) = first * L ^ exponent. */
  exponent: number;
  /** exponential only: value(L) = first * growth ^ (L - 1). */
  growth: number;
}

export const CURVE_FORMULAS: { id: CurveFormula; label: string; description: string }[] = [
  {
    id: 'power',
    label: 'Power',
    description: 'first × L ^ exponent - 0 is flat, 1 a straight line, 2 an upward parabola from zero.',
  },
  {
    id: 'exponential',
    label: 'Exponential',
    description: 'first × growth ^ (L − 1) - every level is "growth" times the one before.',
  },
  {
    id: 'parabola',
    label: 'Parabola',
    description: 'Rises from "first" to "last" along a parabola - gentle early, steep near max level.',
  },
];

/** The curve's value at level L. An unrecognized formula (e.g. a typo
 * in balance.json) falls back to power rather than breaking leveling.
 * Levels past maxLevel - 1 (a max-level wild) keep extrapolating for power
 * and exponential; parabola holds at its last value. */
export function curveValue(p: CurveParams, level: number, maxLevel: number): number {
  switch (p.formula) {
    case 'exponential':
      return p.first * Math.pow(p.growth, level - 1);
    case 'parabola': {
      const progress = maxLevel > 2 ? Math.min(1, Math.max(0, (level - 1) / (maxLevel - 2))) : 0;
      return p.first + (p.last - p.first) * progress * progress;
    }
    case 'power':
    default:
      return p.first * Math.pow(level, p.exponent);
  }
}

/** thresholds[L] = total XP needed to reach level L (index 0 and 1 are 0),
 * for L up to maxLevel. Rounded, and never decreasing - so levelForXp's
 * walk up the table always terminates correctly. */
export function buildXpThresholds(xpCurve: CurveParams, maxLevel: number): number[] {
  const top = Math.max(2, Math.round(maxLevel));
  const thresholds = [0, 0];
  let total = 0;
  for (let level = 1; level < top; level++) {
    total += Math.max(0, curveValue(xpCurve, level, top));
    thresholds.push(Math.max(thresholds[thresholds.length - 1], Math.round(total)));
  }
  return thresholds;
}
