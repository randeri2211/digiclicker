import type { ItemId } from '../types';
import { ITEM_CATALOG } from './itemCatalog';
import { currency, spendBits } from '../state/currency.svelte';
import { addItem } from '../state/inventory.svelte';

export function canAffordItem(id: ItemId): boolean {
  return currency.bits >= ITEM_CATALOG[id].costBits;
}

/** False and no-op if bits are insufficient - spendBits already guards
 * against going negative, so this never partially applies. */
export function buyItem(id: ItemId): boolean {
  if (!spendBits(ITEM_CATALOG[id].costBits)) return false;
  addItem(id);
  return true;
}
