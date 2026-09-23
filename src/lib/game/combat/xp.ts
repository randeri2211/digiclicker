import { tryHatch } from '../eggs/eggs';
import { tryAutoDigivolve } from '../evolution/digivolve';
import { levelForXp } from './levelCurve';
import { MAX_LEVEL } from '../constants';
import { getRosterList } from '../state/roster.svelte';
import { hatchery, fillIncubatingSlots } from '../state/hatchery.svelte';

/**
 * Flat-XP rule (GAMEPLAY_DESIGN.md, confirmed): do not divide by roster
 * size. Every roster entry AND every incubating egg receives the full kill
 * XP value - growing the roster is a pure multiplier on total XP earned,
 * never diluted.
 */
export function awardKillXp(xpValue: number): void {
  // Snapshot first - an auto-digivolve adds a new entry mid-loop, which
  // shouldn't also receive this same kill's XP.
  for (const entry of getRosterList()) {
    // Already capped - skip rather than accumulate xp levelForXp would
    // just clamp away anyway.
    if (levelForXp(entry.xp) >= MAX_LEVEL) continue;
    entry.xp += xpValue;
    tryAutoDigivolve(entry);
  }

  // Only incubating eggs progress - stored ones wait for a free slot.
  // Copied since a hatch removes the egg from this array mid-loop.
  for (const egg of [...hatchery.incubating]) {
    egg.xp += xpValue;
    tryHatch(egg);
  }
  fillIncubatingSlots();
}
