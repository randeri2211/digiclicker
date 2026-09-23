import { MAX_LEVEL } from '../constants';
import { buildXpThresholds } from './levelCurveFormulas';
import { LEVEL_XP_CURVE } from './levelCurveParams';

// XP_THRESHOLDS[level] = total XP to reach that level, built once from the
// XP-per-level-up curve (see levelCurveFormulas.ts) - levelForXp runs for
// every roster entry on every stat lookup (several times per combat tick),
// so it only ever walks this table.
const XP_THRESHOLDS: number[] = buildXpThresholds(LEVEL_XP_CURVE, MAX_LEVEL);

export function xpToReachLevel(level: number): number {
  if (level <= 1) return 0;
  return XP_THRESHOLDS[Math.min(level, XP_THRESHOLDS.length - 1)];
}

export interface LevelProgress {
  level: number;
  /** XP earned since reaching the current level. */
  into: number;
  /** XP the current level-up costs in total (0 at max level). */
  needed: number;
  /** 0..1 through the current level; 1 at max level. */
  fraction: number;
  isMax: boolean;
}

// Where an XP total sits within its current level - what an XP bar draws.
export function levelProgress(totalXp: number): LevelProgress {
  const level = levelForXp(totalXp);
  if (level >= MAX_LEVEL) return { level, into: 0, needed: 0, fraction: 1, isMax: true };
  const start = xpToReachLevel(level);
  const needed = xpToReachLevel(level + 1) - start;
  const into = Math.max(0, totalXp - start);
  return { level, into, needed, fraction: needed > 0 ? Math.min(1, into / needed) : 1, isMax: false };
}

export function levelForXp(totalXp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && XP_THRESHOLDS[level + 1] <= totalXp) {
    level += 1;
  }
  return level;
}
