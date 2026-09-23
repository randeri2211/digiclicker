import type { AreaPath, Stage, WildSpawnState } from '../types';
import { getSpecies, getSpeciesIdsByStage } from '../images';
import { weightedPick } from '../util/random';
import {
  WILD_HP_BASE,
  WILD_HP_STAGE_MULTIPLIER,
  WILD_HP_LEVEL_GROWTH_FACTOR,
  KILL_XP_BASE,
  KILL_XP_PER_LEVEL,
  KILL_BITS_BASE,
  KILL_BITS_PER_LEVEL,
  FIGHT_TIMER_BASE_SECONDS,
  FIGHT_TIMER_SECONDS_PER_HP,
} from '../constants';

export function computeWildMaxHp(speciesId: string, level: number): number {
  const stage = getSpecies(speciesId)?.stage ?? 'Unknown';
  const stageMultiplier = WILD_HP_STAGE_MULTIPLIER[stage] ?? 1;
  const levelMultiplier = Math.pow(WILD_HP_LEVEL_GROWTH_FACTOR, level);
  return Math.round(WILD_HP_BASE * stageMultiplier * levelMultiplier);
}

// The active team's summed HP stat (see computeTeamHp in combat/damage.ts)
// funds how long a fight lasts - a flat per-point bonus on top of a base
// duration, fixed once at spawn time.
export function computeFightTimeLimitMs(teamHp: number): number {
  return (FIGHT_TIMER_BASE_SECONDS + teamHp * FIGHT_TIMER_SECONDS_PER_HP) * 1000;
}

function makeWildSpawn(now: number, speciesId: string, level: number, teamHp: number): WildSpawnState {
  const maxHp = computeWildMaxHp(speciesId, level);
  return {
    speciesId,
    level,
    maxHp,
    currentHp: maxHp,
    lastTickAt: now,
    attackProgress: 0,
    spawnedAt: now,
    timeLimitMs: computeFightTimeLimitMs(teamHp),
  };
}

// Weighted-random species pick within the active path's pool, then a
// uniform level roll in whichever range applies - the entry's own
// levelRange if it set one (e.g. a weaker regional variant capped lower
// than the rest of the path), else the path's overall levelRange.
export function pickNextWildSpawn(now: number, path: AreaPath, teamHp: number): WildSpawnState {
  const chosen = weightedPick(path.digimonPool, (entry) => entry.weight);
  const [min, max] = chosen.levelRange ?? path.levelRange;
  const level = min + Math.floor(Math.random() * (max - min + 1));

  return makeWildSpawn(now, chosen.id, level, teamHp);
}

// DEBUG: spawns a specific stage+level wild on demand, bypassing the
// normal area/path spawn pool - for checking HP/damage scaling against
// any stage without grinding to it. See DebugSpawnPanel.
export function spawnDebugWild(now: number, stage: Stage, level: number, teamHp: number): WildSpawnState | null {
  const candidates = getSpeciesIdsByStage(stage);
  if (candidates.length === 0) return null;
  const speciesId = candidates[Math.floor(Math.random() * candidates.length)];
  return makeWildSpawn(now, speciesId, level, teamHp);
}

export function computeKillXp(wildLevel: number): number {
  return KILL_XP_BASE + wildLevel * KILL_XP_PER_LEVEL;
}

export function computeKillBits(wildLevel: number): number {
  return KILL_BITS_BASE + wildLevel * KILL_BITS_PER_LEVEL;
}
