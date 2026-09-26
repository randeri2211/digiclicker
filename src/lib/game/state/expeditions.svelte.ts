import type { ActiveExpedition, Egg, ExpeditionHaul, ExpeditionState, RosterEntry } from '../types';
import { roster, getRosterList } from './roster.svelte';
import { currency } from './currency.svelte';
import { addEgg } from './hatchery.svelte';
import { addItem } from './inventory.svelte';
import { areaProgress } from './areaProgress.svelte';
import { combat } from './combat.svelte';
import {
  getDestination,
  isDestinationUnlocked,
  expeditionDurationMs,
  expeditionHaulMultiplier,
  rollHaul,
  expeditionEggFactor,
} from '../expeditions/expeditions';
import { EXPEDITION_MAX_PARTY } from '../constants';
import { expeditionSlots } from './shop.svelte';
import { isSystemUnlocked } from '../village/village';

export const expeditions: ExpeditionState = $state({ active: [], lastHaul: null });

/** Back once its time is up - read from the clock, not only the
 * `returned` flag, so nothing (claiming, fighting again) waits on the tick
 * loop having run since then. */
export function hasReturned(expedition: ActiveExpedition, now: number = Date.now()): boolean {
  return expedition.returned || now >= expedition.endsAt;
}

/** On an expedition that hasn't returned yet - away Digimon don't fight,
 * earn no kill XP and can't join a boss squad. */
export function isAway(speciesId: string, now: number = Date.now()): boolean {
  return expeditions.active.some((e) => !hasReturned(e, now) && e.memberSpeciesIds.includes(speciesId));
}

/** The roster minus anyone away - who fights normal wilds and gets XP. */
export function getFightingRoster(): RosterEntry[] {
  return getRosterList().filter((entry) => !isAway(entry.speciesId));
}

/** Sends a party. False and no-op unless Tentomon has joined (the
 * expeditions system), the destination is unlocked, a
 * slot is free (returned-but-unclaimed expeditions still hold theirs),
 * and the party is 1..EXPEDITION_MAX_PARTY distinct owned Digimon who
 * aren't already away or in a running boss squad. */
export function startExpedition(destinationId: string, memberSpeciesIds: string[], now: number = Date.now()): boolean {
  const destination = getDestination(destinationId);
  if (!isSystemUnlocked('expeditions')) return false;
  if (!destination || !isDestinationUnlocked(areaProgress, destination)) return false;
  if (expeditions.active.length >= expeditionSlots()) return false;
  const party = [...new Set(memberSpeciesIds)];
  const inBossSquad = new Set(combat.boss?.squad.map((m) => m.speciesId) ?? []);
  if (party.length === 0 || party.length > EXPEDITION_MAX_PARTY) return false;
  if (party.some((id) => !roster[id] || isAway(id) || inBossSquad.has(id))) return false;

  const entries = party.map((id) => roster[id]);
  expeditions.active.push({
    id: crypto.randomUUID(),
    destinationId,
    memberSpeciesIds: party,
    startedAt: now,
    endsAt: now + expeditionDurationMs(destination, entries),
    returned: false,
  });
  return true;
}

/** Marks finished expeditions as returned - called every combat tick and
 * on load, so parties come back even while the tab was closed. */
export function updateExpeditions(now: number = Date.now()): void {
  for (const expedition of expeditions.active) {
    if (!expedition.returned && hasReturned(expedition, now)) expedition.returned = true;
  }
}

/** Rolls and pays out a returned expedition's loot, freeing its slot.
 * Null if it doesn't exist or hasn't returned yet. The haul multiplier
 * uses the party as it is now (members still owned). */
export function claimExpedition(id: string, now: number = Date.now()): ExpeditionHaul | null {
  const index = expeditions.active.findIndex((e) => e.id === id);
  const expedition = expeditions.active[index];
  const destination = expedition ? getDestination(expedition.destinationId) : undefined;
  if (!expedition || !hasReturned(expedition, now) || !destination) return null;

  const party = partyOf(expedition);
  const { haul, eggs } = rollHaul(destination, expeditionHaulMultiplier(destination, party), expeditionEggFactor(party));
  payHaul(haul, eggs);
  expeditions.active.splice(index, 1);
  expeditions.lastHaul = haul;
  return haul;
}

/** Calls a party home before its time is up: the members fight again right
 * away and the slot frees, but the trip is forfeit - no haul (so short
 * recalled trips can't be farmed). A party that's already back is simply
 * claimed. False if the expedition doesn't exist. */
export function recallExpedition(id: string, now: number = Date.now()): boolean {
  const index = expeditions.active.findIndex((e) => e.id === id);
  const expedition = expeditions.active[index];
  if (!expedition) return false;
  if (hasReturned(expedition, now)) return claimExpedition(id, now) !== null;
  expeditions.active.splice(index, 1);
  return true;
}

function partyOf(expedition: ActiveExpedition): RosterEntry[] {
  return expedition.memberSpeciesIds.filter((sid) => roster[sid]).map((sid) => roster[sid]);
}

function payHaul(haul: ExpeditionHaul, eggs: Egg[]): void {
  currency.data += haul.data;
  for (const egg of eggs) addEgg(egg);
  for (const item of haul.items) addItem(item.id, item.count);
}

export function dismissHaul(): void {
  expeditions.lastHaul = null;
}
