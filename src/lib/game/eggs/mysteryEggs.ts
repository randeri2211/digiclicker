import type { DigimonInstance, EggType } from '../types';
import mysteryEggWeightsData from '../../data/mysteryEggWeights.json';
import { createDigimonInstance } from '../roster/starterRoster';
import { weightedPick } from '../util/random';
import { EGG_HATCH_LEVEL, MYSTERY_EGG_COST_BITS } from '../constants';
import { spendBits } from '../state/currency.svelte';
import { team } from '../state/team.svelte';

interface MysteryEggEntry {
  id: string;
  weight: number;
}

export const MYSTERY_EGG_WEIGHTS = mysteryEggWeightsData as unknown as Record<EggType, MysteryEggEntry[]>;

/** Weighted-random pick of a Fresh-stage species within the given
 * EggType's pool (seeded from the same eggType taxonomy every species
 * already has - see egg_type_mapping.py - so every type has a real,
 * non-empty pool; validated by validate_mystery_eggs.py). */
export function rollMysteryEgg(eggType: EggType): DigimonInstance {
  const pool = MYSTERY_EGG_WEIGHTS[eggType];
  const chosen = weightedPick(pool, (entry) => entry.weight);

  const instance = createDigimonInstance(chosen.id, 0);
  instance.eggState = { eggType, hatchAtLevel: EGG_HATCH_LEVEL, isMystery: true };
  return instance;
}

/** Spends MYSTERY_EGG_COST_BITS and, on success, rolls a mystery egg of
 * the given type straight into reserveMembers - same landing spot as a
 * kill-drop egg (see GAMEPLAY_DESIGN.md's Digi-Eggs section). False and
 * no-op if bits are insufficient. */
export function buyMysteryEgg(eggType: EggType): boolean {
  if (!spendBits(MYSTERY_EGG_COST_BITS)) return false;
  team.reserveMembers.push(rollMysteryEgg(eggType));
  return true;
}
