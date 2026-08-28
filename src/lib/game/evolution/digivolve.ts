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
import { IN_GAME_STAGES, DEDIGIVOLVE_MIN_LEVEL } from '../constants';

// Species whose stage isn't in IN_GAME_STAGES stay fully present in the
// scraped data (so nothing is lost, and re-enabling a stage later is a
// one-line change in constants.ts) but never surface as a digivolve/
// de-digivolve option.
function isInGameSpecies(species: DigimonSpecies): boolean {
  return IN_GAME_STAGES.has(species.stage);
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
    digivolutionStatsBonusRange: computeDigivolutionBonusRange(species.stage, species.statType, preTransitionLevel),
    growthPerLevelRange: computeGrowthPerLevelRange(species.stage, species.statType),
  };
}

/**
 * evolvesFrom on the target species can list multiple sources (DNA/fusion
 * digivolutions, e.g. omnimon has 14) - that ambiguity never surfaces here
 * since this only ever reads the current instance's own evolvesTo.
 */
export function getDigivolveOptions(instance: DigimonInstance): DigivolutionOption[] {
  const current = getSpecies(instance.speciesId);
  if (!current) return [];

  return current.evolvesTo
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
 * Requirement is a flat DEDIGIVOLVE_MIN_LEVEL (not stage-based like
 * digivolving up) - de-digivolving doesn't care which lower stage you're
 * heading into, just that the Digimon has reached a minimum level first.
 */
export function getDedigivolveOptions(instance: DigimonInstance): DigivolutionOption[] {
  const current = getSpecies(instance.speciesId);
  if (!current) return [];

  const requirement: DigivolutionRequirement = { minLevel: DEDIGIVOLVE_MIN_LEVEL };
  const requirementMet = isRequirementMet(instance, requirement);

  return current.evolvesFrom
    .map((speciesId) => getSpecies(speciesId))
    .filter((species): species is DigimonSpecies => species !== undefined && isInGameSpecies(species))
    .map((species) => ({ ...buildOption(instance, species), requirement, requirementMet }));
}

// Deliberately doesn't reuse getDigivolveOptions() for a readiness check
// that may run on every render (e.g. the ready-count badge) - not a
// rolling concern anymore (options carry ranges now, not rolls), just
// avoids the pointless extra work of building full option objects.
export function isReadyToDigivolve(instance: DigimonInstance): boolean {
  const current = getSpecies(instance.speciesId);
  if (!current) return false;
  return current.evolvesTo
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
  const digivolutionStatsBonus = rollDigivolutionBonus(targetSpecies.stage, targetSpecies.statType, preTransitionLevel);
  const growthPerLevel = rollGrowthPerLevel(targetSpecies.stage, targetSpecies.statType);

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

export function dedigivolve(instance: DigimonInstance, targetSpeciesId: string): void {
  applyTransition(instance, targetSpeciesId);
}
