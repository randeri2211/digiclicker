import type { InventoryState, ItemId } from '../types';
import { ITEM_CATALOG } from '../items/itemCatalog';

function emptyInventory(): InventoryState {
  const entries = Object.keys(ITEM_CATALOG).map((id) => [id, 0]);
  return Object.fromEntries(entries) as InventoryState;
}

export const inventory: InventoryState = $state(emptyInventory());

export function getItemCount(id: ItemId): number {
  return inventory[id];
}

export function addItem(id: ItemId, amount = 1) {
  inventory[id] += amount;
}

/** False and no-op if the player doesn't have enough - never allows going
 * negative. */
export function removeItem(id: ItemId, amount = 1): boolean {
  if (inventory[id] < amount) return false;
  inventory[id] -= amount;
  return true;
}
