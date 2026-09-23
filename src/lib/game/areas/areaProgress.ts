import type { AreaPath, AreaProgressState } from '../types';
import { AREAS, getArea, getPath, STARTING_AREA_ID } from './areaRegistry';

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
  // Create, then read back through `progress`: with $state, `(obj[k] = [])`
  // evaluates to the raw array, and pushing to that skips reactivity (the
  // unlock would only show after a reload).
  if (!progress.unlockedPaths[areaId]) progress.unlockedPaths[areaId] = [];
  const unlocked = progress.unlockedPaths[areaId];
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

/** Re-applies every unlock the player has already earned, from the
 * current area data: mastered paths' `unlocks` and beaten bosses'
 * `unlocks`. Run on load, so content added after the fact (e.g. a boss
 * that now opens a new area) reaches old saves - unlocks are stored as
 * results, and would otherwise only ever apply at the moment they're
 * earned. Only ever adds; idempotent. */
export function reapplyEarnedUnlocks(progress: AreaProgressState): void {
  for (const [areaId, area] of Object.entries(AREAS)) {
    for (const [pathId, path] of Object.entries(area.paths)) {
      if (killsOnPath(progress, areaId, pathId) >= path.mastery.kills) {
        for (const ref of path.unlocks) unlockPath(progress, areaId, ref);
      }
      if (path.boss && isBossDefeated(progress, areaId, pathId)) {
        for (const ref of path.boss.unlocks) unlockPath(progress, areaId, ref);
      }
    }
  }
}

/** The path has a boss and its mastery kill count has been reached. */
export function isBossAvailable(progress: AreaProgressState, areaId: string, pathId: string): boolean {
  const path = getPath(areaId, pathId);
  return Boolean(path?.boss) && killsOnPath(progress, areaId, pathId) >= (path?.mastery.kills ?? Infinity);
}

export function isBossDefeated(progress: AreaProgressState, areaId: string, pathId: string): boolean {
  return progress.bossesDefeated.includes(pathKey(areaId, pathId));
}

/** What a path's node on the region map shows, from least to most done. */
export type PathNodeState = 'locked' | 'open' | 'mastered' | 'boss-ready' | 'cleared';

// The map draws one state per path node (the active path gets a separate
// ring, so it isn't one of these). Inputs: isPathUnlocked, killsOnPath vs
// getPath(...).mastery.kills, and for a boss path isBossAvailable /
// isBossDefeated.
export function pathNodeState(progress: AreaProgressState, areaId: string, pathId: string): PathNodeState {
  // Most urgent first, PokeClicker-style: a waiting boss outranks the
  // (already reached) mastery, and a beaten boss is the final word.
  if (!isPathUnlocked(progress, areaId, pathId)) return 'locked';
  if (isBossDefeated(progress, areaId, pathId)) return 'cleared';
  if (isBossAvailable(progress, areaId, pathId)) return 'boss-ready';
  const mastery = getPath(areaId, pathId)?.mastery.kills ?? Infinity;
  return killsOnPath(progress, areaId, pathId) >= mastery ? 'mastered' : 'open';
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
