import type { ItemDefinition, ItemId } from '../types';
import { DIGI_MEAT } from '../constants';

/** Single source of truth for item metadata/pricing - mirrors how
 * constants.ts centralizes tunables. Every ItemId must have an entry here. */
export const ITEM_CATALOG: Record<ItemId, ItemDefinition> = {
  // Digi-Meat - sold in the Shop, fed to one Digimon from its menu for flat
  // XP (feedMeat in state/shop.svelte.ts).
  'meat-small': {
    id: 'meat-small',
    name: 'Small Meat',
    description: `Feed to a Digimon: +${DIGI_MEAT['meat-small'].xp.toLocaleString('en-US')} XP.`,
    costBits: DIGI_MEAT['meat-small'].costBits,
  },
  meat: {
    id: 'meat',
    name: 'Meat',
    description: `Feed to a Digimon: +${DIGI_MEAT.meat.xp.toLocaleString('en-US')} XP.`,
    costBits: DIGI_MEAT.meat.costBits,
  },
  'meat-giant': {
    id: 'meat-giant',
    name: 'Giant Meat',
    description: `Feed to a Digimon: +${DIGI_MEAT['meat-giant'].xp.toLocaleString('en-US')} XP.`,
    costBits: DIGI_MEAT['meat-giant'].costBits,
  },
  'meat-prime': {
    id: 'meat-prime',
    name: 'Prime Sirloin',
    description: `Feed to a Digimon: +${DIGI_MEAT['meat-prime'].xp.toLocaleString('en-US')} XP.`,
    costBits: DIGI_MEAT['meat-prime'].costBits,
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
