import { CURVE_REFERENCE_LEVEL } from '../constants';
import { buildXpThresholds, curveValue } from './levelCurveFormulas';
import { LEVEL_XP_CURVE } from './levelCurveParams';

// thresholds[level] = total XP to reach that level. Levels have no cap, so
// the table starts at CURVE_REFERENCE_LEVEL and grows on demand as XP
// climbs past its top - levelForXp runs for every roster entry on every
// stat lookup (several times per combat tick), so it only ever reads this
// table, never re-sums the curve.
//
// Numbers are doubles: totals stay exact integers until ~9e15 XP (about
// Lv 64,000 on the current curve) and only lose a unit or two of precision
// past that - nothing wraps around. A curve that stops rising (a 0 cost) or
// overflows to Infinity (an extreme exponential) ends the table instead:
// its last level becomes a real maximum. So does TABLE_LIMIT - a runaway
// XP value (a bad save, a lab typo) must not grow the table until memory
// runs out; no one levels to a million.
const TABLE_LIMIT = 1_000_000;
const thresholds: number[] = buildXpThresholds(LEVEL_XP_CURVE, CURVE_REFERENCE_LEVEL);
let tableEnded = false;

/** Appends the next level's threshold; false once the curve can't go on. */
function extendTable(): boolean {
  if (tableEnded || thresholds.length > TABLE_LIMIT) return false;
  const top = thresholds.length - 1; // highest level in the table
  // The level-up top -> top + 1 costs the curve's value at `top`.
  const next = Math.round(thresholds[top] + curveValue(LEVEL_XP_CURVE, top, CURVE_REFERENCE_LEVEL));
  if (!Number.isFinite(next) || next <= thresholds[top]) {
    tableEnded = true;
    return false;
  }
  thresholds.push(next);
  return true;
}

/** The table's highest level, grown until it's above `totalXp` (so the
 * level holding that XP and the next one's threshold are both in it). */
function coverXp(totalXp: number): number {
  // Non-finite XP never grows the table (every threshold is <= Infinity).
  while (Number.isFinite(totalXp) && thresholds[thresholds.length - 1] <= totalXp && extendTable());
  return thresholds.length - 1;
}

export function xpToReachLevel(level: number): number {
  if (level <= 1) return 0;
  while (thresholds.length <= level && extendTable());
  return thresholds[Math.min(level, thresholds.length - 1)];
}

export interface LevelProgress {
  level: number;
  /** XP earned since reaching the current level. */
  into: number;
  /** XP the current level-up costs in total (0 at a curve's end). */
  needed: number;
  /** 0..1 through the current level; 1 at a curve's end. */
  fraction: number;
  /** No further level exists - only when the XP curve ended (see above). */
  isMax: boolean;
}

// Where an XP total sits within its current level - what an XP bar draws.
export function levelProgress(totalXp: number): LevelProgress {
  const level = levelForXp(totalXp);
  if (level + 1 >= thresholds.length) return { level, into: 0, needed: 0, fraction: 1, isMax: true };
  const start = thresholds[level];
  const needed = thresholds[level + 1] - start;
  const into = Math.max(0, totalXp - start);
  return { level, into, needed, fraction: needed > 0 ? Math.min(1, into / needed) : 1, isMax: false };
}

/** The highest level whose threshold is <= totalXp (at least 1). */
export function levelForXp(totalXp: number): number {
  const top = coverXp(totalXp);
  // TODO(human): find the level with a binary search over thresholds[1..top].
  // Placeholder - a linear walk, correct but O(level) on every lookup:
  let level = 1;
  while (level < top && thresholds[level + 1] <= totalXp) level += 1;
  return level;
}
