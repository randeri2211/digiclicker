import type { Stage, WildSpawnState } from '../types';
import { WILD_SPAWN_POOL } from '../roster/starterRoster';
import { getSpecies, getSpeciesIdsByStage } from '../images';
import {
  WILD_HP_BASE,
  WILD_HP_STAGE_MULTIPLIER,
  WILD_HP_LEVEL_GROWTH_FACTOR,
  KILL_XP_BASE,
  KILL_XP_PER_LEVEL,
  KILL_BITS_BASE,
  KILL_BITS_PER_LEVEL,
  TAME_CHANCE_BASE_PERCENT,
  TAME_CHANCE_PER_LEVEL_DIFF_PERCENT,
  TAME_CHANCE_MIN_PERCENT,
  TAME_CHANCE_MAX_PERCENT,
} from '../constants';

let spawnIndex = 0;
let nextLevel = 1;

export function computeWildMaxHp(speciesId: string, level: number): number {
  const stage = getSpecies(speciesId)?.stage ?? 'Unknown';
  const stageMultiplier = WILD_HP_STAGE_MULTIPLIER[stage] ?? 1;
  const levelMultiplier = Math.pow(WILD_HP_LEVEL_GROWTH_FACTOR, level);
  return Math.round(WILD_HP_BASE * stageMultiplier * levelMultiplier);
}

function makeWildSpawn(now: number, speciesId: string, level: number): WildSpawnState {
  const maxHp = computeWildMaxHp(speciesId, level);
  return {
    speciesId,
    level,
    maxHp,
    currentHp: maxHp,
    lastTickAt: now,
    attackProgress: 0,
  };
}

export function pickNextWildSpawn(now: number): WildSpawnState {
  const speciesId = WILD_SPAWN_POOL[spawnIndex % WILD_SPAWN_POOL.length];
  spawnIndex += 1;
  const level = nextLevel;
  nextLevel += 1;

  return makeWildSpawn(now, speciesId, level);
}

// DEBUG: spawns a specific stage+level wild on demand, bypassing the
// normal WILD_SPAWN_POOL/nextLevel progression - for checking HP/damage
// scaling against any stage without grinding to it. See DebugSpawnPanel.
export function spawnDebugWild(now: number, stage: Stage, level: number): WildSpawnState | null {
  const candidates = getSpeciesIdsByStage(stage);
  if (candidates.length === 0) return null;
  const speciesId = candidates[Math.floor(Math.random() * candidates.length)];
  return makeWildSpawn(now, speciesId, level);
}

export function computeKillXp(wildLevel: number): number {
  return KILL_XP_BASE + wildLevel * KILL_XP_PER_LEVEL;
}

export function computeKillBits(wildLevel: number): number {
  return KILL_BITS_BASE + wildLevel * KILL_BITS_PER_LEVEL;
}

export function computeTameChancePercent(avgTeamLevel: number, wildLevel: number): number {
  const raw = TAME_CHANCE_BASE_PERCENT + (avgTeamLevel - wildLevel) * TAME_CHANCE_PER_LEVEL_DIFF_PERCENT;
  return Math.min(TAME_CHANCE_MAX_PERCENT, Math.max(TAME_CHANCE_MIN_PERCENT, Math.round(raw)));
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
