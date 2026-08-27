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

export type StatType = 'Attack' | 'Defense' | 'Speed' | 'SpecialAttack';

export interface StatBlock {
  attack: number;
  defense: number;
  speed: number;
  specialAttack: number;
}

export interface DigimonSpecies {
  id: string;
  name: string;
  stage: Stage;
  stageOrder: number;
  /** Dominant combat archetype, resolved from real wiki taxonomy data (see
   * EvolutionGraphConverter.py) - determines which stat grows fastest. */
  statType: StatType;
  evolvesTo: string[];
  evolvesFrom: string[];
  lateralTo: string[];
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
   * statType). Never rerolled by digivolve/de-digivolve - fixed for the
   * instance's whole life, Pokemon-IV-style individual variance. */
  baseStats: StatBlock;
  /** REPLACED (not accumulated) on every digivolve AND de-digivolve, rolled
   * from the new current form's (stage, statType). Drives per-level growth
   * until the next form change rerolls it again. */
  growthPerLevel: StatBlock;
  /** Form-independent bonus pool (see GAMEPLAY_DESIGN.md) - accumulates
   * PER-STAT (+=) on every digivolve/de-digivolve, using that transition's
   * rolled bonus. Layered on top of baseStats/growthPerLevel, not scaled
   * by the current form. */
  digivolutionStats: StatBlock;
}

export interface TeamState {
  activeCapacity: number;
  activeMaxCapacity: number;
  activeMembers: DigimonInstance[];
  trainingCapacity: number;
  trainingMaxCapacity: number;
  trainingMembers: DigimonInstance[];
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
