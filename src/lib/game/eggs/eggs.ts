import type { DigimonInstance, DigimonSpecies } from '../types';
import { getSpecies } from '../images';
import { createDigimonInstance } from '../roster/starterRoster';
import { levelForXp } from '../combat/levelCurve';
import { EGG_DROP_CHANCE_PERCENT, EGG_HATCH_LEVEL, IN_GAME_STAGES } from '../constants';
import { recordDiscovery } from '../state/compendium.svelte';

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

/**
 * Rolls for a rare Digi-Egg drop from a kill. On a hit, resolves the
 * dropped egg to a random Fresh-stage ancestor of the killed species (see
 * findRootAncestors) and builds its (already-resolved, but hidden behind
 * eggState) instance. Returns null on a miss, or when the killed species
 * has no traceable Fresh ancestor at all.
 */
export function rollEggDrop(killedSpeciesId: string): DigimonInstance | null {
  if (Math.random() * 100 >= EGG_DROP_CHANCE_PERCENT) return null;

  const roots = findRootAncestors(killedSpeciesId);
  if (roots.length === 0) return null;

  const targetSpeciesId = roots[Math.floor(Math.random() * roots.length)];
  const targetSpecies = getSpecies(targetSpeciesId);
  if (!targetSpecies) return null;

  const instance = createDigimonInstance(targetSpeciesId, 0);
  instance.eggState = { eggType: targetSpecies.eggType, hatchAtLevel: EGG_HATCH_LEVEL };
  return instance;
}

/**
 * Checks whether an egg instance has reached its hatch threshold; if so,
 * clears eggState and resets xp to 0 (same reset digivolve/de-digivolve
 * already apply, for the same "every transition resets" consistency).
 * Called wherever xp is awarded (see awardKillXp in combat/xp.ts) - not a
 * separate sweep.
 */
export function tryHatch(instance: DigimonInstance): boolean {
  if (!instance.eggState) return false;
  if (levelForXp(instance.xp) < instance.eggState.hatchAtLevel) return false;

  instance.eggState = null;
  instance.xp = 0;
  // The reveal moment - instance.speciesId was resolved back at drop time
  // but hidden behind eggState until now, so this is the first point it's
  // safe to credit toward the compendium.
  recordDiscovery(instance.speciesId);
  return true;
}
