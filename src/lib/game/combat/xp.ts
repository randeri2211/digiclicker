import { isEggReady } from '../eggs/eggs';
import { tryAutoDigivolve } from '../evolution/digivolve';
import { levelForXp } from './levelCurve';
import { MAX_LEVEL, KILL_XP_SPLIT_EXPONENT } from '../constants';
import { getFightingRoster } from '../state/expeditions.svelte';
import { hatchery, fillIncubatingSlots } from '../state/hatchery.svelte';

/**
 * Kill XP is shared by the fighting roster: each gets
 * xpValue / fighters^KILL_XP_SPLIT_EXPONENT (0 = no split, the old flat
 * rule; see GAMEPLAY_DESIGN.md). Without a split, every new form added
 * full-speed levelling on top of its extra damage and the roster
 * snowballed (tools/simulate.mjs). Incubating eggs still get the full
 * value - hatching doesn't snowball. Digimon away on an expedition earn
 * nothing.
 */
export function awardKillXp(xpValue: number): void {
  // Snapshot first - an auto-digivolve adds a new entry mid-loop, which
  // shouldn't also receive this same kill's XP.
  const fighters = getFightingRoster();
  const share = xpValue / Math.max(1, fighters.length) ** KILL_XP_SPLIT_EXPONENT;
  for (const entry of fighters) {
    // Already capped - skip rather than accumulate xp levelForXp would
    // just clamp away anyway.
    if (levelForXp(entry.xp) >= MAX_LEVEL) continue;
    entry.xp += share;
    tryAutoDigivolve(entry);
  }

  // Only incubating eggs progress - stored ones wait for a free slot, and
  // a ready egg stops at the hatch level until it's paid for (hatchEgg in
  // eggs/eggs.ts), holding its slot.
  for (const egg of hatchery.incubating) {
    if (!isEggReady(egg)) egg.xp += xpValue;
  }
  fillIncubatingSlots();
}
