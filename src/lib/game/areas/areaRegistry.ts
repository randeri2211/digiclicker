import forestSectorData from '../../data/areas/forest-sector.json';
import type { AreaData, AreaPath } from '../types';

// New areas are added by importing their JSON above and registering them
// here - same explicit-registration style as PRELOAD_SPECIES_IDS elsewhere
// in this codebase, not auto-discovery.
export const AREAS: Record<string, AreaData> = {
  'forest-sector': forestSectorData as unknown as AreaData,
};

export const STARTING_AREA_ID = 'forest-sector';

export function getArea(areaId: string): AreaData | undefined {
  return AREAS[areaId];
}

export function getPath(areaId: string, pathId: string): AreaPath | undefined {
  return getArea(areaId)?.paths[pathId];
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
