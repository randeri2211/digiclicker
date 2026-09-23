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

/** Combat element (see element_mapping.py) - drives the element half of
 * the boss-fight advantage system (combat/advantage.ts, with the matchups
 * in data/elementChart.json). Neutral has no edge either way. */
export type Element =
  | 'Fire'
  | 'Water'
  | 'Plant'
  | 'Electric'
  | 'Earth'
  | 'Wind'
  | 'Metal'
  | 'Light'
  | 'Dark'
  | 'Neutral';

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
export type ItemId = 'ability-reroll-crystal' | 'attack-chip' | 'speed-chip' | 'hp-disk';

export interface ItemDefinition {
  id: ItemId;
  name: string;
  description: string;
  /** Shop price in bits, or null for items the Shop doesn't sell (found
   * elsewhere, e.g. boss chips from expeditions). */
  costBits: number | null;
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
  /** Raw wiki attribute - 'Vaccine' / 'Data' / 'Virus' drive the
   * attribute half of the boss-fight advantage system; anything else
   * ('Free', 'None', ...) is neutral. */
  attribute: string;
  /** Resolved from the raw wiki type via element_mapping.py. */
  element: Element;
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
   * lastTickAt (which updates every tick). */
  spawnedAt: number;
  /** Total time limit in ms, or null for an untimed encounter. Normal
   * wild fights are untimed (they last until the wild falls); only boss
   * fights are timed, funded by the squad's HP (see
   * computeFightTimeLimitMs in combat/spawn.ts). */
  timeLimitMs: number | null;
}

export interface DamagePopupState {
  amount: number;
  id: number;
}

/** A squad member in a boss fight: a roster species plus its matchup
 * multiplier against the boss (see combat/advantage.ts), fixed when the
 * fight starts. */
export interface SquadMember {
  speciesId: string;
  multiplier: number;
}

/** Present while a boss fight is running - combat.wild then holds the
 * boss, and only the squad fights it (the rest of the roster sits out). */
export interface BossFightState {
  areaId: string;
  pathId: string;
  squad: SquadMember[];
  /** Extra fraction per stat for the whole squad from boss chips spent on
   * this fight (e.g. { attack: 0.25 } from an Attack Chip). */
  statBonus: Partial<Record<keyof StatBlock, number>>;
}

/** Shown briefly in the arena after a boss fight ends. */
export interface BossFightResult {
  speciesId: string;
  won: boolean;
  bits: number;
  data: number;
  firstClear: boolean;
  id: number;
}

export interface CombatState {
  wild: WildSpawnState | null;
  damagePopup: DamagePopupState | null;
  boss: BossFightState | null;
  lastBossResult: BossFightResult | null;
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
/** A region's boss, on its final path: available once that path's
 * mastery kill count is reached. Beating it records the path as cleared
 * (bossesDefeated), pays the rewards (every win, not just the first) and
 * unlocks `unlocks` - empty until later regions exist. */
export interface BossDefinition {
  speciesId: string;
  level: number;
  /** Most roster members that can join the fight - per boss, so each boss
   * can be balanced on its own. */
  squadSize: number;
  /** Multiplies the normal wild HP for this species and level. */
  hpMultiplier: number;
  rewards: { bits: number; data: number };
  unlocks: string[];
}

export interface AreaPath {
  name: string;
  /** Optional manual spot for the path's node on its region's map, in map
   * coordinates (see `mapSize` in data/regions.json). Normally omitted -
   * layoutPathNodes lines an area's paths up along its route out. */
  map?: { x: number; y: number };
  levelRange: [number, number];
  digimonPool: AreaSpawnEntry[];
  mastery: { kills: number };
  boss?: BossDefinition;
  /** Paths unlocked once this path's mastery threshold is reached: a path
   * id in this area, or `"areaId:pathId"` for a path in another area. */
  unlocks: string[];
}

export interface AreaData {
  id: string;
  name: string;
  label: string;
  startingPath: string;
  paths: Record<string, AreaPath>;
}

/** How an area's land is drawn on the code-drawn region map. */
export type MapTerrain =
  | 'forest' | 'savanna' | 'mountain' | 'snow' | 'town' | 'lake'
  | 'ruins' | 'desert' | 'dark' | 'volcano' | 'sky' | 'digital';

/** An area's landmark on its region's map. Listed even before the area is
 * built (no data/areas file yet) - it then shows as a locked "???"
 * silhouette, so the map doubles as the story's roadmap. */
export interface RegionMapArea {
  id: string;
  name: string;
  terrain: MapTerrain;
  x: number;
  y: number;
  /** Radius of the area's land blob, in map coordinates. */
  r: number;
}

/** One travel map (PokeClicker's Kanto / Johto): a story act's areas,
 * their paths, and the routes drawn between areas. */
export interface RegionData {
  id: string;
  name: string;
  label: string;
  /** Optional background art (a URL under public/); null = the map is
   * drawn in code from the areas' terrain. */
  background: string | null;
  areas: RegionMapArea[];
  /** Pairs of area ids joined by a route line - visual only; what's
   * reachable is decided by unlocks. */
  routes: [string, string][];
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
  /** `${areaId}:${pathId}` of every path whose boss has been beaten. */
  bossesDefeated: string[];
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

// ---- Expeditions ------------------------------------------------------

export interface ExpeditionLootItem {
  id: ItemId;
  chancePercent: number;
  count: [number, number];
}

/** A place a party can be sent to (src/lib/data/expeditions.json). */
export interface ExpeditionDestination {
  id: string;
  name: string;
  description: string;
  areaId: string;
  /** Becomes available once this path is unlocked. */
  unlockPathId: string;
  /** Party members of these elements raise the haul. */
  favoredElements: Element[];
  durationMinutes: number;
  loot: {
    data: [number, number];
    eggChancePercent: number;
    /** Found eggs are of one of these families. */
    eggTypes: EggType[];
    items: ExpeditionLootItem[];
  };
}

export interface ActiveExpedition {
  id: string;
  destinationId: string;
  memberSpeciesIds: string[];
  startedAt: number;
  endsAt: number;
  /** Set once endsAt has passed - the party is back (fighting again) and
   * the haul waits to be claimed. */
  returned: boolean;
}

/** What a claimed expedition brought back. */
export interface ExpeditionHaul {
  destinationId: string;
  data: number;
  eggs: number;
  items: { id: ItemId; count: number }[];
}

export interface ExpeditionState {
  active: ActiveExpedition[];
  /** The most recent claim, shown until dismissed. */
  lastHaul: ExpeditionHaul | null;
}

// ---- Quests & progress flags -------------------------------------------

/** One condition a quest checks against the live game state (see
 * game/quests/quests.ts - each kind is one case there). */
export type QuestRequirement =
  | { kind: 'own-species'; speciesId: string }
  | { kind: 'own-stage'; stage: Stage; count: number }
  | { kind: 'own-element'; element: Element; count: number }
  /** Any owned Digimon (or one species, if given) at this level or above. */
  | { kind: 'reach-level'; level: number; speciesId?: string }
  | { kind: 'path-kills'; areaId: string; pathId: string; kills: number }
  | { kind: 'defeat-boss'; areaId: string; pathId: string }
  /** Consumed when the quest is turned in. */
  | { kind: 'deliver-item'; itemId: ItemId; count: number }
  | { kind: 'has-flag'; flag: string }
  /** Own at least this many Digimon (roster entries). */
  | { kind: 'roster-size'; count: number };

export interface QuestReward {
  bits?: number;
  data?: number;
  items?: { id: ItemId; count: number }[];
  /** Progress flags set on completion - how quests unlock other systems
   * (e.g. a future Crest or Armor digivolution) without those systems
   * knowing about quests. */
  flags?: string[];
}

/** A quest (src/lib/data/quests.json). */
export interface QuestDefinition {
  id: string;
  title: string;
  /** Who gives it - an NPC id from data/npcs.json; shown on the quest
   * card and the area's NPC strip. */
  giver?: string;
  /** The area whose NPC strip shows it; omitted = only in the quest log. */
  areaId?: string;
  text: string;
  /** Shown once it's completed. */
  completeText?: string;
  /** All must hold before the quest appears - the story's ordering. */
  prerequisites?: { quests?: string[]; flags?: string[] };
  requirements: QuestRequirement[];
  rewards: QuestReward;
}

/** A game system a village resident can unlock - see data/npcs.json. A
 * system no NPC provides is always open. */
export type SystemId = 'expeditions' | 'hatchery-upgrades' | 'mystery-eggs' | 'shop' | 'continent-travel';

/** A story character (src/lib/data/npcs.json) - quest giver and/or village
 * resident. A resident joins the village when the flag `resident:<id>` is
 * set (normally a quest reward) and from then on opens its `systems`. */
export interface NpcDefinition {
  id: string;
  name: string;
  speciesId: string;
  /** Where they're met - the area whose NPC strip shows their quests. */
  homeAreaId: string;
  /** One line for the Village screen: who they are / what they do. */
  role: string;
  /** Can move into the village (shown on the Village screen). */
  resident?: boolean;
  /** In the village from the very start - no join flag needed. */
  startsInVillage?: boolean;
  /** Systems that open once they've joined. */
  systems?: SystemId[];
}

/** Permanent story/progress state: named flags other systems check, and
 * which quests are done. */
export interface ProgressState {
  flags: Record<string, true>;
  completedQuests: string[];
}

