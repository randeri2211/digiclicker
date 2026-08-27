import type { Stage, StatBlock, StatType } from '../types';

// PLACEHOLDER combat formulas - not final game balance.

const STAGE_POWER: Record<Stage, number> = {
  Fresh: 1,
  'In-Training': 2,
  Rookie: 3,
  Armor: 4,
  Champion: 4,
  Hybrid: 5,
  Ultimate: 5,
  Mega: 6,
  Ultra: 7,
  'Burst Mode': 7,
  Unknown: 1,
};

const DOMINANT_FACTOR = 1.5;
const OFF_FACTOR = 0.6;
const RANGE_SPREAD_FRACTION = 0.2;

const BASE_STAT_SCALE = 2;
const GROWTH_PER_LEVEL_SCALE = 0.5;
const DIGIVOLUTION_BONUS_SCALE = 5;

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
  scale: number
): [min: number, max: number] {
  const power = STAGE_POWER[stage] ?? 1;
  const factor = statMatchesType(stat, statType) ? DOMINANT_FACTOR : OFF_FACTOR;
  const mid = power * scale * factor;
  const spread = mid * RANGE_SPREAD_FRACTION;
  return [mid - spread, mid + spread];
}

function rollInRange([min, max]: [number, number]): number {
  return Math.round(min + Math.random() * (max - min));
}

function rollStatBlock(stage: Stage, statType: StatType, scale: number): StatBlock {
  return {
    attack: rollInRange(computeStatRange(stage, statType, 'attack', scale)),
    defense: rollInRange(computeStatRange(stage, statType, 'defense', scale)),
    speed: rollInRange(computeStatRange(stage, statType, 'speed', scale)),
    specialAttack: rollInRange(computeStatRange(stage, statType, 'specialAttack', scale)),
  };
}

export function rollBaseStats(stage: Stage, statType: StatType): StatBlock {
  return rollStatBlock(stage, statType, BASE_STAT_SCALE);
}

export function rollGrowthPerLevel(stage: Stage, statType: StatType): StatBlock {
  return rollStatBlock(stage, statType, GROWTH_PER_LEVEL_SCALE);
}

export function rollDigivolutionBonus(stage: Stage, statType: StatType): StatBlock {
  return rollStatBlock(stage, statType, DIGIVOLUTION_BONUS_SCALE);
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
