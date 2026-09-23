import type { ItemId } from '../types';
import { ITEM_CATALOG } from './itemCatalog';
import { currency, spendBits } from '../state/currency.svelte';
import { addItem } from '../state/inventory.svelte';
import { isSystemUnlocked } from '../village/village';

/** False for items the Shop doesn't sell (costBits null). */
export function canAffordItem(id: ItemId): boolean {
  const cost = ITEM_CATALOG[id].costBits;
  return cost !== null && currency.bits >= cost;
}

/** False and no-op if bits are insufficient - spendBits already guards
 * against going negative, so this never partially applies. */
export function buyItem(id: ItemId): boolean {
  const cost = ITEM_CATALOG[id].costBits;
  if (cost === null || !isSystemUnlocked('shop') || !spendBits(cost)) return false;
  addItem(id);
  return true;
}
