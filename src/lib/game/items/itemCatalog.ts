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
  // Boss chips - found on expeditions, not sold. Slotted in on the boss
  // prep screen: +BOSS_CHIP_BONUS of that stat for the whole squad, for one
  // boss fight (see startBossFight in state/combat.svelte.ts).
  'attack-chip': {
    id: 'attack-chip',
    name: 'Attack Chip',
    description: 'Boss fights: the whole squad gets more Attack and Special Attack for one fight.',
    costBits: null,
  },
  'speed-chip': {
    id: 'speed-chip',
    name: 'Speed Chip',
    description: 'Boss fights: the whole squad attacks faster for one fight.',
    costBits: null,
  },
  'hp-disk': {
    id: 'hp-disk',
    name: 'HP Disk',
    description: 'Boss fights: the whole squad gets more HP - a longer timer - for one fight.',
    costBits: null,
  },
};
