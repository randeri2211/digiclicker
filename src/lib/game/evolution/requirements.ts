import type { DigimonInstance } from '../types';
import { getSpecies } from '../images';
import { levelForXp } from '../combat/levelCurve';
import { DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE } from '../constants';

export interface DigivolutionRequirement {
  minLevel?: number;
}

// Digivolve-up requirement is purely stage-based right now (see
// DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE in constants.ts) - a target stage
// with no entry has no level requirement. De-digivolve's flat
// DEDIGIVOLVE_MIN_LEVEL is applied separately in digivolve.ts, since it
// doesn't depend on the target's stage the way digivolving up does.
export function getRequirement(_fromSpeciesId: string, toSpeciesId: string): DigivolutionRequirement | null {
  const targetStage = getSpecies(toSpeciesId)?.stage;
  const minLevel = targetStage ? DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE[targetStage] : undefined;
  return minLevel !== undefined ? { minLevel } : null;
}

export function isRequirementMet(instance: DigimonInstance, requirement: DigivolutionRequirement | null): boolean {
  if (requirement?.minLevel === undefined) return true;
  return levelForXp(instance.xp) >= requirement.minLevel;
}
