import type { Egg, EggType } from '../types';
import mysteryEggWeightsData from '../../data/mysteryEggWeights.json';
import { createEgg } from './eggs';
import { weightedPick } from '../util/random';
import { MYSTERY_EGG_COST_BITS } from '../constants';
import { spendBits } from '../state/currency.svelte';
import { addEgg } from '../state/hatchery.svelte';

interface MysteryEggEntry {
  id: string;
  weight: number;
}

export const MYSTERY_EGG_WEIGHTS = mysteryEggWeightsData as unknown as Record<EggType, MysteryEggEntry[]>;

/** Weighted-random pick of a Fresh-stage species within the given
 * EggType's pool (seeded from the same eggType taxonomy every species
 * already has - see egg_type_mapping.py - so every type has a real,
 * non-empty pool; validated by validate_mystery_eggs.py). */
export function rollMysteryEgg(eggType: EggType): Egg {
  const pool = MYSTERY_EGG_WEIGHTS[eggType];
  const chosen = weightedPick(pool, (entry) => entry.weight);
  return createEgg(chosen.id, eggType, true);
}

/** Spends MYSTERY_EGG_COST_BITS and, on success, rolls a mystery egg of
 * the given type into the hatchery - same landing spot as a kill-drop egg
 * (see GAMEPLAY_DESIGN.md's Digi-Eggs section). False and no-op if bits
 * are insufficient. */
export function buyMysteryEgg(eggType: EggType): boolean {
  if (!spendBits(MYSTERY_EGG_COST_BITS)) return false;
  addEgg(rollMysteryEgg(eggType));
  return true;
}
