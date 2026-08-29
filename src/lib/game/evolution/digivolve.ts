import type { DigimonInstance, DigimonSpecies, StatRangeBlock } from '../types';
import { getSpecies } from '../images';
import { getRequirement, isRequirementMet } from './requirements';
import type { DigivolutionRequirement } from './requirements';
import {
  rollDigivolutionBonus,
  rollGrowthPerLevel,
  computeDigivolutionBonusRange,
  computeGrowthPerLevelRange,
  addStatBlocks,
} from '../combat/stats';
import { levelForXp } from '../combat/levelCurve';
import { IN_GAME_STAGES, DEDIGIVOLVE_ITEM_ID, DEDIGIVOLVE_ITEM_COUNT } from '../constants';
import { removeItem } from '../state/inventory.svelte';

// Species whose stage isn't in IN_GAME_STAGES stay fully present in the
// scraped data (so nothing is lost, and re-enabling a stage later is a
// one-line change in constants.ts) but never surface as a digivolve/
// de-digivolve option.
function isInGameSpecies(species: DigimonSpecies): boolean {
  return IN_GAME_STAGES.has(species.stage);
}

// Stage-skipping evolvesTo edges (2+ tiers at once - see
// classify_evolution_skips in EvolutionGraphConverter.py) are disabled
// in-game for now, regardless of whether they're a redundant "shortcut"
// or an essential "path" - source is the edge's OWN species (the one
// whose evolvesTo the edge came from), since evolutionSkips is only ever
// populated on that side, never on the target.
function isSkipEdge(source: DigimonSpecies, targetId: string): boolean {
  return Boolean(source.evolutionSkips?.[targetId]);
}

export interface DigivolutionOption {
  species: DigimonSpecies;
  requirement: DigivolutionRequirement | null;
  requirementMet: boolean;
  /** Range only, not a rolled value - the actual roll happens once, at the
   * moment digivolve()/dedigivolve() is called, so there's nothing for the
   * player to preview-reroll by reopening the screen before committing. */
  digivolutionStatsBonusRange: StatRangeBlock;
  growthPerLevelRange: StatRangeBlock;
}

function buildOption(instance: DigimonInstance, species: DigimonSpecies): DigivolutionOption {
  const requirement = getRequirement(instance.speciesId, species.id);
  const preTransitionLevel = levelForXp(instance.xp);
  return {
    species,
    requirement,
    requirementMet: isRequirementMet(instance, requirement),
    digivolutionStatsBonusRange: computeDigivolutionBonusRange(species.stage, species.statAffinity, preTransitionLevel),
    growthPerLevelRange: computeGrowthPerLevelRange(species.stage, species.statAffinity),
  };
}

/**
 * evolvesFrom on the target species can list multiple sources (DNA/fusion
 * digivolutions, e.g. omnimon has 14) - that ambiguity never surfaces here
 * since this only ever reads the current instance's own evolvesTo.
 */
export function getDigivolveOptions(instance: DigimonInstance): DigivolutionOption[] {
  // An unhatched egg's speciesId is already resolved but deliberately
  // hidden until it hatches - digivolving it would spoil/skip the reveal.
  if (instance.eggState) return [];

  const current = getSpecies(instance.speciesId);
  if (!current) return [];

  return current.evolvesTo
    .filter((targetId) => !isSkipEdge(current, targetId))
    .map((targetId) => getSpecies(targetId))
    .filter((species): species is DigimonSpecies => species !== undefined && isInGameSpecies(species))
    .map((species) => buildOption(instance, species));
}

/**
 * Sourced from the graph's evolvesFrom (direct predecessors of the current
 * species), NOT the instance's own formHistory - de-digivolving one level
 * down shows whatever the graph says leads to the current form, regardless
 * of which specific path this instance actually took to get here.
 *
 * Requirement is a flat item cost (DEDIGIVOLVE_ITEM_ID x
 * DEDIGIVOLVE_ITEM_COUNT, not stage-based like digivolving up) - de-
 * digivolving doesn't care which lower stage you're heading into, just
 * that the player is willing to spend the item. This deliberately replaces
 * the old level-gate: leveling up and then bouncing a Digimon down for a
 * free digivolutionStats re-roll was too cheap, so the cost now has to be
 * earned/bought (see items/itemCatalog.ts) rather than just waited out.
 */
export function getDedigivolveOptions(instance: DigimonInstance): DigivolutionOption[] {
  if (instance.eggState) return [];

  const current = getSpecies(instance.speciesId);
  if (!current) return [];

  const requirement: DigivolutionRequirement = { itemId: DEDIGIVOLVE_ITEM_ID, itemCount: DEDIGIVOLVE_ITEM_COUNT };
  const requirementMet = isRequirementMet(instance, requirement);

  return current.evolvesFrom
    .map((speciesId) => getSpecies(speciesId))
    .filter((species): species is DigimonSpecies => species !== undefined && isInGameSpecies(species))
    // A predecessor's edge INTO current is only recorded on the
    // predecessor's own evolutionSkips (keyed by its evolvesTo target),
    // never on current - check it from that side.
    .filter((species) => !isSkipEdge(species, current.id))
    .map((species) => ({ ...buildOption(instance, species), requirement, requirementMet }));
}

// Deliberately doesn't reuse getDigivolveOptions() for a readiness check
// that may run on every render (e.g. the ready-count badge) - not a
// rolling concern anymore (options carry ranges now, not rolls), just
// avoids the pointless extra work of building full option objects.
export function isReadyToDigivolve(instance: DigimonInstance): boolean {
  if (instance.eggState) return false;
  const current = getSpecies(instance.speciesId);
  if (!current) return false;
  return current.evolvesTo
    .filter((targetId) => !isSkipEdge(current, targetId))
    .map((targetId) => getSpecies(targetId))
    .some((species) => species && isInGameSpecies(species) && isRequirementMet(instance, getRequirement(instance.speciesId, species.id)));
}

// The only place stats actually get rolled for a digivolve/de-digivolve -
// deliberately not passed in from the UI layer (which only ever sees the
// deterministic range preview), so there is no way to peek the real roll
// before committing to the transition.
function applyTransition(instance: DigimonInstance, targetSpeciesId: string): void {
  const targetSpecies = getSpecies(targetSpeciesId);
  if (!targetSpecies) return;

  const preTransitionLevel = levelForXp(instance.xp);
  const digivolutionStatsBonus = rollDigivolutionBonus(targetSpecies.stage, targetSpecies.statAffinity, preTransitionLevel);
  const growthPerLevel = rollGrowthPerLevel(targetSpecies.stage, targetSpecies.statAffinity);

  // formHistory no longer drives de-digivolve options (that's graph-based
  // now, see getDedigivolveOptions), but it's still tracked here as a
  // "every form this instance has ever been" record - useful later for
  // Digivolution Compendium-style completion tracking.
  if (!instance.formHistory.includes(targetSpeciesId)) {
    instance.formHistory.push(targetSpeciesId);
  }
  instance.xp = 0;
  instance.speciesId = targetSpeciesId;
  instance.digivolutionStats = addStatBlocks(instance.digivolutionStats, digivolutionStatsBonus);
  instance.growthPerLevel = growthPerLevel;
}

export function digivolve(instance: DigimonInstance, targetSpeciesId: string): void {
  applyTransition(instance, targetSpeciesId);
}

// Trusts the caller to have already checked requirementMet (same
// convention digivolve() follows for its level requirement) - the UI only
// ever commits a blocked option if it bypasses the requirementMet guard
// itself, so this doesn't re-check before consuming the item.
export function dedigivolve(instance: DigimonInstance, targetSpeciesId: string): void {
  removeItem(DEDIGIVOLVE_ITEM_ID, DEDIGIVOLVE_ITEM_COUNT);
  applyTransition(instance, targetSpeciesId);
}
