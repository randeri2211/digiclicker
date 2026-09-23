export type Stage =
  | 'Fresh'
  | 'In-Training'
  | 'Rookie'
  | 'Armor'
  | 'Champion'
  | 'Hybrid'
  | 'Ultimate'
  | 'Mega'
  | 'Ultra'
  | 'Burst Mode'
  | 'Unknown';

export type StatAffinity = 'Attack' | 'HP' | 'Speed' | 'SpecialAttack';

/** The 11 Digi-Egg flavor types (see egg_type_mapping.py) - a species'
 * eggType is independent of its statAffinity, resolved from the same raw
 * wiki taxonomy but grouped by thematic flavor instead of combat archetype. */
export type EggType =
  | 'Dragon'
  | 'Beast'
  | 'Dinosaur'
  | 'Bird'
  | 'Aquatic'
  | 'Insect'
  | 'Plant'
  | 'Machine'
  | 'Mineral'
  | 'Evil'
  | 'Holy';

/** A plain string union - adding a new item is a new member here plus a
 * matching ITEM_CATALOG entry (see src/lib/game/items/itemCatalog.ts). */
export type ItemId = 'ability-reroll-crystal';

export interface ItemDefinition {
  id: ItemId;
  name: string;
  description: string;
  costBits: number;
}

/** Always has an entry for every ItemId (see inventory.svelte.ts's
 * initialization) - lookups never need a `?? 0` fallback. */
export type InventoryState = Record<ItemId, number>;

/** 4 stats x 3 rarity tiers - a plain string union so adding a new
 * ability is a new member here plus a matching ABILITY_CATALOG entry
 * (see src/lib/game/abilities/abilityCatalog.ts). */
export type AbilityId =
  | 'attack-minor'
  | 'attack-major'
  | 'attack-superior'
  | 'hp-minor'
  | 'hp-major'
  | 'hp-superior'
  | 'speed-minor'
  | 'speed-major'
  | 'speed-superior'
  | 'special-attack-minor'
  | 'special-attack-major'
  | 'special-attack-superior';

export interface AbilityDefinition {
  id: AbilityId;
  name: string;
  description: string;
  statKey: keyof StatBlock;
  /** e.g. 10 = +10% to statKey. */
  percent: number;
  /** Rarity weight for rerollAbility's weighted pick - higher rolls more
   * often, same convention as AreaSpawnEntry/mystery-egg pool weights. */
  weight: number;
}

export interface StatBlock {
  attack: number;
  /** Funds the per-encounter fight timer (see combat/spawn.ts's
   * computeFightTimeLimitMs) - the last stat to gain a live mechanical
   * effect, formerly called Defense. */
  hp: number;
  speed: number;
  specialAttack: number;
}

/** Same shape as StatBlock, but each stat is a [min, max] range rather than
 * a rolled value - used to preview a roll without actually rolling it. */
export type StatRangeBlock = Record<keyof StatBlock, [number, number]>;

export interface DigimonSpecies {
  id: string;
  name: string;
  stage: Stage;
  stageOrder: number;
  /** Dominant combat archetype, resolved from real wiki taxonomy data (see
   * EvolutionGraphConverter.py) - determines which stat grows fastest. */
  statAffinity: StatAffinity;
  /** Digi-Egg flavor type, resolved the same way as statAffinity (see
   * egg_type_mapping.py) - only meaningful for Fresh-stage species, since
   * that's the only stage a Digi-Egg ever hatches into, but every species
   * has one generated regardless of stage. */
  eggType: EggType;
  evolvesTo: string[];
  evolvesFrom: string[];
  lateralTo: string[];
  /** Only present for evolvesTo targets whose stage isn't exactly one
   * tier above this species' own (see classify_evolution_skips in
   * EvolutionGraphConverter.py) - 'shortcut' if the target is also
   * reachable via a fully legitimate, one-tier-at-a-time chain through
   * this species' own non-skip children (redundant), 'path' if this skip
   * edge is the only route to that target (essential), or 'backward' if
   * the target's stage is LOWER than this species' own (not a forward
   * digivolution at all - e.g. an Ultimate evolvesTo-ing a Fresh). All
   * three are excluded from getDigivolveOptions/getDedigivolveOptions/
   * isReadyToDigivolve regardless of which one applies. */
  evolutionSkips?: Record<string, 'shortcut' | 'path' | 'backward'>;
  /** Only present for evolvesTo targets that share this species' exact
   * stage (see classify_same_stage_evolutions in
   * EvolutionGraphConverter.py) - 'self-loop' (target is this species),
   * 'mode-change' (alternate form/weapon of the same base Digimon, not a
   * real evolution), 'mutual' (the reverse edge also exists - a tangled
   * web of forms evolving into each other, not a fusion), 'fusion'
   * (target has 2+ evolvesFrom sources and this edge isn't reciprocated,
   * likely a real DNA/Jogress result - still may mix multiple
   * continuities' rosters for the same target), or 'other' (unclassified
   * anomaly). Data/analysis only for now - not yet consulted by
   * getDigivolveOptions. */
  sameStageEvolutions?: Record<string, 'self-loop' | 'mode-change' | 'mutual' | 'fusion' | 'other'>;
  spriteUrl: string | null;
}

/** One owned species - the roster holds at most one entry per species
 * (keyed by speciesId in RosterState), and every entry contributes its
 * stats and receives full kill XP. Created by the starter roster, an egg
 * hatch, or a digivolve (see evolution/digivolve.ts). */
export interface RosterEntry {
  speciesId: string;
  xp: number;
  /** Rolled once when this entry is created, from its species' (stage,
   * statAffinity) - Pokemon-IV-style individual variance, never rerolled. */
  baseStats: StatBlock;
  /** Rolled once when this entry is created, same as baseStats. */
  growthPerLevel: StatBlock;
  /** Rolled when a digivolve creates this entry, scaled by the source's
   * level right before it digivolved (see rollInheritedBonus in
   * combat/stats.ts) - zero for starters and hatched entries. Digivolving
   * into this species AGAIN (an "upgrade") rolls a fresh bonus and keeps
   * the higher value per stat, so it can only ever improve. Rewards
   * letting a source level longer before digivolving it. */
  inheritedBonus: StatBlock;
  /** Highest source level any digivolve into this entry has come from - 0
   * if never digivolved into (starters, hatched entries). Shown on the
   * Evolution screen so the player knows what level beats the current
   * bonus. */
  inheritedFromLevel: number;
  /** Null until an Ability Reroll Crystal is used on this entry (see
   * abilities/abilities.ts's useAbilityReroll) - that item is the only
   * source, nothing rolls one automatically. */
  abilityId: AbilityId | null;
}

/** Keyed by speciesId - the key itself enforces "one per species". */
export type RosterState = Record<string, RosterEntry>;

/** An unhatched Digi-Egg. speciesId is already resolved (decided the
 * moment the egg dropped/was bought) but hidden from the player until it
 * hatches. isMystery distinguishes a player-bought Mystery Digi-Egg
 * (game/eggs/mysteryEggs.ts) from a wild kill-drop (game/eggs/eggs.ts's
 * rollEggDrop) - same hatching mechanics, only display differs. */
export interface Egg {
  eggId: string;
  speciesId: string;
  eggType: EggType;
  isMystery: boolean;
  xp: number;
}

/** Eggs live here, never in the roster. Only incubating eggs (up to
 * capacity) gain kill XP toward hatching; stored eggs wait, uncapped, and
 * move into a free incubating slot automatically (see
 * state/hatchery.svelte.ts's fillIncubatingSlots). */
export interface HatcheryState {
  capacity: number;
  maxCapacity: number;
  incubating: Egg[];
  stored: Egg[];
}

export interface CurrencyState {
  bits: number;
  /** Displayed for visual parity with the mockup; no source/sink this slice - stays 0. */
  data: number;
}

export interface WildSpawnState {
  speciesId: string;
  level: number;
  maxHp: number;
  currentHp: number;
  lastTickAt: number;
  /** Fractional attacks accumulated since the last whole attack tick fired
   * (roster attacksPerSecond * elapsedSeconds, carried over so partial
   * progress isn't lost between polls of the tick loop). */
  attackProgress: number;
  /** When this encounter started - immutable for its lifetime, unlike
   * lastTickAt (which updates every tick). Paired with timeLimitMs to
   * know when the fight times out (see combat/spawn.ts,
   * state/combat.svelte.ts's tick()). */
  spawnedAt: number;
  /** This encounter's total duration, fixed at spawn time from the
   * roster's summed HP stat at that moment (see
   * computeFightTimeLimitMs in combat/spawn.ts) - doesn't change if
   * roster HP changes mid-fight. */
  timeLimitMs: number;
}

export interface DamagePopupState {
  amount: number;
  id: number;
}

export interface CombatState {
  wild: WildSpawnState | null;
  damagePopup: DamagePopupState | null;
}

/** One entry in a path's spawn pool. `weight` drives weighted-random
 * species selection within the path; `levelRange`, when present,
 * overrides the path's own `levelRange` for just this species (e.g. a
 * weaker regional variant still appears in a higher-tier path, but capped
 * to a narrower level band than the path's full range). */
export interface AreaSpawnEntry {
  id: string;
  weight: number;
  levelRange?: [number, number];
}

/** A single explorable location within an area (see data/areas/*.json).
 * Paths form a DAG via `unlocks` (a list, not a single next-path) - a path
 * can fork into multiple next paths, not just chain linearly. */
export interface AreaPath {
  name: string;
  levelRange: [number, number];
  digimonPool: AreaSpawnEntry[];
  mastery: { kills: number };
  /** Path ids unlocked once this path's mastery threshold is reached.
   * Same-area only for now - a future `"areaId:pathId"` cross-area form
   * is anticipated by the shape but nothing produces or resolves it yet. */
  unlocks: string[];
}

export interface AreaData {
  id: string;
  name: string;
  label: string;
  startingPath: string;
  paths: Record<string, AreaPath>;
}

/** Persisted player progress through the area/path graph - which path is
 * currently active, which paths have been unlocked so far (per area), and
 * how many kills have been racked up per path toward its mastery
 * threshold. Keyed by `${areaId}:${pathId}` in killsByPath since kills are
 * tracked per path, not globally. */
export interface AreaProgressState {
  activeAreaId: string;
  activePathId: string;
  unlockedPaths: Record<string, string[]>;
  killsByPath: Record<string, number>;
}

/** A player's chosen (or auto-learned) next digivolve target for a given
 * source species - minLevel is an optional extra floor ON TOP OF the
 * target's normal DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE requirement (never
 * below it), letting a Digimon "cook" longer before auto-firing - a
 * higher source level means a bigger inheritedBonus on the new form. Fires
 * at most once per target, since an already-owned target can't be
 * digivolved into again. */
export interface DigivolvePreference {
  targetSpeciesId: string;
  minLevel: number;
}

/** Keyed by source speciesId (the owned Digimon digivolving), not an
 * abstract "line" - the evolution graph is a messy multi-parent DAG, so
 * "current species" is the only well-defined key. Populated either by
 * pinning ahead of time or automatically from the most recent manual
 * digivolve choice - see evolution/digivolve.ts. */
export interface DigivolveAutomationState {
  enabled: boolean;
  preferences: Record<string, DigivolvePreference>;
}
