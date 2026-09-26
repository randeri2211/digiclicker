import type { AbilityEffect, RosterEntry } from '../types';
import { getAbility } from './abilityCatalog';
import { diminishedSum } from '../combat/rosterFalloff';
import { ABILITY_AURA_FALLOFF } from '../constants';

// How abilities add up - pure functions of a list of entries (no state),
// so the combat formulas, the boss prep screen and the expedition preview
// all get the same numbers.

function percentsOf(entries: RosterEntry[], effect: AbilityEffect, target?: string): number[] {
  const out: number[] = [];
  for (const entry of entries) {
    const ability = getAbility(entry.abilityId);
    if (ability && ability.effect === effect && (target === undefined || ability.target === target)) out.push(ability.percent);
  }
  return out;
}

/** A roster aura's total bonus as a fraction (0.12 = +12%). Duplicates
 * stack with ABILITY_AURA_FALLOFF - strongest first - so a big roster full
 * of the same aura tops out at 1 / (1 - falloff) copies' worth. */
export function auraBonus(entries: RosterEntry[], effect: AbilityEffect): number {
  return diminishedSum(percentsOf(entries, effect), ABILITY_AURA_FALLOFF) / 100;
}

/** A boss squad's or expedition party's total bonus as a fraction - a
 * plain sum, since those groups are only a handful of Digimon. */
export function partyBonus(entries: RosterEntry[], effect: AbilityEffect): number {
  return percentsOf(entries, effect).reduce((sum, p) => sum + p, 0) / 100;
}

/** One squad member's own matchup bonus against a boss with this
 * attribute and element - its Buster / Hunter ability, if it matches. */
export function matchupBonus(entry: RosterEntry, bossAttribute: string, bossElement: string): number {
  const ability = getAbility(entry.abilityId);
  if (!ability) return 0;
  if (ability.effect === 'vs-attribute' && ability.target === bossAttribute) return ability.percent / 100;
  if (ability.effect === 'vs-element' && ability.target === bossElement) return ability.percent / 100;
  return 0;
}
