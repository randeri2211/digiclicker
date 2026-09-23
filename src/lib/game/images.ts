import rawData from '../data/digimon-evolution.json';
import type { DigimonSpecies, Egg, EggType, Stage } from './types';

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

/** Kill-drop and Mystery eggs share the same per-type sprite - callers
 * pair this with getEggSpriteUrl, and add the "?" overlay when
 * egg.isMystery. */
export function getEggDisplayName(egg: Egg): string {
  return egg.isMystery ? `Mystery ${egg.eggType} Digi-Egg` : `Digi-Egg (${egg.eggType})`;
}

export function getSpeciesName(speciesId: string): string {
  return getSpecies(speciesId)?.name ?? speciesId;
}
