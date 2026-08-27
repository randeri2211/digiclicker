import type { WildSpawnState } from '../types';
import { WILD_SPAWN_POOL } from '../roster/starterRoster';

// PLACEHOLDER spawn/reward formulas - not final game balance.
let spawnIndex = 0;
let nextLevel = 1;

export function pickNextWildSpawn(now: number): WildSpawnState {
  const speciesId = WILD_SPAWN_POOL[spawnIndex % WILD_SPAWN_POOL.length];
  spawnIndex += 1;
  const level = nextLevel;
  nextLevel += 1;

  const maxHp = 40 + level * 15;
  return {
    speciesId,
    level,
    maxHp,
    currentHp: maxHp,
    lastTickAt: now,
    attackProgress: 0,
  };
}

export function computeKillXp(wildLevel: number): number {
  return 20 + wildLevel * 5;
}

export function computeKillBits(wildLevel: number): number {
  return 10 + wildLevel * 3;
}

export function computeTameChancePercent(avgTeamLevel: number, wildLevel: number): number {
  const raw = 15 + (avgTeamLevel - wildLevel) * 3;
  return Math.min(90, Math.max(5, Math.round(raw)));
}

export interface SpawnProgress {
  spawnIndex: number;
  nextLevel: number;
}

export function getSpawnProgress(): SpawnProgress {
  return { spawnIndex, nextLevel };
}

export function setSpawnProgress(progress: SpawnProgress): void {
  spawnIndex = progress.spawnIndex;
  nextLevel = progress.nextLevel;
}

export function resetSpawnProgress(): void {
  spawnIndex = 0;
  nextLevel = 1;
}
