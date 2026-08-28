import type { Stage, StatBlock, StatRangeBlock, StatType } from '../types';
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

const STAT_TO_TYPE: Record<(typeof STAT_KEYS)[number], StatType> = {
  attack: 'Attack',
  defense: 'Defense',
  speed: 'Speed',
  specialAttack: 'SpecialAttack',
};

function statMatchesType(stat: (typeof STAT_KEYS)[number], statType: StatType): boolean {
  return STAT_TO_TYPE[stat] === statType;
}

function computeStatRange(
  stage: Stage,
  statType: StatType,
  stat: (typeof STAT_KEYS)[number],
  scale: number,
  preTransitionLevel: number
): [min: number, max: number] {
  const power = STAGE_POWER[stage] ?? 1;
  const factor = statMatchesType(stat, statType) ? STAT_DOMINANT_FACTOR : STAT_OFF_FACTOR;
  const mid = (power * scale + preTransitionLevel * LEVEL_IMPACT_SCALE) * factor;
  const spread = mid * STAT_RANGE_SPREAD_FRACTION;
  return [mid - spread, mid + spread];
}

function rollInRange([min, max]: [number, number]): number {
  return Math.round(min + Math.random() * (max - min));
}

// Deterministic - same (stage, statType, scale, preTransitionLevel) always
// produces the same ranges, no Math.random() involved. Safe to expose as a
// preview: reopening/re-rendering it can never reveal or change what an
// actual roll (rollStatBlock below) would produce.
function computeStatBlockRange(
  stage: Stage,
  statType: StatType,
  scale: number,
  preTransitionLevel = 0
): StatRangeBlock {
  return {
    attack: computeStatRange(stage, statType, 'attack', scale, preTransitionLevel),
    defense: computeStatRange(stage, statType, 'defense', scale, preTransitionLevel),
    speed: computeStatRange(stage, statType, 'speed', scale, preTransitionLevel),
    specialAttack: computeStatRange(stage, statType, 'specialAttack', scale, preTransitionLevel),
  };
}

function rollStatBlock(stage: Stage, statType: StatType, scale: number, preTransitionLevel = 0): StatBlock {
  return {
    attack: rollInRange(computeStatRange(stage, statType, 'attack', scale, preTransitionLevel)),
    defense: rollInRange(computeStatRange(stage, statType, 'defense', scale, preTransitionLevel)),
    speed: rollInRange(computeStatRange(stage, statType, 'speed', scale, preTransitionLevel)),
    specialAttack: rollInRange(computeStatRange(stage, statType, 'specialAttack', scale, preTransitionLevel)),
  };
}

export function rollBaseStats(stage: Stage, statType: StatType): StatBlock {
  return rollStatBlock(stage, statType, BASE_STAT_SCALE);
}

export function rollGrowthPerLevel(stage: Stage, statType: StatType): StatBlock {
  return rollStatBlock(stage, statType, GROWTH_PER_LEVEL_SCALE);
}

export function computeGrowthPerLevelRange(stage: Stage, statType: StatType): StatRangeBlock {
  return computeStatBlockRange(stage, statType, GROWTH_PER_LEVEL_SCALE);
}

/** preTransitionLevel is the Digimon's level right before this
 * digivolve/de-digivolve (the transition resets it to 0 afterward) - it
 * feeds a small bonus into the stats gained, on top of the usual
 * stage/type-driven amount, scaled by the same dominant/off factor. */
export function rollDigivolutionBonus(stage: Stage, statType: StatType, preTransitionLevel: number): StatBlock {
  return rollStatBlock(stage, statType, DIGIVOLUTION_BONUS_SCALE, preTransitionLevel);
}

export function computeDigivolutionBonusRange(
  stage: Stage,
  statType: StatType,
  preTransitionLevel: number
): StatRangeBlock {
  return computeStatBlockRange(stage, statType, DIGIVOLUTION_BONUS_SCALE, preTransitionLevel);
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
