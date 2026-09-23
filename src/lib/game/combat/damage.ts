import type { RosterEntry, StatBlock } from '../types';
import { levelForXp } from './levelCurve';
import { getAbilityBonusFraction } from '../abilities/abilities';
import { CLICK_DAMAGE_BASE, CLICK_DAMAGE_DPS_FRACTION, BASE_ATTACKS_PER_SECOND, SPEED_TO_APS_SCALE } from '../constants';

// Scales with roster DPS (see CLICK_DAMAGE_BASE/CLICK_DAMAGE_DPS_FRACTION)
// so clicking stays a proportional boost on top of idle damage instead of
// fading into irrelevance as the roster grows.
export function computeClickDamage(entries: RosterEntry[]): number {
  return CLICK_DAMAGE_BASE + computeRosterDps(entries) * CLICK_DAMAGE_DPS_FRACTION;
}

// One entry's current effective value for a single stat - baseStats +
// level*growthPerLevel + inheritedBonus, then a special ability's % bonus
// applied on top if it targets this exact stat (see
// getAbilityBonusFraction). The one place this formula lives - every
// combat computation AND the Stat window's display both call this, so
// they can never drift apart.
export function computeEntryStatValue(entry: RosterEntry, statKey: keyof StatBlock): number {
  const level = levelForXp(entry.xp);
  const raw = entry.baseStats[statKey] + level * entry.growthPerLevel[statKey] + entry.inheritedBonus[statKey];
  return raw * (1 + getAbilityBonusFraction(entry, statKey));
}

export function computeRosterStatTotal(entries: RosterEntry[], statKey: keyof StatBlock): number {
  return entries.reduce((total, entry) => total + computeEntryStatValue(entry, statKey), 0);
}

// This entry's flat damage on a single attack tick - not an average, an
// entry's Attack+SpecialAttack total is deterministic per instant (no
// per-hit roll), so every tick at a given moment hits for exactly this.
export function computeEntryDamagePerHit(entry: RosterEntry): number {
  return computeEntryStatValue(entry, 'attack') + computeEntryStatValue(entry, 'specialAttack');
}

export function computeRosterDamagePerHit(entries: RosterEntry[]): number {
  return entries.reduce((total, entry) => total + computeEntryDamagePerHit(entry), 0);
}

// Attack rate is a roster-wide number (driven by the whole roster's summed
// Speed), not per-entry - there's one shared tick clock, not one per
// Digimon.
export function computeAttacksPerSecond(entries: RosterEntry[]): number {
  return BASE_ATTACKS_PER_SECOND + computeRosterStatTotal(entries, 'speed') * SPEED_TO_APS_SCALE;
}

// ---- Boss squads ----------------------------------------------------
// A boss fight uses only the squad, each member's stats scaled by its
// matchup multiplier against the boss (see combat/advantage.ts) - the same
// formulas as the roster versions above, just over a weighted list.

export interface WeightedEntry {
  entry: RosterEntry;
  multiplier: number;
}

/** Extra fraction per stat for the whole squad (boss chips). */
export type SquadStatBonus = Partial<Record<keyof StatBlock, number>>;

export function computeSquadStat(members: WeightedEntry[], statKey: keyof StatBlock, bonus: SquadStatBonus = {}): number {
  const total = members.reduce((sum, m) => sum + computeEntryStatValue(m.entry, statKey) * m.multiplier, 0);
  return total * (1 + (bonus[statKey] ?? 0));
}

export function computeSquadDamagePerHit(members: WeightedEntry[], bonus: SquadStatBonus = {}): number {
  return computeSquadStat(members, 'attack', bonus) + computeSquadStat(members, 'specialAttack', bonus);
}

export function computeSquadAttacksPerSecond(members: WeightedEntry[], bonus: SquadStatBonus = {}): number {
  return BASE_ATTACKS_PER_SECOND + computeSquadStat(members, 'speed', bonus) * SPEED_TO_APS_SCALE;
}

export function computeSquadDps(members: WeightedEntry[], bonus: SquadStatBonus = {}): number {
  return computeSquadAttacksPerSecond(members, bonus) * computeSquadDamagePerHit(members, bonus);
}

export function computeSquadClickDamage(members: WeightedEntry[], bonus: SquadStatBonus = {}): number {
  return CLICK_DAMAGE_BASE + computeSquadDps(members, bonus) * CLICK_DAMAGE_DPS_FRACTION;
}

// Aggregate rate (attacks/sec * damage/hit) - not used by the tick loop
// itself (that simulates discrete attack ticks, see combat.svelte.ts), but
// kept as the single number for any "DPS" display.
export function computeRosterDps(entries: RosterEntry[]): number {
  return computeAttacksPerSecond(entries) * computeRosterDamagePerHit(entries);
}

// An entry's share of roster DPS at the shared attack rate - summing this
// across the roster reproduces computeRosterDps exactly. Takes the rate
// precomputed, since callers ranking the whole roster would otherwise
// recompute the same roster-wide Speed sum once per entry.
export function computeEntryDps(entry: RosterEntry, attacksPerSecond: number): number {
  return attacksPerSecond * computeEntryDamagePerHit(entry);
}
