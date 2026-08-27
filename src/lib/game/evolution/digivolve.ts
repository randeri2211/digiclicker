import type { DigimonInstance, DigimonSpecies, StatBlock } from '../types';
import { getSpecies } from '../images';
import { getRequirement, isRequirementMet } from './requirements';
import type { DigivolutionRequirement } from './requirements';
import { rollDigivolutionBonus, rollGrowthPerLevel, addStatBlocks } from '../combat/stats';

export interface DigivolutionOption {
  species: DigimonSpecies;
  requirement: DigivolutionRequirement | null;
  requirementMet: boolean;
  digivolutionStatsBonus: StatBlock;
  growthPerLevelPreview: StatBlock;
}

function buildOption(instance: DigimonInstance, species: DigimonSpecies): DigivolutionOption {
  const requirement = getRequirement(instance.speciesId, species.id);
  return {
    species,
    requirement,
    requirementMet: isRequirementMet(instance, requirement),
    digivolutionStatsBonus: rollDigivolutionBonus(species.stage, species.statType),
    growthPerLevelPreview: rollGrowthPerLevel(species.stage, species.statType),
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
    .filter((species): species is DigimonSpecies => species !== undefined)
    .map((species) => buildOption(instance, species));
}

/**
 * Sourced from the graph's evolvesFrom (direct predecessors of the current
 * species), NOT the instance's own formHistory - de-digivolving one level
 * down shows whatever the graph says leads to the current form, regardless
 * of which specific path this instance actually took to get here.
 */
export function getDedigivolveOptions(instance: DigimonInstance): DigivolutionOption[] {
  const current = getSpecies(instance.speciesId);
  if (!current) return [];

  return current.evolvesFrom
    .map((speciesId) => getSpecies(speciesId))
    .filter((species): species is DigimonSpecies => species !== undefined)
    .map((species) => ({ ...buildOption(instance, species), requirement: null, requirementMet: true }));
}

// Deliberately doesn't reuse getDigivolveOptions() - that rolls a fresh
// digivolutionStatsBonus/growthPerLevelPreview per option, which would be a
// wasteful (and pointless) side effect for a readiness check that may run
// on every render (e.g. the ready-count badge).
export function isReadyToDigivolve(instance: DigimonInstance): boolean {
  const current = getSpecies(instance.speciesId);
  if (!current) return false;
  return current.evolvesTo.some((targetId) => isRequirementMet(instance, getRequirement(instance.speciesId, targetId)));
}

function applyTransition(
  instance: DigimonInstance,
  targetSpeciesId: string,
  digivolutionStatsBonus: StatBlock,
  growthPerLevel: StatBlock
): void {
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

export function digivolve(
  instance: DigimonInstance,
  targetSpeciesId: string,
  digivolutionStatsBonus: StatBlock,
  growthPerLevel: StatBlock
): void {
  applyTransition(instance, targetSpeciesId, digivolutionStatsBonus, growthPerLevel);
}

export function dedigivolve(
  instance: DigimonInstance,
  targetSpeciesId: string,
  digivolutionStatsBonus: StatBlock,
  growthPerLevel: StatBlock
): void {
  applyTransition(instance, targetSpeciesId, digivolutionStatsBonus, growthPerLevel);
}
