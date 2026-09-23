import type { Egg, HatcheryState } from '../types';
import { createEmptyHatchery } from '../roster/starterRoster';

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

/** Oldest stored eggs first - called after hatching frees slots (see
 * awardKillXp in combat/xp.ts), so storage drains with no player action. */
export function fillIncubatingSlots(): void {
  while (hatchery.incubating.length < hatchery.capacity && hatchery.stored.length > 0) {
    hatchery.incubating.push(hatchery.stored.shift()!);
  }
}
