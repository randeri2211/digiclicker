import type { RosterEntry } from '../types';
import { getSpecies } from '../images';
import { levelForXp } from '../combat/levelCurve';
import { DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE } from '../constants';

export interface DigivolutionRequirement {
  minLevel: number;
}

// Purely stage-based right now (see DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE in
// constants.ts) - a target stage with no entry has no requirement.
export function getRequirement(_fromSpeciesId: string, toSpeciesId: string): DigivolutionRequirement | null {
  const targetStage = getSpecies(toSpeciesId)?.stage;
  const minLevel = targetStage ? DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE[targetStage] : undefined;
  return minLevel !== undefined ? { minLevel } : null;
}

export function isRequirementMet(entry: RosterEntry, requirement: DigivolutionRequirement | null): boolean {
  if (!requirement) return true;
  return levelForXp(entry.xp) >= requirement.minLevel;
}
