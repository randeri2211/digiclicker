import type { DigimonInstance, ItemId } from '../types';
import { getSpecies } from '../images';
import { levelForXp } from '../combat/levelCurve';
import { DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE } from '../constants';
import { getItemCount } from '../state/inventory.svelte';

export interface DigivolutionRequirement {
  minLevel?: number;
  itemId?: ItemId;
  itemCount?: number;
}

// Digivolve-up requirement is purely stage-based right now (see
// DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE in constants.ts) - a target stage
// with no entry has no level requirement. De-digivolve's item requirement
// is built separately in digivolve.ts, since it doesn't depend on the
// target's stage the way digivolving up does.
export function getRequirement(_fromSpeciesId: string, toSpeciesId: string): DigivolutionRequirement | null {
  const targetStage = getSpecies(toSpeciesId)?.stage;
  const minLevel = targetStage ? DIGIVOLVE_MIN_LEVEL_BY_TARGET_STAGE[targetStage] : undefined;
  return minLevel !== undefined ? { minLevel } : null;
}

// Both minLevel and itemId/itemCount are checked when present - a
// requirement carrying both would need both satisfied, though nothing
// builds one that way today (de-digivolve is item-only, digivolve-up is
// level-only).
export function isRequirementMet(instance: DigimonInstance, requirement: DigivolutionRequirement | null): boolean {
  if (!requirement) return true;
  if (requirement.minLevel !== undefined && levelForXp(instance.xp) < requirement.minLevel) return false;
  if (requirement.itemId !== undefined && getItemCount(requirement.itemId) < (requirement.itemCount ?? 1)) return false;
  return true;
}
