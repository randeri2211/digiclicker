import npcsData from '../../data/npcs.json';
import type { NpcDefinition, SystemId } from '../types';
import { hasFlag } from '../state/progress.svelte';

// Story characters and the village. The whole gating model is data: an NPC
// with `systems` opens them once they've joined, and they join when the
// flag `resident:<id>` is set - normally a quest reward. Gating a new
// system = give some NPC `systems: [...]` and write the quest that rewards
// their flag; the gated code only ever asks isSystemUnlocked(system).

export const NPCS = npcsData as unknown as Record<string, NpcDefinition>;

export function getNpc(npcId: string | undefined): NpcDefinition | undefined {
  return npcId ? NPCS[npcId] : undefined;
}

/** The flag a quest sets to move this NPC into the village. */
export function residentFlag(npcId: string): string {
  return `resident:${npcId}`;
}

export function hasJoined(npc: NpcDefinition): boolean {
  return Boolean(npc.resident) && (Boolean(npc.startsInVillage) || hasFlag(residentFlag(npc.id)));
}

export function getResidents(): NpcDefinition[] {
  return Object.values(NPCS).filter((npc) => npc.resident);
}

/** The resident who provides `system` (first listed, if several). */
export function systemProvider(system: SystemId): NpcDefinition | undefined {
  return Object.values(NPCS).find((npc) => npc.systems?.includes(system));
}

/** Open if no NPC gates it, or its provider has joined the village. */
export function isSystemUnlocked(system: SystemId): boolean {
  const providers = Object.values(NPCS).filter((npc) => npc.systems?.includes(system));
  return providers.length === 0 || providers.some(hasJoined);
}

/** "Unlocks when Tentomon joins the village" - for locked buttons. */
export function lockedHint(system: SystemId): string {
  const npc = systemProvider(system);
  return npc ? `Unlocks when ${npc.name} joins the village` : '';
}

export const SYSTEM_NAMES: Record<SystemId, string> = {
  expeditions: 'Expeditions',
  'hatchery-upgrades': 'Hatchery upgrades',
  'mystery-eggs': 'Mystery Egg stall',
  shop: 'Shop',
  'ability-rerolls': 'Ability rerolls',
  'continent-travel': 'Travel across the sea',
};

// Residents already in the village last time this was called - so the
// "joined" toast fires once, when the flag is newly set. Seeded silently on
// the first call and after a load, like newlyReadyQuests.
let knownJoined: Set<string> | null = null;

export function resetResidentWatch(): void {
  knownJoined = null;
}

export function newlyJoinedResidents(): NpcDefinition[] {
  const joined = getResidents().filter(hasJoined);
  const ids = new Set(joined.map((npc) => npc.id));
  if (knownJoined === null) {
    knownJoined = ids;
    return [];
  }
  const fresh = joined.filter((npc) => !knownJoined!.has(npc.id));
  knownJoined = ids;
  return fresh;
}
