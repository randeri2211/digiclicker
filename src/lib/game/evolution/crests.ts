import crestsData from '../../data/crests.json';
import type { DigimonSpecies } from '../types';
import { hasFlag } from '../state/progress.svelte';
import { CREST_GATING_ENABLED } from '../constants';

// Crests gate the top stages (roadmap feature 6, STORY.md section 2): an
// Ultimate needs the Crest of its egg family, a Mega needs that Crest
// awakened. Owning / awakening a Crest is just a flag - `crest:<id>` and
// `crest:<id>:awakened` - so quests (or anything else) grant them with no
// code here. Where the Holy family is covered by two Crests (Light, Hope),
// either one will do for now.

export interface CrestDefinition {
  id: string;
  name: string;
  eggTypes: string[];
}

export const CRESTS = crestsData as Record<string, CrestDefinition>;

export function crestFlag(crestId: string, awakened = false): string {
  return awakened ? `crest:${crestId}:awakened` : `crest:${crestId}`;
}

/** What digivolving INTO a species needs: any one of `crestIds`. */
export interface CrestRequirement {
  crestIds: string[];
  awakened: boolean;
}

export function crestRequirementFor(target: DigimonSpecies): CrestRequirement | null {
  if (!CREST_GATING_ENABLED) return null;
  if (target.stage !== 'Ultimate' && target.stage !== 'Mega') return null;
  const crestIds = Object.values(CRESTS)
    .filter((crest) => target.eggType !== undefined && crest.eggTypes.includes(target.eggType))
    .map((crest) => crest.id);
  // A family no Crest covers stays ungated rather than locked forever.
  return crestIds.length ? { crestIds, awakened: target.stage === 'Mega' } : null;
}

export function isCrestRequirementMet(requirement: CrestRequirement): boolean {
  return requirement.crestIds.some((id) => hasFlag(crestFlag(id, requirement.awakened)));
}

/** "Crest of Courage" / "Crest of Light or Hope (awakened)". */
export function crestRequirementLabel(requirement: CrestRequirement): string {
  const names = requirement.crestIds.map((id) => CRESTS[id].name.replace(/^Crest of /, ''));
  return `Crest of ${names.join(' or ')}${requirement.awakened ? ' (awakened)' : ''}`;
}
