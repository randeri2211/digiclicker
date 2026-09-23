import type { AreaPath, AreaProgressState } from '../types';
import { getArea, getPath, STARTING_AREA_ID } from './areaRegistry';

function killKey(areaId: string, pathId: string): string {
  return `${areaId}:${pathId}`;
}

export function initialAreaProgress(): AreaProgressState {
  const area = getArea(STARTING_AREA_ID);
  const startingPath = area?.startingPath ?? '';
  return {
    activeAreaId: STARTING_AREA_ID,
    activePathId: startingPath,
    unlockedPaths: { [STARTING_AREA_ID]: [startingPath] },
    killsByPath: {},
  };
}

export function isPathUnlocked(progress: AreaProgressState, areaId: string, pathId: string): boolean {
  return progress.unlockedPaths[areaId]?.includes(pathId) ?? false;
}

export function getActivePath(progress: AreaProgressState): AreaPath | undefined {
  return getPath(progress.activeAreaId, progress.activePathId);
}

// Called on every wild kill - increments the active path's kill count and,
// once its mastery threshold is crossed, unlocks every path it lists in
// `unlocks` (idempotent - already-unlocked ids aren't re-added). Mutates
// progress in place, matching how other state modules (currency, roster)
// mutate their $state objects directly rather than returning a new one.
export function recordActivePathKill(progress: AreaProgressState): void {
  const path = getActivePath(progress);
  if (!path) return;

  const key = killKey(progress.activeAreaId, progress.activePathId);
  const kills = (progress.killsByPath[key] ?? 0) + 1;
  progress.killsByPath[key] = kills;

  if (kills < path.mastery.kills) return;

  const unlocked = progress.unlockedPaths[progress.activeAreaId] ?? (progress.unlockedPaths[progress.activeAreaId] = []);
  for (const unlockedPathId of path.unlocks) {
    if (!unlocked.includes(unlockedPathId)) {
      unlocked.push(unlockedPathId);
    }
  }
}
