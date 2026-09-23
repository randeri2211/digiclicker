import type { AreaProgressState, Egg, ExpeditionDestination, ExpeditionHaul, ItemId, RosterEntry } from '../types';
import expeditionsData from '../../data/expeditions.json';
import { getSpecies } from '../images';
import { levelForXp } from '../combat/levelCurve';
import { isPathUnlocked } from '../areas/areaProgress';
import { rollEggOfType } from '../eggs/mysteryEggs';
import {
  EXPEDITION_LEVEL_SPEED_SCALE,
  EXPEDITION_ELEMENT_MATCH_BONUS,
  EXPEDITION_STAGE_BONUS,
} from '../constants';

// Expedition rules - pure functions of a destination and a party (no
// state), so the prep screen can preview exactly what starting would do.

export const DESTINATIONS = expeditionsData as unknown as Record<string, ExpeditionDestination>;

export function getDestination(id: string): ExpeditionDestination | undefined {
  return DESTINATIONS[id];
}

export function isDestinationUnlocked(progress: AreaProgressState, destination: ExpeditionDestination): boolean {
  return isPathUnlocked(progress, destination.areaId, destination.unlockPathId);
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}

/** Higher-level parties come back sooner. */
export function expeditionDurationMs(destination: ExpeditionDestination, party: RosterEntry[]): number {
  const avgLevel = average(party.map((entry) => levelForXp(entry.xp)));
  return (destination.durationMinutes * 60_000) / (1 + EXPEDITION_LEVEL_SPEED_SCALE * avgLevel);
}

/** Members of a favored element and later stages bring back more. */
export function expeditionHaulMultiplier(destination: ExpeditionDestination, party: RosterEntry[]): number {
  const matching = party.filter((entry) => {
    const element = getSpecies(entry.speciesId)?.element;
    return element !== undefined && destination.favoredElements.includes(element);
  }).length;
  const avgStageOrder = average(party.map((entry) => getSpecies(entry.speciesId)?.stageOrder ?? 0));
  return 1 + EXPEDITION_ELEMENT_MATCH_BONUS * matching + EXPEDITION_STAGE_BONUS * avgStageOrder;
}

function randomInt([min, max]: [number, number]): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** The loot, rolled once at claim time: Data scaled by the multiplier, at
 * most one egg and each item with chances scaled by it (capped at 100%). */
export function rollHaul(destination: ExpeditionDestination, multiplier: number): { haul: ExpeditionHaul; eggs: Egg[] } {
  const { loot } = destination;
  const data = Math.round(randomInt(loot.data) * multiplier);
  const eggs: Egg[] = [];
  if (loot.eggTypes.length && Math.random() * 100 < Math.min(100, loot.eggChancePercent * multiplier)) {
    const eggType = loot.eggTypes[Math.floor(Math.random() * loot.eggTypes.length)];
    eggs.push(rollEggOfType(eggType, false));
  }
  const items: { id: ItemId; count: number }[] = [];
  for (const item of loot.items) {
    if (Math.random() * 100 < Math.min(100, item.chancePercent * multiplier)) {
      items.push({ id: item.id, count: randomInt(item.count) });
    }
  }
  return { haul: { destinationId: destination.id, data, eggs: eggs.length, items }, eggs };
}
