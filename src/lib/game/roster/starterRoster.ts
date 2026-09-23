import type { HatcheryState, RosterEntry, RosterState, StatBlock } from '../types';
import { getSpecies } from '../images';
import { rollBaseStats, rollGrowthPerLevel, zeroStatBlock } from '../combat/stats';
import { getAllAreaSpeciesIds } from '../areas/areaRegistry';
import { HATCHERY_STARTING_CAPACITY, HATCHERY_MAX_CAPACITY } from '../constants';

// PLACEHOLDER: hardcoded starting roster.
const STARTER_SPECIES = ['agumon', 'gomamon'];

// Every species this slice can possibly render - used to preload sprites
// before showing the game, since some images are large enough to visibly
// pop in otherwise.
export const PRELOAD_SPECIES_IDS = [...getAllAreaSpeciesIds(), ...STARTER_SPECIES];

// Shared entry-creation logic - used for starters, egg hatches (see
// game/eggs/eggs.ts) and digivolves (see game/evolution/digivolve.ts,
// the only caller that passes an inherited bonus and its source level).
export function createRosterEntry(
  speciesId: string,
  inheritedBonus: StatBlock = zeroStatBlock(),
  inheritedFromLevel = 0
): RosterEntry {
  const species = getSpecies(speciesId);
  const stage = species?.stage ?? 'Unknown';
  const statAffinity = species?.statAffinity ?? 'Attack';
  return {
    speciesId,
    xp: 0,
    baseStats: rollBaseStats(stage, statAffinity),
    growthPerLevel: rollGrowthPerLevel(stage, statAffinity),
    inheritedBonus,
    inheritedFromLevel,
    abilityId: null,
  };
}

export function createStarterRoster(): RosterState {
  return Object.fromEntries(STARTER_SPECIES.map((speciesId) => [speciesId, createRosterEntry(speciesId)]));
}

export function createEmptyHatchery(): HatcheryState {
  return {
    capacity: HATCHERY_STARTING_CAPACITY,
    maxCapacity: HATCHERY_MAX_CAPACITY,
    incubating: [],
    stored: [],
  };
}
