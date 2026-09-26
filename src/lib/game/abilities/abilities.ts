import type { AbilityId, RosterEntry } from '../types';
import { getAbility, rollAbility } from './abilityCatalog';
import { spendBits } from '../state/currency.svelte';
import { ACTS, isActComplete } from '../state/actScreen.svelte';
import { isSystemUnlocked } from '../village/village';
import { ABILITY_REROLL_BASE_COST, ABILITY_REROLL_COST_GROWTH, ABILITY_REROLL_COST_CAP_BY_ACT } from '../constants';

// Rerolling a Digimon's special ability - a village service (the
// 'ability-rerolls' system; Andromon in Act 1, Piximon from Act 2 per
// STORY.md). Paying rolls 3 different choices; the player picks one or
// keeps the current ability. The cost grows with every reroll paid on that
// Digimon, up to the current act's cap.

const OFFER_SIZE = 3;

/** 1 for Act 1 until its finale, then 2... (past the last act: one more). */
export function currentActNumber(): number {
  const open = ACTS.find((act) => !isActComplete(act));
  return open ? open.number : ACTS.length + 1;
}

/** What this entry's next reroll costs. */
export function abilityRerollCost(entry: RosterEntry): number {
  const caps = ABILITY_REROLL_COST_CAP_BY_ACT;
  const cap = caps[Math.min(currentActNumber(), caps.length) - 1] ?? Infinity;
  const raw = ABILITY_REROLL_BASE_COST * Math.pow(ABILITY_REROLL_COST_GROWTH, entry.abilityRerolls ?? 0);
  return Math.round(Math.min(raw, cap));
}

/** Pays for a reroll and stores its choices on the entry. False and no-op
 * unless the service is unlocked, no offer is already waiting, and the
 * Bits are there. */
export function startAbilityReroll(entry: RosterEntry): boolean {
  if (!isSystemUnlocked('ability-rerolls') || entry.abilityOffer?.length) return false;
  if (!spendBits(abilityRerollCost(entry))) return false;
  entry.abilityRerolls = (entry.abilityRerolls ?? 0) + 1;
  const offer: AbilityId[] = [];
  const exclude = new Set<AbilityId>(entry.abilityId ? [entry.abilityId] : []);
  while (offer.length < OFFER_SIZE) {
    const id = rollAbility(exclude);
    exclude.add(id);
    offer.push(id);
  }
  entry.abilityOffer = offer;
  return true;
}

/** Settles a paid reroll: takes one of the offered abilities, or keeps the
 * current one (`null`). False if there's no offer or `choice` isn't in it. */
export function chooseRerolledAbility(entry: RosterEntry, choice: AbilityId | null): boolean {
  const offer = entry.abilityOffer;
  if (!offer?.length) return false;
  if (choice !== null) {
    if (!offer.includes(choice) || !getAbility(choice)) return false;
    entry.abilityId = choice;
  }
  entry.abilityOffer = null;
  return true;
}
