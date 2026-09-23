import type { ItemDefinition, ItemId } from '../types';
import { DEDIGIVOLVE_CRYSTAL_COST_BITS, ABILITY_REROLL_COST_BITS } from '../constants';

/** Single source of truth for item metadata/pricing - mirrors how
 * constants.ts centralizes tunables. Every ItemId must have an entry here. */
export const ITEM_CATALOG: Record<ItemId, ItemDefinition> = {
  'dedigivolve-crystal': {
    id: 'dedigivolve-crystal',
    name: 'De-Digivolution Crystal',
    description: 'Consumed to de-digivolve a Digimon into a prior form.',
    costBits: DEDIGIVOLVE_CRYSTAL_COST_BITS,
  },
  'ability-reroll-crystal': {
    id: 'ability-reroll-crystal',
    name: 'Ability Reroll Crystal',
    description: "Rerolls a Digimon's special ability.",
    costBits: ABILITY_REROLL_COST_BITS,
  },
};
