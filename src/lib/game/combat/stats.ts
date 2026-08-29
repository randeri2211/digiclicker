import type { Stage, StatBlock, StatRangeBlock, StatAffinity } from '../types';
import {
  STAGE_POWER,
  STAT_DOMINANT_FACTOR,
  STAT_OFF_FACTOR,
  STAT_RANGE_SPREAD_FRACTION,
  BASE_STAT_SCALE,
  GROWTH_PER_LEVEL_SCALE,
  DIGIVOLUTION_BONUS_SCALE,
  LEVEL_IMPACT_SCALE,
} from '../constants';

// Formulas here are placeholders - tune the actual numbers in constants.ts.

const STAT_KEYS = ['attack', 'defense', 'speed', 'specialAttack'] as const;

const STAT_TO_AFFINITY: Record<(typeof STAT_KEYS)[number], StatAffinity> = {
  attack: 'Attack',
  defense: 'Defense',
  speed: 'Speed',
  specialAttack: 'SpecialAttack',
};

function statMatchesAffinity(stat: (typeof STAT_KEYS)[number], statAffinity: StatAffinity): boolean {
  return STAT_TO_AFFINITY[stat] === statAffinity;
}

function computeStatRange(
  stage: Stage,
  statAffinity: StatAffinity,
  stat: (typeof STAT_KEYS)[number],
  scale: number,
  preTransitionLevel: number
): [min: number, max: number] {
  const power = STAGE_POWER[stage] ?? 1;
  const factor = statMatchesAffinity(stat, statAffinity) ? STAT_DOMINANT_FACTOR : STAT_OFF_FACTOR;
  const mid = (power * scale + preTransitionLevel * LEVEL_IMPACT_SCALE) * factor;
  const spread = mid * STAT_RANGE_SPREAD_FRACTION;
  return [mid - spread, mid + spread];
}

function rollInRange([min, max]: [number, number]): number {
  return Math.round(min + Math.random() * (max - min));
}

// Deterministic - same (stage, statAffinity, scale, preTransitionLevel) always
// produces the same ranges, no Math.random() involved. Safe to expose as a
// preview: reopening/re-rendering it can never reveal or change what an
// actual roll (rollStatBlock below) would produce.
function computeStatBlockRange(
  stage: Stage,
  statAffinity: StatAffinity,
  scale: number,
  preTransitionLevel = 0
): StatRangeBlock {
  return {
    attack: computeStatRange(stage, statAffinity, 'attack', scale, preTransitionLevel),
    defense: computeStatRange(stage, statAffinity, 'defense', scale, preTransitionLevel),
    speed: computeStatRange(stage, statAffinity, 'speed', scale, preTransitionLevel),
    specialAttack: computeStatRange(stage, statAffinity, 'specialAttack', scale, preTransitionLevel),
  };
}

function rollStatBlock(stage: Stage, statAffinity: StatAffinity, scale: number, preTransitionLevel = 0): StatBlock {
  return {
    attack: rollInRange(computeStatRange(stage, statAffinity, 'attack', scale, preTransitionLevel)),
    defense: rollInRange(computeStatRange(stage, statAffinity, 'defense', scale, preTransitionLevel)),
    speed: rollInRange(computeStatRange(stage, statAffinity, 'speed', scale, preTransitionLevel)),
    specialAttack: rollInRange(computeStatRange(stage, statAffinity, 'specialAttack', scale, preTransitionLevel)),
  };
}

export function rollBaseStats(stage: Stage, statAffinity: StatAffinity): StatBlock {
  return rollStatBlock(stage, statAffinity, BASE_STAT_SCALE);
}

export function rollGrowthPerLevel(stage: Stage, statAffinity: StatAffinity): StatBlock {
  return rollStatBlock(stage, statAffinity, GROWTH_PER_LEVEL_SCALE);
}

export function computeGrowthPerLevelRange(stage: Stage, statAffinity: StatAffinity): StatRangeBlock {
  return computeStatBlockRange(stage, statAffinity, GROWTH_PER_LEVEL_SCALE);
}

/** preTransitionLevel is the Digimon's level right before this
 * digivolve/de-digivolve (the transition resets it to 0 afterward) - it
 * feeds a small bonus into the stats gained, on top of the usual
 * stage/affinity-driven amount, scaled by the same dominant/off factor. */
export function rollDigivolutionBonus(stage: Stage, statAffinity: StatAffinity, preTransitionLevel: number): StatBlock {
  return rollStatBlock(stage, statAffinity, DIGIVOLUTION_BONUS_SCALE, preTransitionLevel);
}

export function computeDigivolutionBonusRange(
  stage: Stage,
  statAffinity: StatAffinity,
  preTransitionLevel: number
): StatRangeBlock {
  return computeStatBlockRange(stage, statAffinity, DIGIVOLUTION_BONUS_SCALE, preTransitionLevel);
}

export function zeroStatBlock(): StatBlock {
  return { attack: 0, defense: 0, speed: 0, specialAttack: 0 };
}

export function addStatBlocks(a: StatBlock, b: StatBlock): StatBlock {
  return {
    attack: a.attack + b.attack,
    defense: a.defense + b.defense,
    speed: a.speed + b.speed,
    specialAttack: a.specialAttack + b.specialAttack,
  };
}

/** Only Attack and SpecialAttack currently feed combat damage - both are
 * damage-dealing stats (matching the games' ATK/INT split). Defense/Speed
 * are tracked but inert - no mitigation or tick-rate mechanic exists yet. */
export function damageRelevantSum(block: StatBlock): number {
  return block.attack + block.specialAttack;
}
