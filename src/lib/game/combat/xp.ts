import { playSound } from '../audio/sfx.svelte';
import { isEggReady } from '../eggs/eggs';
import { tryAutoDigivolve } from '../evolution/digivolve';
import { levelForXp } from './levelCurve';
import { auraBonus } from '../abilities/abilityEffects';
import {
  KILL_XP_SPLIT_EXPONENT,
  XP_OVERLEVEL_GRACE,
  XP_OVERLEVEL_PENALTY_PER_LEVEL,
  XP_OVERLEVEL_MIN_FACTOR,
  PARTNER_EXTRA_GRACE,
  PARTNER_XP_BONUS,
  PARTNER_KILL_XP_SPLIT_EXPONENT,
} from '../constants';
import { isPartner } from '../state/partners.svelte';
import { getFightingRoster } from '../state/expeditions.svelte';
import { hatchery, fillIncubatingSlots } from '../state/hatchery.svelte';

/** Kill XP multiplier for a Digimon at `level` beating a wild at
 * `wildLevel`: 1 up to XP_OVERLEVEL_GRACE levels above it, then
 * XP_OVERLEVEL_PENALTY_PER_LEVEL less per extra level, floored at
 * XP_OVERLEVEL_MIN_FACTOR (grinding far below you still creeps along). */
export function overlevelXpFactor(level: number, wildLevel: number, extraGrace = 0): number {
  const over = level - wildLevel - XP_OVERLEVEL_GRACE - extraGrace;
  if (over <= 0) return 1;
  return Math.max(XP_OVERLEVEL_MIN_FACTOR, 1 - over * XP_OVERLEVEL_PENALTY_PER_LEVEL);
}

/**
 * Kill XP is shared by the fighting roster: each gets
 * xpValue / fighters^KILL_XP_SPLIT_EXPONENT (0 = no split, the old flat
 * rule; see GAMEPLAY_DESIGN.md). Without a split, every new form added
 * full-speed levelling on top of its extra damage and the roster
 * snowballed (tools/simulate.mjs). Incubating eggs still get the full
 * value - hatching doesn't snowball. Digimon away on an expedition earn
 * nothing. With the wild's level, a Digimon well above it gets less
 * (overlevelXpFactor), so levels settle near the area being played.
 */
/** `eggMultiplier`: extra factor on the eggs' share (the Shop's egg boost). */
export function awardKillXp(xpValue: number, wildLevel?: number, eggMultiplier = 1): void {
  // Snapshot first - an auto-digivolve adds a new entry mid-loop, which
  // shouldn't also receive this same kill's XP.
  const fighters = getFightingRoster();
  // Mentor auras boost the Digimon's XP, Warm Heart auras the eggs'.
  const eggXp = xpValue * (1 + auraBonus(fighters, 'egg-xp')) * eggMultiplier;
  xpValue *= 1 + auraBonus(fighters, 'kill-xp');
  const share = xpValue / Math.max(1, fighters.length) ** KILL_XP_SPLIT_EXPONENT;
  const partnerShare = xpValue / Math.max(1, fighters.length) ** PARTNER_KILL_XP_SPLIT_EXPONENT;
  let levelledUp = false;
  for (const entry of fighters) {
    // Partners: their own (normally unsplit) share plus a bonus, and more
    // room above the wilds.
    const partner = isPartner(entry.speciesId);
    const base = partner ? partnerShare * (1 + PARTNER_XP_BONUS) : share;
    const grace = partner ? PARTNER_EXTRA_GRACE : 0;
    const levelBefore = levelForXp(entry.xp);
    entry.xp += wildLevel === undefined ? base : base * overlevelXpFactor(levelBefore, wildLevel, grace);
    if (levelForXp(entry.xp) > levelBefore) levelledUp = true;
    tryAutoDigivolve(entry);
  }
  if (levelledUp) playSound('levelUp');

  // Only incubating eggs progress - stored ones wait for a free slot, and
  // a ready egg stops at the hatch level until it's paid for (hatchEgg in
  // eggs/eggs.ts), holding its slot.
  for (const egg of hatchery.incubating) {
    if (!isEggReady(egg)) egg.xp += eggXp;
  }
  fillIncubatingSlots();
}
