import type { AreaProgressState } from '../types';
import { initialAreaProgress, isPathUnlocked } from '../areas/areaProgress';
import { combat } from './combat.svelte';
import { getRegionOfArea } from '../areas/regionRegistry';
import { isSystemUnlocked } from '../village/village';

export const areaProgress: AreaProgressState = $state(initialAreaProgress());

// Travel to any unlocked path, in this area or another (the region map).
// No-ops on a locked path, and during a boss fight (retreat first). Also
// clears the current wild spawn so a still-in-flight off-path encounter
// can't linger after switching - the next tick immediately draws from the
// newly active path's pool.
export function travelTo(areaId: string, pathId: string): void {
  if (combat.boss) return;
  if (!isPathUnlocked(areaProgress, areaId, pathId)) return;
  // Crossing to another region (continent) needs Whamon.
  const crossing = getRegionOfArea(areaId) !== getRegionOfArea(areaProgress.activeAreaId);
  if (crossing && !isSystemUnlocked('continent-travel')) return;
  if (areaId === areaProgress.activeAreaId && pathId === areaProgress.activePathId) return;
  areaProgress.activeAreaId = areaId;
  areaProgress.activePathId = pathId;
  combat.wild = null;
}

export function setActivePath(pathId: string): void {
  travelTo(areaProgress.activeAreaId, pathId);
}
