import type { AreaPath, AreaProgressState } from '../types';
import { getArea, getPath, STARTING_AREA_ID } from './areaRegistry';

export function pathKey(areaId: string, pathId: string): string {
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
    bossesDefeated: [],
  };
}

export function isPathUnlocked(progress: AreaProgressState, areaId: string, pathId: string): boolean {
  return progress.unlockedPaths[areaId]?.includes(pathId) ?? false;
}

export function getActivePath(progress: AreaProgressState): AreaPath | undefined {
  return getPath(progress.activeAreaId, progress.activePathId);
}

export function killsOnPath(progress: AreaProgressState, areaId: string, pathId: string): number {
  return progress.killsByPath[pathKey(areaId, pathId)] ?? 0;
}

// Unlocks `ref` - a path id in `fromAreaId`, or "areaId:pathId" for a path
// in another area (how a boss opens the next region). Idempotent.
function unlockPath(progress: AreaProgressState, fromAreaId: string, ref: string): void {
  const [areaId, pathId] = ref.includes(':') ? ref.split(':', 2) : [fromAreaId, ref];
  const unlocked = progress.unlockedPaths[areaId] ?? (progress.unlockedPaths[areaId] = []);
  if (!unlocked.includes(pathId)) unlocked.push(pathId);
}

// Called on every wild kill - increments the active path's kill count and,
// once its mastery threshold is crossed, unlocks every path it lists in
// `unlocks` (idempotent - already-unlocked ids aren't re-added). A path
// with a boss unlocks the boss the same way (see isBossAvailable). Mutates
// progress in place, matching how other state modules (currency, roster)
// mutate their $state objects directly rather than returning a new one.
export function recordActivePathKill(progress: AreaProgressState): void {
  const path = getActivePath(progress);
  if (!path) return;

  const key = pathKey(progress.activeAreaId, progress.activePathId);
  const kills = (progress.killsByPath[key] ?? 0) + 1;
  progress.killsByPath[key] = kills;

  if (kills < path.mastery.kills) return;
  for (const ref of path.unlocks) unlockPath(progress, progress.activeAreaId, ref);
}

/** The path has a boss and its mastery kill count has been reached. */
export function isBossAvailable(progress: AreaProgressState, areaId: string, pathId: string): boolean {
  const path = getPath(areaId, pathId);
  return Boolean(path?.boss) && killsOnPath(progress, areaId, pathId) >= (path?.mastery.kills ?? Infinity);
}

export function isBossDefeated(progress: AreaProgressState, areaId: string, pathId: string): boolean {
  return progress.bossesDefeated.includes(pathKey(areaId, pathId));
}

/** Records a boss win and applies its unlocks. True on the first clear. */
export function recordBossVictory(progress: AreaProgressState, areaId: string, pathId: string): boolean {
  const boss = getPath(areaId, pathId)?.boss;
  if (!boss) return false;
  for (const ref of boss.unlocks) unlockPath(progress, areaId, ref);
  if (isBossDefeated(progress, areaId, pathId)) return false;
  progress.bossesDefeated.push(pathKey(areaId, pathId));
  return true;
}
