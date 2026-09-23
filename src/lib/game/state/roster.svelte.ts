import type { RosterEntry, RosterState } from '../types';
import { createStarterRoster } from '../roster/starterRoster';

export const roster: RosterState = $state(createStarterRoster());

// Owning a species and having it "discovered" are the same thing - an
// entry can never be lost, and an egg's species stays hidden until it
// hatches into the roster - so the Compendium reads this directly instead
// of keeping a separate record that could drift out of sync.
export function isOwned(speciesId: string): boolean {
  return speciesId in roster;
}

export function getRosterList(): RosterEntry[] {
  return Object.values(roster);
}

/** False and no-op if the species is already owned - the roster holds at
 * most one entry per species. */
export function addToRoster(entry: RosterEntry): boolean {
  if (isOwned(entry.speciesId)) return false;
  roster[entry.speciesId] = entry;
  return true;
}
