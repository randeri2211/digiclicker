import type { RosterEntry, StatBlock } from '../types';
import { ABILITY_CATALOG } from './abilityCatalog';
import { weightedPick } from '../util/random';
import { removeItem } from '../state/inventory.svelte';

const ABILITY_REROLL_ITEM_ID = 'ability-reroll-crystal';

export function rerollAbility(entry: RosterEntry): void {
  const abilities = Object.values(ABILITY_CATALOG);
  entry.abilityId = weightedPick(abilities, (a) => a.weight).id;
}

export function getAbilityBonusFraction(entry: RosterEntry, statKey: keyof StatBlock): number {
  if (!entry.abilityId) return 0;
  const ability = ABILITY_CATALOG[entry.abilityId];
  return ability.statKey === statKey ? ability.percent / 100 : 0;
}

/** False and no-op if the player doesn't have an Ability Reroll Crystal -
 * removeItem already guards against going negative, so this never
 * partially applies. Mirrors how eggs/mysteryEggs.ts's buyMysteryEgg
 * composes an inventory/currency check with the actual effect. */
export function useAbilityReroll(entry: RosterEntry): boolean {
  if (!removeItem(ABILITY_REROLL_ITEM_ID, 1)) return false;
  rerollAbility(entry);
  return true;
}
