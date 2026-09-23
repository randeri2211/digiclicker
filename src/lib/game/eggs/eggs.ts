import type { DigimonSpecies, Egg, EggType } from '../types';
import { getSpecies } from '../images';
import { createRosterEntry } from '../roster/starterRoster';
import { levelForXp } from '../combat/levelCurve';
import { DUPLICATE_HATCH_XP, EGG_DROP_CHANCE_PERCENT, EGG_HATCH_LEVEL, IN_GAME_STAGES } from '../constants';
import { roster, addToRoster } from '../state/roster.svelte';
import { removeIncubatingEgg } from '../state/hatchery.svelte';

function isInGameSpecies(species: DigimonSpecies): boolean {
  return IN_GAME_STAGES.has(species.stage);
}

/**
 * Walks evolvesFrom backward from speciesId, restricted to IN_GAME_STAGES
 * species (same filter digivolve.ts already applies to the graph), and
 * collects every distinct Fresh-stage species reached. A branch that dead-
 * ends without hitting a literal Fresh node contributes nothing - data
 * gaps fail closed rather than falling back to a wrong-stage substitute.
 */
export function findRootAncestors(speciesId: string): string[] {
  const roots = new Set<string>();
  const visited = new Set<string>();

  function walk(id: string): void {
    if (visited.has(id)) return;
    visited.add(id);

    const species = getSpecies(id);
    if (!species) return;

    if (species.stage === 'Fresh') {
      roots.add(id);
      return;
    }

    const ancestors = species.evolvesFrom
      .map((ancestorId) => getSpecies(ancestorId))
      .filter((ancestor): ancestor is DigimonSpecies => ancestor !== undefined && isInGameSpecies(ancestor));

    for (const ancestor of ancestors) {
      walk(ancestor.id);
    }
  }

  walk(speciesId);
  return [...roots];
}

export function createEgg(speciesId: string, eggType: EggType, isMystery: boolean): Egg {
  return { eggId: crypto.randomUUID(), speciesId, eggType, isMystery, xp: 0 };
}

/**
 * Rolls for a rare Digi-Egg drop from a kill. On a hit, resolves the
 * dropped egg to a random Fresh-stage ancestor of the killed species (see
 * findRootAncestors) - already resolved, but hidden from the player until
 * it hatches. Returns null on a miss, or when the killed species has no
 * traceable Fresh ancestor at all.
 */
export function rollEggDrop(killedSpeciesId: string): Egg | null {
  if (Math.random() * 100 >= EGG_DROP_CHANCE_PERCENT) return null;

  const roots = findRootAncestors(killedSpeciesId);
  if (roots.length === 0) return null;

  const targetSpeciesId = roots[Math.floor(Math.random() * roots.length)];
  const targetSpecies = getSpecies(targetSpeciesId);
  if (!targetSpecies) return null;

  return createEgg(targetSpeciesId, targetSpecies.eggType, false);
}

/**
 * Hatches an incubating egg once it reaches EGG_HATCH_LEVEL - removes it
 * from the hatchery and either adds its species to the roster (the reveal
 * moment - also what credits it in the Compendium) or, if that species is
 * already owned, converts it into a bonus for the existing entry instead
 * of a second copy. Called wherever xp is awarded (see awardKillXp in
 * combat/xp.ts) - not a separate sweep.
 */
export function tryHatch(egg: Egg): boolean {
  if (levelForXp(egg.xp) < EGG_HATCH_LEVEL) return false;

  removeIncubatingEgg(egg.eggId);
  if (addToRoster(createRosterEntry(egg.speciesId))) return true;

  // TODO(human): this species is already owned - turn the egg into a bonus
  // for `existing` instead of a second copy.
  const existing = roster[egg.speciesId];
  return true;
}
