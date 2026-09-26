import type { Stage } from './types';
import balance from './balance.json';
import type { FightTimerFormula } from './combat/fightTimer';
import type { CurveFormula } from './combat/levelCurveFormulas';

// ============================================================
// DigiClicker tunable parameters. The VALUES live in balance.json - edit
// them there, or live with charts in the Balance Lab (npm run dev, then
// open /balance.html), which saves straight back to that file. This file
// keeps the names, types and the explanation of what each number does;
// every other module imports from here, never from the JSON directly.
// Grouped roughly by how often you'd actually want to touch each group,
// most-relevant first.
// ============================================================

// ---- Hatchery -----------------------------------------------------
/** Incubating slots available at game start - only incubating eggs gain
 * kill XP toward hatching; the rest wait in storage (see
 * state/hatchery.svelte.ts). */
export const HATCHERY_STARTING_CAPACITY = balance.HATCHERY_STARTING_CAPACITY;
export const HATCHERY_MAX_CAPACITY = balance.HATCHERY_MAX_CAPACITY;
/** Bits for an extra incubation slot (Elecmon's hatchery upgrades): the
 * first bought slot costs the base, each next one x GROWTH. */
export const HATCHERY_SLOT_BASE_COST = balance.HATCHERY_SLOT_BASE_COST;
export const HATCHERY_SLOT_COST_GROWTH = balance.HATCHERY_SLOT_COST_GROWTH;

// ---- Offline progress ------------------------------------------------
/** Most time away that counts - the game closed, or a background tab the
 * browser throttled. Wild fights are fast-forwarded kill by kill with the
 * normal rewards (state/combat.svelte.ts fastForwardWildCombat). */
export const OFFLINE_PROGRESS_CAP_HOURS = balance.OFFLINE_PROGRESS_CAP_HOURS;
/** Fraction of the (capped) time away that's actually fought - 1 = the
 * same pace as playing. */
export const OFFLINE_PROGRESS_EFFICIENCY = balance.OFFLINE_PROGRESS_EFFICIENCY;

// ---- Crests ------------------------------------------------------------
/** 1 = Ultimate needs its egg family's Crest and Mega the awakened Crest
 * (evolution/crests.ts); 0 = off. A number, not a boolean, so the Balance
 * Lab can toggle it like any other value. */
export const CREST_GATING_ENABLED = balance.CREST_GATING_ENABLED === 1;

// ---- Kill XP sharing ---------------------------------------------------
/** Each fighting Digimon gets killXp / fighters^EXPONENT (combat/xp.ts):
 * 0 = everyone gets the full amount (a bigger roster multiplies total XP),
 * 0.5 = divided by the square root of the roster size, 1 = split evenly. */
export const KILL_XP_SPLIT_EXPONENT = balance.KILL_XP_SPLIT_EXPONENT;
/** Diminishing returns on the roster's summed stats in wild fights
 * (combat/rosterFalloff.ts): strongest first, the i-th counts FALLOFF^i -
 * the total tends to 1 / (1 - FALLOFF) members' worth. 1 = plain sum. */
export const ROSTER_STAT_FALLOFF = balance.ROSTER_STAT_FALLOFF;
/** Kill XP shrinks for a Digimon above the wild's level (combat/xp.ts
 * overlevelXpFactor): full XP up to GRACE levels above, then
 * -PENALTY_PER_LEVEL per extra level, never below MIN_FACTOR. Keeps
 * levels near each area's range instead of grinding to the cap. */
export const XP_OVERLEVEL_GRACE = balance.XP_OVERLEVEL_GRACE;
export const XP_OVERLEVEL_PENALTY_PER_LEVEL = balance.XP_OVERLEVEL_PENALTY_PER_LEVEL;
export const XP_OVERLEVEL_MIN_FACTOR = balance.XP_OVERLEVEL_MIN_FACTOR;

// ---- Partners -----------------------------------------------------------
/** Partner slots at the start; residents with `partnerSlots` add more
 * (state/partners.svelte.ts). */
export const PARTNER_BASE_SLOTS = balance.PARTNER_BASE_SLOTS;
/** Extra levels a partner can be above the wild before its XP shrinks -
 * a slightly higher effective cap than the rest of the roster. */
export const PARTNER_EXTRA_GRACE = balance.PARTNER_EXTRA_GRACE;
/** Extra share of kill XP for a partner (0.25 = +25%). */
export const PARTNER_XP_BONUS = balance.PARTNER_XP_BONUS;

// ---- Digivolution requirements & scope ----------------------------
/** Level the source must reach before digivolving into a species at the
 * given target stage. A stage with no entry has no level requirement
 * (currently true for In-Training/Rookie targets). */
export const DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE: Partial<Record<Stage, number>> = balance.DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE as Partial<Record<Stage, number>>;

/** Stages actually playable right now. Every other stage (Armor,
 * Hybrid, Ultra, Burst Mode, Unknown) stays fully present in the scraped
 * data (src/lib/data/digimon-evolution.json) but is excluded from
 * digivolve option search - add a stage here to bring it
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
/** clickDamage = CLICK_DAMAGE_BASE + rosterDps * CLICK_DAMAGE_DPS_FRACTION -
 * the flat base keeps early clicks meaningful while DPS is still tiny; the
 * DPS share keeps clicking relevant as the roster grows (e.g. 0.1 at ~8
 * clicks/sec adds ~80% on top of idle damage at any point in the game). */
export const CLICK_DAMAGE_BASE = balance.CLICK_DAMAGE_BASE;
export const CLICK_DAMAGE_DPS_FRACTION = balance.CLICK_DAMAGE_DPS_FRACTION;
/** attacksPerSecond = BASE_ATTACKS_PER_SECOND + rosterSpeedSum * SPEED_TO_APS_SCALE */
export const BASE_ATTACKS_PER_SECOND = balance.BASE_ATTACKS_PER_SECOND;
export const SPEED_TO_APS_SCALE = balance.SPEED_TO_APS_SCALE;
/** Boss-fight matchups (see combat/advantage.ts): each edge a squad member
 * wins against the boss - attribute (Vaccine > Virus > Data > Vaccine) and
 * element (data/elementChart.json) - adds ADVANTAGE_BONUS to its stat
 * multiplier; each edge it loses subtracts DISADVANTAGE_PENALTY. Edges add
 * up: with 0.5 / 0.25 that's 2.0x at best, 0.5x at worst. Boss fights
 * only - normal wild fights ignore matchups. */
export const ADVANTAGE_BONUS = balance.ADVANTAGE_BONUS;
export const DISADVANTAGE_PENALTY = balance.DISADVANTAGE_PENALTY;
/** Each boss chip (Attack Chip, Speed Chip, HP Disk - found on
 * expeditions) spent on a boss fight adds this fraction to its stat for
 * the whole squad, for that one fight. */
export const BOSS_CHIP_BONUS = balance.BOSS_CHIP_BONUS;
/** How often the combat tick loop polls, in ms - not the attack rate
 * itself (that's attacksPerSecond above), just the granularity ticks get
 * checked/applied at. */
export const COMBAT_TICK_INTERVAL_MS = 250;

// ---- Combat: fight timer ---------------------------------------------
/** Boss fights only - normal wild fights are untimed. A boss fight's time
 * limit is FIGHT_TIMER_BASE_SECONDS plus a bonus of up to
 * FIGHT_TIMER_MAX_BONUS_SECONDS funded by the SQUAD's summed HP (after
 * matchup multipliers), shaped by FIGHT_TIMER_FORMULA (see
 * combat/fightTimer.ts - 'halfLife', 'parabola' or 'power'). Running out
 * is a loss with no rewards. This is HP's one live mechanical effect. */
export const FIGHT_TIMER_FORMULA = balance.FIGHT_TIMER_FORMULA as FightTimerFormula;
export const FIGHT_TIMER_BASE_SECONDS = balance.FIGHT_TIMER_BASE_SECONDS;
/** The ceiling of the bonus - fights top out at base + this. */
export const FIGHT_TIMER_MAX_BONUS_SECONDS = balance.FIGHT_TIMER_MAX_BONUS_SECONDS;
/** 'halfLife' only: squad HP at which half the max bonus is reached;
 * every further multiple of it halves the remaining gap to the ceiling. */
export const FIGHT_TIMER_HALF_BONUS_HP = balance.FIGHT_TIMER_HALF_BONUS_HP;
/** 'parabola' / 'power' only: squad HP at which the full max bonus is
 * reached - the timer stays at the ceiling beyond it. */
export const FIGHT_TIMER_FULL_BONUS_HP = balance.FIGHT_TIMER_FULL_BONUS_HP;
/** 'power' only: curve exponent (0.5 = square root, 1 = straight line). */
export const FIGHT_TIMER_POWER_EXPONENT = balance.FIGHT_TIMER_POWER_EXPONENT;

// ---- Combat: per-instance stat rolls --------------------------------
/** Relative power multiplier per stage, used when rolling baseStats/
 * growthPerLevel/inheritedBonus. */
export const STAGE_POWER: Record<Stage, number> = balance.STAGE_POWER as Record<Stage, number>;
/** A species' dominant stat (matching its statAffinity) rolls at this
 * multiplier; the other three stats roll at STAT_OFF_FACTOR. */
export const STAT_DOMINANT_FACTOR = balance.STAT_DOMINANT_FACTOR;
export const STAT_OFF_FACTOR = balance.STAT_OFF_FACTOR;
/** Roll range as a fraction of the computed midpoint (e.g. 0.2 = +/-20%). */
export const STAT_RANGE_SPREAD_FRACTION = balance.STAT_RANGE_SPREAD_FRACTION;

export const BASE_STAT_SCALE = balance.BASE_STAT_SCALE;
export const GROWTH_PER_LEVEL_SCALE = balance.GROWTH_PER_LEVEL_SCALE;
/** Stage/affinity-driven part of a digivolved entry's one-time
 * inheritedBonus (see rollInheritedBonus in combat/stats.ts). */
export const INHERITED_BONUS_SCALE = balance.INHERITED_BONUS_SCALE;
/** How much the source's level right before digivolving feeds into the
 * new entry's inheritedBonus, on top of INHERITED_BONUS_SCALE's amount -
 * scaled by the same dominant/off factor, so an attack-type Digimon still
 * gains more Attack than HP/Speed from the levels it's cashing in. */
export const INHERITED_BONUS_LEVEL_SCALE = balance.INHERITED_BONUS_LEVEL_SCALE;

// ---- Leveling ------------------------------------------------------
// Two independent curves over a level L, each shaped by its own formula -
// 'power' (FIRST * L ^ EXPONENT), 'exponential' (FIRST * GROWTH ^ (L - 1))
// or 'parabola' (FIRST to LAST along progress^2); see
// combat/levelCurveFormulas.ts. Only the settings the chosen formula uses
// matter. Kills per level-up are NOT a setting: fighting same-level wilds,
// the level-up from L takes XP cost / kill XP at L.

/** XP each level-up costs. */
export const LEVEL_XP_FORMULA = balance.LEVEL_XP_FORMULA as CurveFormula;
export const LEVEL_XP_FIRST = balance.LEVEL_XP_FIRST;
export const LEVEL_XP_LAST = balance.LEVEL_XP_LAST;
export const LEVEL_XP_EXPONENT = balance.LEVEL_XP_EXPONENT;
export const LEVEL_XP_GROWTH = balance.LEVEL_XP_GROWTH;

/** XP for defeating a wild, by the wild's level (see computeKillXp in
 * combat/spawn.ts). */
export const KILL_XP_FORMULA = balance.KILL_XP_FORMULA as CurveFormula;
export const KILL_XP_FIRST = balance.KILL_XP_FIRST;
export const KILL_XP_LAST = balance.KILL_XP_LAST;
export const KILL_XP_EXPONENT = balance.KILL_XP_EXPONENT;
export const KILL_XP_GROWTH = balance.KILL_XP_GROWTH;

/** Hard cap - levelForXp never returns above this, no matter how much xp
 * accumulates. Placeholder for now. */
export const MAX_LEVEL = balance.MAX_LEVEL;

// ---- Wild spawns & rewards --------------------------------------------
/** maxHp = WILD_HP_BASE * WILD_HP_STAGE_MULTIPLIER[stage] * WILD_HP_LEVEL_GROWTH_FACTOR^level
 * - exponential (compounding) in level rather than linear, so even a small
 * growth factor snowballs into huge HP at high levels. */
export const WILD_HP_BASE = balance.WILD_HP_BASE;
export const WILD_HP_STAGE_MULTIPLIER: Record<Stage, number> = balance.WILD_HP_STAGE_MULTIPLIER as Record<Stage, number>;
/** Per-level compounding growth rate - e.g. 1.08 = +8%/level, which still
 * balloons into a massive multiplier by level 50-100+. */
export const WILD_HP_LEVEL_GROWTH_FACTOR = balance.WILD_HP_LEVEL_GROWTH_FACTOR;
export const KILL_BITS_BASE = balance.KILL_BITS_BASE;
export const KILL_BITS_PER_LEVEL = balance.KILL_BITS_PER_LEVEL;

// ---- Digi-Eggs -------------------------------------------------------
/** Chance per wild kill that it drops a Digi-Egg (see rollEggDrop in
 * src/lib/game/eggs/eggs.ts) - deliberately low, matches the "rare
 * random drop" design in GAMEPLAY_DESIGN.md's Digi-Eggs section. */
export const EGG_DROP_CHANCE_PERCENT = balance.EGG_DROP_CHANCE_PERCENT;
/** Level an egg must reach (gained from kills while it sits in an
 * incubating hatchery slot) before it hatches. Placeholder - low enough that hatching isn't a second full
 * grind on top of the rare drop itself. */
export const EGG_HATCH_LEVEL = balance.EGG_HATCH_LEVEL;
/** Data paid to hatch an egg that has reached EGG_HATCH_LEVEL - a ready
 * egg waits in its incubation slot (earning no more XP) until paid for. */
export const HATCH_DATA_COST = balance.HATCH_DATA_COST;
/** Bits price for a Mystery Digi-Egg of any type, in the Shop (see
 * game/eggs/mysteryEggs.ts) - flat across all 11 EggTypes for now. */
export const MYSTERY_EGG_COST_BITS = balance.MYSTERY_EGG_COST_BITS;
/** XP granted to the already-owned roster entry when an egg hatches into
 * a species the player already has (the roster holds one per species, so
 * a duplicate becomes a bonus instead of a second copy). */
export const DUPLICATE_HATCH_XP = balance.DUPLICATE_HATCH_XP;

// ---- Items -----------------------------------------------------------
/** Bits price for one Ability Reroll Crystal in the Shop (see
 * items/itemCatalog.ts, abilities/abilities.ts's useAbilityReroll). */
export const ABILITY_REROLL_COST_BITS = balance.ABILITY_REROLL_COST_BITS;

// ---- Expeditions -------------------------------------------------------
// A party of roster Digimon is sent to a destination (data/expeditions.json)
// and comes back after a while with Data, sometimes an egg, and items.
// Party members don't fight while away. See game/expeditions/.
/** Expeditions that can run at the same time. */
export const EXPEDITION_MAX_CONCURRENT = balance.EXPEDITION_MAX_CONCURRENT;
/** Most Digimon in one party. */
export const EXPEDITION_MAX_PARTY = balance.EXPEDITION_MAX_PARTY;
/** duration = base / (1 + LEVEL_SPEED_SCALE * party's average level). */
export const EXPEDITION_LEVEL_SPEED_SCALE = balance.EXPEDITION_LEVEL_SPEED_SCALE;
/** haul x (1 + ELEMENT_MATCH_BONUS * members of a favored element
 *  + STAGE_BONUS * party's average stage order (Fresh 0 .. Mega 5)). */
export const EXPEDITION_ELEMENT_MATCH_BONUS = balance.EXPEDITION_ELEMENT_MATCH_BONUS;
export const EXPEDITION_STAGE_BONUS = balance.EXPEDITION_STAGE_BONUS;

// ---- Persistence -------------------------------------------------------
export const AUTOSAVE_INTERVAL_MS = 15000;
