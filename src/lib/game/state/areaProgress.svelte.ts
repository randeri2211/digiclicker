import type { AreaProgressState } from '../types';
import { initialAreaProgress, isPathUnlocked } from '../areas/areaProgress';
import { combat } from './combat.svelte';

export const areaProgress: AreaProgressState = $state(initialAreaProgress());

// No-ops on a locked path, and during a boss fight (retreat first). Also
// clears the current wild spawn so a still-in-flight off-path encounter
// can't linger after switching - the next tick immediately draws from the
// newly active path's pool.
export function setActivePath(pathId: string): void {
  if (combat.boss) return;
  if (!isPathUnlocked(areaProgress, areaProgress.activeAreaId, pathId)) return;
  areaProgress.activePathId = pathId;
  combat.wild = null;
}
