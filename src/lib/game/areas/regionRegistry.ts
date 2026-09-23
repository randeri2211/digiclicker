import regionsData from '../../data/regions.json';
import type { AreaProgressState, RegionData, RegionMapArea } from '../types';
import { getArea, STARTING_AREA_ID } from './areaRegistry';

export const REGIONS: RegionData[] = regionsData.regions as unknown as RegionData[];
export const MAP_SIZE = regionsData.mapSize as [number, number];

export function getRegion(regionId: string): RegionData | undefined {
  return REGIONS.find((region) => region.id === regionId);
}

/** The region whose map lists `areaId` (every built area is on exactly one
 * map - validate_areas.py checks it). */
export function getRegionOfArea(areaId: string): RegionData | undefined {
  return REGIONS.find((region) => region.areas.some((area) => area.id === areaId));
}

export const STARTING_REGION_ID = getRegionOfArea(STARTING_AREA_ID)?.id ?? REGIONS[0].id;

/** The area has a data/areas file - otherwise it's a story placeholder. */
export function isAreaBuilt(areaId: string): boolean {
  return getArea(areaId) !== undefined;
}

/** Any of the area's paths is unlocked - how travel into an area opens. */
export function isAreaUnlocked(progress: AreaProgressState, areaId: string): boolean {
  return isAreaBuilt(areaId) && (progress.unlockedPaths[areaId]?.length ?? 0) > 0;
}

export function isRegionUnlocked(progress: AreaProgressState, region: RegionData): boolean {
  return region.areas.some((area: RegionMapArea) => isAreaUnlocked(progress, area.id));
}
