import type { DigimonInstance, TeamState } from '../types';
import { getSpecies } from '../images';
import { rollBaseStats, rollGrowthPerLevel, zeroStatBlock } from '../combat/stats';

// PLACEHOLDER: curated species pool confirmed to have resolved sprites.
// Mirrors the approved mockup's own example roster.
export const WILD_SPAWN_POOL = ['betamon', 'biyomon', 'greymon'] as const;

// PLACEHOLDER: hardcoded starting team. Taming/roster growth is out of
// scope this slice, so the roster is otherwise static for the whole
// playable loop. One member per pool is deliberate - the smallest case
// that still makes the flat-XP rule easy to eyeball manually.
export const AREA_LABEL = 'Digital World — File Island';
export const AREA_NAME = 'FOREST SECTOR';

const STARTER_ACTIVE_SPECIES = 'agumon';
const STARTER_TRAINING_SPECIES = 'gomamon';

// Every species this slice can possibly render - used to preload sprites
// before showing the game, since some images are large enough to visibly
// pop in otherwise.
export const PRELOAD_SPECIES_IDS = [
  ...WILD_SPAWN_POOL,
  STARTER_ACTIVE_SPECIES,
  STARTER_TRAINING_SPECIES,
];

function makeInstance(speciesId: string, xp: number): DigimonInstance {
  const species = getSpecies(speciesId);
  const stage = species?.stage ?? 'Unknown';
  const statType = species?.statType ?? 'Attack';
  return {
    instanceId: crypto.randomUUID(),
    speciesId,
    xp,
    formHistory: [speciesId],
    baseStats: rollBaseStats(stage, statType),
    growthPerLevel: rollGrowthPerLevel(stage, statType),
    digivolutionStats: zeroStatBlock(),
  };
}

export function createStarterTeam(): TeamState {
  return {
    activeCapacity: 1,
    activeMaxCapacity: 6,
    activeMembers: [makeInstance(STARTER_ACTIVE_SPECIES, 0)],
    trainingCapacity: 1,
    trainingMaxCapacity: 6,
    trainingMembers: [makeInstance(STARTER_TRAINING_SPECIES, 0)],
  };
}
