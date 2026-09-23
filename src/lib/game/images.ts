import rawData from '../data/digimon-evolution.json';
import type { DigimonInstance, DigimonSpecies, EggType, Stage } from './types';

interface EvolutionData {
  species: Record<string, DigimonSpecies>;
}

const data = rawData as unknown as EvolutionData;

export function getSpecies(speciesId: string): DigimonSpecies | undefined {
  return data.species[speciesId];
}

// DEBUG-tooling helper (see DebugSpawnPanel) - not used by normal gameplay,
// which draws wild spawns from the curated WILD_SPAWN_POOL instead.
export function getSpeciesIdsByStage(stage: Stage): string[] {
  return Object.values(data.species)
    .filter((species) => species.stage === stage)
    .map((species) => species.id);
}

export function getSpriteUrl(speciesId: string): string | null {
  const species = getSpecies(speciesId);
  if (!species?.spriteUrl) return null;
  // Filenames contain spaces/parentheses (e.g. "Agumon dl.png") - encode each
  // path segment so they survive as <img src> values. spriteUrl is relative
  // to public/, so it's served from the site root.
  const encoded = species.spriteUrl
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `/${encoded}`;
}

// Recolored per-type Digi-Egg art (see EggImageGenerator.py) - egg types
// have no spaces/special characters, so no encoding needed unlike
// getSpriteUrl above.
export function getEggSpriteUrl(eggType: EggType): string {
  return `/digimon/eggs/${eggType}/egg-base.png`;
}

/** True only for a player-bought Mystery Digi-Egg (game/eggs/
 * mysteryEggs.ts) still unhatched - false for a real wild kill-drop egg
 * (same sprite, no overlay) and for any non-egg instance. */
export function isMysteryEgg(instance: DigimonInstance): boolean {
  return instance.eggState?.isMystery ?? false;
}

/** Centralizes the three-way branch every egg/species display site needs:
 * a real (hatched) species' name, a kill-drop egg's generic flavor name,
 * or a Mystery egg's distinct name - callers pair this with
 * getEggSpriteUrl + isMysteryEgg for the sprite/overlay. */
export function getInstanceDisplayName(instance: DigimonInstance): string {
  if (instance.eggState) {
    return instance.eggState.isMystery
      ? `Mystery ${instance.eggState.eggType} Digi-Egg`
      : `Digi-Egg (${instance.eggState.eggType})`;
  }
  return getSpecies(instance.speciesId)?.name ?? instance.speciesId;
}
