import type { AreaPath, Stage, WildSpawnState } from '../types';
import { getSpecies, getSpeciesIdsByStage } from '../images';
import { weightedPick } from '../util/random';
import {
  WILD_HP_BASE,
  WILD_HP_STAGE_MULTIPLIER,
  WILD_HP_LEVEL_GROWTH_FACTOR,
  MAX_LEVEL,
  KILL_BITS_BASE,
  KILL_BITS_PER_LEVEL,
  FIGHT_TIMER_FORMULA,
  FIGHT_TIMER_BASE_SECONDS,
  FIGHT_TIMER_MAX_BONUS_SECONDS,
  FIGHT_TIMER_HALF_BONUS_HP,
  FIGHT_TIMER_FULL_BONUS_HP,
  FIGHT_TIMER_POWER_EXPONENT,
} from '../constants';
import { fightTimerSeconds } from './fightTimer';
import { curveValue } from './levelCurveFormulas';
import { KILL_XP_CURVE } from './levelCurveParams';

export function computeWildMaxHp(speciesId: string, level: number): number {
  const stage = getSpecies(speciesId)?.stage ?? 'Unknown';
  const stageMultiplier = WILD_HP_STAGE_MULTIPLIER[stage] ?? 1;
  const levelMultiplier = Math.pow(WILD_HP_LEVEL_GROWTH_FACTOR, level);
  return Math.round(WILD_HP_BASE * stageMultiplier * levelMultiplier);
}

// The roster's summed HP stat (see computeRosterHp in combat/damage.ts)
// funds how long a fight lasts, through whichever capped curve
// FIGHT_TIMER_FORMULA picks (see combat/fightTimer.ts). Fixed once at
// spawn time.
export function computeFightTimeLimitMs(rosterHp: number): number {
  const seconds = fightTimerSeconds(
    {
      formula: FIGHT_TIMER_FORMULA,
      baseSeconds: FIGHT_TIMER_BASE_SECONDS,
      maxBonusSeconds: FIGHT_TIMER_MAX_BONUS_SECONDS,
      halfBonusHp: FIGHT_TIMER_HALF_BONUS_HP,
      fullBonusHp: FIGHT_TIMER_FULL_BONUS_HP,
      powerExponent: FIGHT_TIMER_POWER_EXPONENT,
    },
    rosterHp
  );
  return seconds * 1000;
}

function makeWildSpawn(now: number, speciesId: string, level: number, rosterHp: number): WildSpawnState {
  const maxHp = computeWildMaxHp(speciesId, level);
  return {
    speciesId,
    level,
    maxHp,
    currentHp: maxHp,
    lastTickAt: now,
    attackProgress: 0,
    spawnedAt: now,
    timeLimitMs: computeFightTimeLimitMs(rosterHp),
  };
}

// Weighted-random species pick within the active path's pool, then a
// uniform level roll in whichever range applies - the entry's own
// levelRange if it set one (e.g. a weaker regional variant capped lower
// than the rest of the path), else the path's overall levelRange.
export function pickNextWildSpawn(now: number, path: AreaPath, rosterHp: number): WildSpawnState {
  const chosen = weightedPick(path.digimonPool, (entry) => entry.weight);
  const [min, max] = chosen.levelRange ?? path.levelRange;
  const level = min + Math.floor(Math.random() * (max - min + 1));

  return makeWildSpawn(now, chosen.id, level, rosterHp);
}

// DEBUG: spawns a specific stage+level wild on demand, bypassing the
// normal area/path spawn pool - for checking HP/damage scaling against
// any stage without grinding to it. See DebugSpawnPanel.
export function spawnDebugWild(now: number, stage: Stage, level: number, rosterHp: number): WildSpawnState | null {
  const candidates = getSpeciesIdsByStage(stage);
  if (candidates.length === 0) return null;
  const speciesId = candidates[Math.floor(Math.random() * candidates.length)];
  return makeWildSpawn(now, speciesId, level, rosterHp);
}

// XP for defeating a wild of this level, from the kill XP curve in
// constants.ts (never negative, even for a misconfigured curve).
export function computeKillXp(wildLevel: number): number {
  return Math.max(0, curveValue(KILL_XP_CURVE, Math.max(1, wildLevel), MAX_LEVEL));
}

export function computeKillBits(wildLevel: number): number {
  return KILL_BITS_BASE + wildLevel * KILL_BITS_PER_LEVEL;
}
