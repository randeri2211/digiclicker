import type { ItemId, Stage } from './types';

// ============================================================
// DigiClicker tunable parameters - single source of truth. Every
// PLACEHOLDER balance number in the game reads from here; edit a value
// below to rebalance instead of hunting through combat/evolution files.
// Grouped roughly by how often you'd actually want to touch each group,
// most-relevant first.
// ============================================================

// ---- Team --------------------------------------------------------
/** Active/training slots available at game start (before any capacity
 * upgrades exist). */
export const STARTER_ACTIVE_CAPACITY = 6;
export const STARTER_ACTIVE_MAX_CAPACITY = 6;
export const STARTER_TRAINING_CAPACITY = 2;
export const STARTER_TRAINING_MAX_CAPACITY = 6;

// ---- Digivolution requirements & scope ----------------------------
/** Level a Digimon must reach before digivolving into a species at the
 * given target stage. A stage with no entry has no level requirement
 * (currently true for In-Training/Rookie targets). */
export const DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE: Partial<Record<Stage, number>> = {
  Rookie: 4,
  Champion: 16,
  Ultimate: 36,
  Mega: 56,
};

/** Stages actually playable right now. Every other stage (Fresh, Armor,
 * Hybrid, Ultra, Burst Mode, Unknown) stays fully present in the scraped
 * data (src/lib/data/digimon-evolution.json) but is excluded from
 * digivolve/de-digivolve option search - add a stage here to bring it
 * back into rotation, no data changes needed. */
export const IN_GAME_STAGES: ReadonlySet<Stage> = new Set<Stage>([
  'Fresh',
  'In-Training',
  'Rookie',
  'Champion',
  'Ultimate',
  'Mega',
]);

// ---- Combat: attack ticks ------------------------------------------
export const CLICK_DAMAGE = 8;
/** attacksPerSecond = BASE_ATTACKS_PER_SECOND + teamSpeedSum * SPEED_TO_APS_SCALE */
export const BASE_ATTACKS_PER_SECOND = 1;
export const SPEED_TO_APS_SCALE = 0.02;
/** How often the combat tick loop polls, in ms - not the attack rate
 * itself (that's attacksPerSecond above), just the granularity ticks get
 * checked/applied at. */
export const COMBAT_TICK_INTERVAL_MS = 250;

// ---- Combat: fight timer ---------------------------------------------
/** Every wild encounter has a time limit - timeLimitMs = (
 * FIGHT_TIMER_BASE_SECONDS + teamHpSum * FIGHT_TIMER_SECONDS_PER_HP) *
 * 1000 (see computeFightTimeLimitMs in combat/spawn.ts). If it runs out
 * before the wild is defeated, the encounter ends with no reward and a
 * fresh wild spawns - HP's one live mechanical effect. */
export const FIGHT_TIMER_BASE_SECONDS = 5;
export const FIGHT_TIMER_SECONDS_PER_HP = 0.05;

// ---- Combat: per-instance stat rolls --------------------------------
/** Relative power multiplier per stage, used when rolling baseStats/
 * growthPerLevel/digivolutionStats. */
export const STAGE_POWER: Record<Stage, number> = {
  Fresh: 0.2,
  'In-Training': 0.6,
  Rookie: 1,
  Champion: 2,
  Armor: 3,
  Ultimate: 4,
  Mega: 6,
  Ultra: 7,
  'Burst Mode': 7,
  Hybrid: 8,
  Unknown: 1,
};
/** A species' dominant stat (matching its statAffinity) rolls at this
 * multiplier; the other three stats roll at STAT_OFF_FACTOR. */
export const STAT_DOMINANT_FACTOR = 1.5;
export const STAT_OFF_FACTOR = 0.6;
/** Roll range as a fraction of the computed midpoint (e.g. 0.2 = +/-20%). */
export const STAT_RANGE_SPREAD_FRACTION = 0.1;

export const BASE_STAT_SCALE = 2;
export const GROWTH_PER_LEVEL_SCALE = 2;
export const DIGIVOLUTION_BONUS_SCALE = 4;
/** How much the Digimon's level right before a digivolve/de-digivolve
 * feeds into that transition's digivolutionStats bonus, on top of the
 * usual stage/type amount - scaled by the same dominant/off factor, so
 * an attack-type Digimon still gains more Attack than HP/Speed from
 * the level it's cashing in. */
export const LEVEL_IMPACT_SCALE = 0.1;

// ---- Level curve -----------------------------------------------------
/** xpToReachLevel(level) = LEVEL_CURVE_BASE_XP * (level - 1) ^ LEVEL_CURVE_EXPONENT */
export const LEVEL_CURVE_BASE_XP = 50;
export const LEVEL_CURVE_EXPONENT = 1.5;
/** Hard cap - levelForXp never returns above this, no matter how much xp
 * accumulates. Placeholder for now. */
export const MAX_LEVEL = 100;

// ---- Wild spawns & rewards --------------------------------------------
/** maxHp = WILD_HP_BASE * WILD_HP_STAGE_MULTIPLIER[stage] * WILD_HP_LEVEL_GROWTH_FACTOR^level
 * - exponential (compounding) in level rather than linear, so even a small
 * growth factor snowballs into huge HP at high levels. */
export const WILD_HP_BASE = 100;
export const WILD_HP_STAGE_MULTIPLIER: Record<Stage, number> = {
  Fresh: 0.5,
  'In-Training': 1,
  Rookie: 4,
  Champion: 15,
  Armor: 35,
  Ultimate: 50,
  Mega: 200,
  Ultra: 1000,
  'Burst Mode': 2000,
  Hybrid: 10000,
  Unknown: 1,
};
/** Per-level compounding growth rate - e.g. 1.08 = +8%/level, which still
 * balloons into a massive multiplier by level 50-100+. */
export const WILD_HP_LEVEL_GROWTH_FACTOR = 1.08;
export const KILL_XP_BASE = 20;
export const KILL_XP_PER_LEVEL = 5;
export const KILL_BITS_BASE = 10;
export const KILL_BITS_PER_LEVEL = 3;

// ---- Digi-Eggs -------------------------------------------------------
/** Chance per wild kill that it drops a Digi-Egg (see rollEggDrop in
 * src/lib/game/eggs/eggs.ts) - deliberately low, matches the "rare
 * random drop" design in GAMEPLAY_DESIGN.md's Digi-Eggs section. */
export const EGG_DROP_CHANCE_PERCENT = 0.1;
/** Level an egg must reach (gained the same way any team member gains
 * xp - it has to actually sit in an active/training slot) before it
 * hatches. Placeholder - low enough that hatching isn't a second full
 * grind on top of the rare drop itself. */
export const EGG_HATCH_LEVEL = 10;
/** Bits price for a Mystery Digi-Egg of any type, in the Shop (see
 * game/eggs/mysteryEggs.ts) - flat across all 11 EggTypes for now. */
export const MYSTERY_EGG_COST_BITS = 500;

// ---- Items -----------------------------------------------------------
/** De-digivolving requires spending this many of DEDIGIVOLVE_ITEM_ID
 * (replaces the old flat DEDIGIVOLVE_MIN_LEVEL gate - see
 * getDedigivolveOptions/dedigivolve in evolution/digivolve.ts) - makes
 * de-digivolving a deliberate spend instead of a free repeatable action. */
export const DEDIGIVOLVE_ITEM_ID: ItemId = 'dedigivolve-crystal';
export const DEDIGIVOLVE_ITEM_COUNT = 1;
/** Bits price for one De-Digivolution Crystal in the Shop (see
 * items/itemCatalog.ts). */
export const DEDIGIVOLVE_CRYSTAL_COST_BITS = 250;
/** Bits price for one Ability Reroll Crystal in the Shop (see
 * items/itemCatalog.ts, abilities/abilities.ts's useAbilityReroll). */
export const ABILITY_REROLL_COST_BITS = 400;

// ---- Persistence -------------------------------------------------------
export const AUTOSAVE_INTERVAL_MS = 15000;
