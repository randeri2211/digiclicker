// Fight timer formulas - pure functions of their parameters, with no
// constants import, so the game (combat/spawn.ts, fed from constants.ts)
// and the Balance Lab (fed from its unsaved draft) run the exact same code.

export type FightTimerFormula = 'halfLife' | 'parabola' | 'power';

export interface FightTimerParams {
  formula: FightTimerFormula;
  baseSeconds: number;
  /** The most the squad's HP can ever add on top of baseSeconds. */
  maxBonusSeconds: number;
  /** halfLife: squad HP that earns half the max bonus. */
  halfBonusHp: number;
  /** parabola / power: squad HP that earns the full max bonus. */
  fullBonusHp: number;
  /** power: curve exponent (0.5 = square root, 1 = straight line). */
  powerExponent: number;
}

export const FIGHT_TIMER_FORMULAS: { id: FightTimerFormula; label: string; description: string }[] = [
  {
    id: 'halfLife',
    label: 'Half-life',
    description: 'Fast early gains that keep halving the gap to the ceiling - approaches it, never reaches it.',
  },
  {
    id: 'parabola',
    label: 'Parabola',
    description: 'Gains taper off steadily and reach the ceiling exactly at "full bonus" HP, then stay flat.',
  },
  {
    id: 'power',
    label: 'Power curve',
    description: 'Bonus grows as (HP / full bonus HP) ^ exponent, capped at the ceiling - 0.5 is a square root, 1 a straight line.',
  },
];

// 0..1 share of maxBonusSeconds earned at this squad HP. An unrecognized
// formula (e.g. a typo in balance.json) falls back to halfLife rather than
// breaking every fight.
function bonusFraction(p: FightTimerParams, squadHp: number): number {
  const hp = Math.max(0, squadHp);
  switch (p.formula) {
    case 'parabola': {
      const t = Math.min(1, hp / p.fullBonusHp);
      return 1 - (1 - t) * (1 - t);
    }
    case 'power':
      return Math.min(1, Math.pow(hp / p.fullBonusHp, p.powerExponent));
    case 'halfLife':
    default:
      return 1 - Math.pow(0.5, hp / p.halfBonusHp);
  }
}

export function fightTimerSeconds(p: FightTimerParams, squadHp: number): number {
  return p.baseSeconds + p.maxBonusSeconds * bonusFraction(p, squadHp);
}
