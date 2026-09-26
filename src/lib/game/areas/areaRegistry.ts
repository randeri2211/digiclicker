import forestSectorData from '../../data/areas/forest-sector.json';
import gearSavannaData from '../../data/areas/gear-savanna.json';
import mtMiharashiData from '../../data/areas/mt-miharashi.json';
import freezelandData from '../../data/areas/freezeland.json';
import factorialTownData from '../../data/areas/factorial-town.json';
import mistyLakeData from '../../data/areas/misty-lake.json';
import ancientRuinsData from '../../data/areas/ancient-ruins.json';
import infinityMountainData from '../../data/areas/infinity-mountain.json';
import type { AreaData, AreaPath } from '../types';

// New areas are added by importing their JSON above and registering them
// here - same explicit-registration style as PRELOAD_SPECIES_IDS elsewhere
// in this codebase, not auto-discovery.
export const AREAS: Record<string, AreaData> = {
  'forest-sector': forestSectorData as unknown as AreaData,
  'gear-savanna': gearSavannaData as unknown as AreaData,
  'mt-miharashi': mtMiharashiData as unknown as AreaData,
  'freezeland': freezelandData as unknown as AreaData,
  'factorial-town': factorialTownData as unknown as AreaData,
  'misty-lake': mistyLakeData as unknown as AreaData,
  'ancient-ruins': ancientRuinsData as unknown as AreaData,
  'infinity-mountain': infinityMountainData as unknown as AreaData,
};

export const STARTING_AREA_ID = 'forest-sector';

export function getArea(areaId: string): AreaData | undefined {
  return AREAS[areaId];
}

export function getPath(areaId: string, pathId: string): AreaPath | undefined {
  return getArea(areaId)?.paths[pathId];
}

/** The area's and the path's wild HP multipliers combined (1 if unset). */
export function wildHpMultiplier(areaId: string, pathId: string): number {
  return (getArea(areaId)?.wildHpMultiplier ?? 1) * (getPath(areaId, pathId)?.wildHpMultiplier ?? 1);
}

// Every species referenced across every area's spawn pools - used to
// preload sprites before showing the game (see PRELOAD_SPECIES_IDS in
// starterRoster.ts), same rationale as the old WILD_SPAWN_POOL it replaces.
export function getAllAreaSpeciesIds(): string[] {
  const ids = new Set<string>();
  for (const area of Object.values(AREAS)) {
    for (const path of Object.values(area.paths)) {
      for (const entry of path.digimonPool) {
        ids.add(entry.id);
      }
    }
  }
  return [...ids];
}
