import type { ItemDefinition, ItemId } from '../types';
import { ABILITY_REROLL_COST_BITS } from '../constants';

/** Single source of truth for item metadata/pricing - mirrors how
 * constants.ts centralizes tunables. Every ItemId must have an entry here. */
export const ITEM_CATALOG: Record<ItemId, ItemDefinition> = {
  'ability-reroll-crystal': {
    id: 'ability-reroll-crystal',
    name: 'Ability Reroll Crystal',
    description: "Rerolls a Digimon's special ability.",
    costBits: ABILITY_REROLL_COST_BITS,
  },
};
