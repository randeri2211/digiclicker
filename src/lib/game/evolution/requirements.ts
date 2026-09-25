import type { RosterEntry } from '../types';
import { getSpecies } from '../images';
import { levelForXp } from '../combat/levelCurve';
import { DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE } from '../constants';
import { crestRequirementFor, isCrestRequirementMet } from './crests';
import type { CrestRequirement } from './crests';

export interface DigivolutionRequirement {
  minLevel: number;
  /** Ultimate / Mega targets: the Crest (awakened, for Mega) it needs. */
  crest?: CrestRequirement;
}

// A level floor by target stage (DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE in
// constants.ts) plus, for Ultimate and Mega, the target egg family's Crest
// (evolution/crests.ts). Null = no requirement at all.
export function getRequirement(_fromSpeciesId: string, toSpeciesId: string): DigivolutionRequirement | null {
  const target = getSpecies(toSpeciesId);
  const minLevel = target ? DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE[target.stage] : undefined;
  const crest = target ? crestRequirementFor(target) : null;
  if (minLevel === undefined && !crest) return null;
  return { minLevel: minLevel ?? 0, ...(crest ? { crest } : {}) };
}

export function isRequirementMet(entry: RosterEntry, requirement: DigivolutionRequirement | null): boolean {
  if (!requirement) return true;
  if (requirement.crest && !isCrestRequirementMet(requirement.crest)) return false;
  return levelForXp(entry.xp) >= requirement.minLevel;
}
