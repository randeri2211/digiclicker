import type { DigimonInstance } from '../types';

// TODO: real digivolution requirements (level thresholds, items, etc.) -
// no requirement data source exists yet. getRequirement always returns
// null, and isRequirementMet treats null as "no requirement" and always
// passes - a deliberate auto-allow fallback for testing until real
// requirement data exists.
export interface DigivolutionRequirement {
  minLevel?: number;
}

export function getRequirement(_fromSpeciesId: string, _toSpeciesId: string): DigivolutionRequirement | null {
  return null;
}

export function isRequirementMet(_instance: DigimonInstance, _requirement: DigivolutionRequirement | null): boolean {
  // Always passes for now - see the TODO above. Once getRequirement
  // returns real data, this should actually evaluate its fields (e.g.
  // levelForXp(instance.xp) >= requirement.minLevel).
  return true;
}
