import type { CurveParams } from './levelCurveFormulas';
import {
  LEVEL_XP_FORMULA,
  LEVEL_XP_FIRST,
  LEVEL_XP_LAST,
  LEVEL_XP_EXPONENT,
  LEVEL_XP_GROWTH,
  KILL_XP_FORMULA,
  KILL_XP_FIRST,
  KILL_XP_LAST,
  KILL_XP_EXPONENT,
  KILL_XP_GROWTH,
} from '../constants';

// The game's two leveling curves, built from constants.ts - the XP table
// (levelCurve.ts) and kill XP (computeKillXp in spawn.ts).
export const LEVEL_XP_CURVE: CurveParams = {
  formula: LEVEL_XP_FORMULA,
  first: LEVEL_XP_FIRST,
  last: LEVEL_XP_LAST,
  exponent: LEVEL_XP_EXPONENT,
  growth: LEVEL_XP_GROWTH,
};

export const KILL_XP_CURVE: CurveParams = {
  formula: KILL_XP_FORMULA,
  first: KILL_XP_FIRST,
  last: KILL_XP_LAST,
  exponent: KILL_XP_EXPONENT,
  growth: KILL_XP_GROWTH,
};
