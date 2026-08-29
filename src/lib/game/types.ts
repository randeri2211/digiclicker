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

export type StatAffinity = 'Attack' | 'Defense' | 'Speed' | 'SpecialAttack';

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

/** One member for now (the de-digivolve item) - a plain string union so
 * adding a new item later is just adding a new member here plus a matching
 * ITEM_CATALOG entry (see src/lib/game/items/itemCatalog.ts). */
export type ItemId = 'dedigivolve-crystal';

export interface ItemDefinition {
  id: ItemId;
  name: string;
  description: string;
  costBits: number;
}

/** Always has an entry for every ItemId (see inventory.svelte.ts's
 * initialization) - lookups never need a `?? 0` fallback. */
export type InventoryState = Record<ItemId, number>;

export interface StatBlock {
  attack: number;
  defense: number;
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

export interface DigimonInstance {
  /** Distinct from speciesId - a future taming system could produce duplicate species. */
  instanceId: string;
  speciesId: string;
  xp: number;
  /** Every distinct species this instance has ever been, first-visited order,
   * always including the current speciesId. Not consulted for de-digivolve
   * options (those come from the evolution graph's evolvesFrom instead) -
   * this is a completion-tracking record for later (e.g. Digivolution
   * Compendium progress). */
  formHistory: string[];
  /** Rolled ONCE at instance creation, from the birth-form's (stage,
   * statAffinity). Never rerolled by digivolve/de-digivolve - fixed for the
   * instance's whole life, Pokemon-IV-style individual variance. */
  baseStats: StatBlock;
  /** REPLACED (not accumulated) on every digivolve AND de-digivolve, rolled
   * from the new current form's (stage, statAffinity). Drives per-level growth
   * until the next form change rerolls it again. */
  growthPerLevel: StatBlock;
  /** Form-independent bonus pool (see GAMEPLAY_DESIGN.md) - accumulates
   * PER-STAT (+=) on every digivolve/de-digivolve, using that transition's
   * rolled bonus. Layered on top of baseStats/growthPerLevel, not scaled
   * by the current form. */
  digivolutionStats: StatBlock;
  /** Non-null while this instance hasn't hatched yet - speciesId is
   * already resolved (decided the moment the egg dropped), only
   * display/digivolve-eligibility are gated on this. Cleared (hatches,
   * resetting xp to 0 - same as digivolve/de-digivolve) the moment xp
   * crosses hatchAtLevel; checked wherever xp is awarded (see
   * tryHatch in game/eggs/eggs.ts). */
  eggState: { eggType: EggType; hatchAtLevel: number } | null;
}

export interface TeamState {
  activeCapacity: number;
  activeMaxCapacity: number;
  activeMembers: DigimonInstance[];
  trainingCapacity: number;
  trainingMaxCapacity: number;
  trainingMembers: DigimonInstance[];
  /** The "Digimon Hub" - caught Digimon that aren't on either team. No
   * capacity limit, unlike activeMembers/trainingMembers. */
  reserveMembers: DigimonInstance[];
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
   * (team attacksPerSecond * elapsedSeconds, carried over so partial
   * progress isn't lost between polls of the tick loop). */
  attackProgress: number;
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

/** Permanent record of every species the player has ever had revealed to
 * them (starter team, egg hatch, digivolve/de-digivolve) - a presence map
 * keyed by speciesId, never entries removed even if the player later loses
 * every instance of that form. See state/compendium.svelte.ts. */
export type CompendiumState = Record<string, true>;
