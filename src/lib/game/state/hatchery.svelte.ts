import type { Egg, HatcheryState } from '../types';
import { createEmptyHatchery } from '../roster/starterRoster';
import { HATCHERY_SLOT_BASE_COST, HATCHERY_SLOT_COST_GROWTH, HATCHERY_STARTING_CAPACITY } from '../constants';
import { spendBits } from './currency.svelte';
import { isSystemUnlocked } from '../village/village';

export const hatchery: HatcheryState = $state(createEmptyHatchery());

/** Straight into a free incubating slot if there is one, else storage -
 * the same landing spot for kill-drops and Shop purchases. */
export function addEgg(egg: Egg): void {
  if (hatchery.incubating.length < hatchery.capacity) {
    hatchery.incubating.push(egg);
  } else {
    hatchery.stored.push(egg);
  }
}

export function removeIncubatingEgg(eggId: string): void {
  const index = hatchery.incubating.findIndex((egg) => egg.eggId === eggId);
  if (index !== -1) hatchery.incubating.splice(index, 1);
}

/** Bits for the next extra slot, or null at max capacity. */
export function hatcherySlotCost(): number | null {
  if (hatchery.capacity >= hatchery.maxCapacity) return null;
  const bought = Math.max(0, hatchery.capacity - HATCHERY_STARTING_CAPACITY);
  return Math.round(HATCHERY_SLOT_BASE_COST * HATCHERY_SLOT_COST_GROWTH ** bought);
}

/** Elecmon's hatchery upgrade: one more incubation slot, filled at once
 * from storage. False and no-op until Elecmon has joined, at max, or
 * without the bits. */
export function buyHatcherySlot(): boolean {
  const cost = hatcherySlotCost();
  if (cost === null || !isSystemUnlocked('hatchery-upgrades') || !spendBits(cost)) return false;
  hatchery.capacity += 1;
  fillIncubatingSlots();
  return true;
}

/** Oldest stored eggs first - called after hatching frees slots (see
 * awardKillXp in combat/xp.ts), so storage drains with no player action. */
export function fillIncubatingSlots(): void {
  while (hatchery.incubating.length < hatchery.capacity && hatchery.stored.length > 0) {
    hatchery.incubating.push(hatchery.stored.shift()!);
  }
}
