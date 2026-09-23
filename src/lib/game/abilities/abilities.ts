import type { DigimonInstance, StatBlock } from '../types';
import { ABILITY_CATALOG } from './abilityCatalog';
import { weightedPick } from '../util/random';
import { removeItem } from '../state/inventory.svelte';

const ABILITY_REROLL_ITEM_ID = 'ability-reroll-crystal';

export function rerollAbility(instance: DigimonInstance): void {
  const entries = Object.values(ABILITY_CATALOG);
  instance.abilityId = weightedPick(entries, (a) => a.weight).id;
}

export function getAbilityBonusFraction(instance: DigimonInstance, statKey: keyof StatBlock): number {
  if (!instance.abilityId) return 0;
  const ability = ABILITY_CATALOG[instance.abilityId];
  return ability.statKey === statKey ? ability.percent / 100 : 0;
}

/** False and no-op if the player doesn't have an Ability Reroll Crystal -
 * removeItem already guards against going negative, so this never
 * partially applies. Mirrors how items/mysteryEggs.ts's buyMysteryEgg
 * composes an inventory/currency check with the actual effect. */
export function useAbilityReroll(instance: DigimonInstance): boolean {
  if (!removeItem(ABILITY_REROLL_ITEM_ID, 1)) return false;
  rerollAbility(instance);
  return true;
}
