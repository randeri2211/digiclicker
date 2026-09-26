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
  // The shipped, optimized copy (optimize_sprites.py builds public/sprites/
  // from the scraped original at spriteUrl). BASE_URL keeps it working when
  // the game is served from a sub-path (e.g. GitHub Pages /digiclicker/).
  return `${import.meta.env.BASE_URL}sprites/${species.id}.webp`;
}

// Recolored per-type Digi-Egg art (see EggImageGenerator.py), optimized
// into public/sprites/eggs/ by optimize_sprites.py.
export function getEggSpriteUrl(eggType: EggType): string {
  return `${import.meta.env.BASE_URL}sprites/eggs/${eggType}.webp`;
}

// Element / attribute icons (import_type_icons.py builds public/sprites/icons/).
// Neutral has no icon - callers fall back to its coloured dot.
const ELEMENTS_WITH_ICONS = new Set(['Fire', 'Water', 'Plant', 'Electric', 'Earth', 'Wind', 'Metal', 'Light', 'Dark']);

export function getElementIconUrl(element: string): string | null {
  return ELEMENTS_WITH_ICONS.has(element) ? `${import.meta.env.BASE_URL}sprites/icons/elements/${element}.webp` : null;
}

// The data's attribute values -> the icon set's (Time Stranger) names.
const ATTRIBUTE_ICON: Record<string, string> = {
  Vaccine: 'Vaccine',
  Data: 'Data',
  Virus: 'Virus',
  Free: 'Free',
  Variable: 'Variable',
  Unknown: 'Unknown',
  Unidentified: 'Unknown',
  None: 'NoData',
  'NO DATA': 'NoData',
};

export function getAttributeIconUrl(attribute: string): string {
  return `${import.meta.env.BASE_URL}sprites/icons/attributes/${ATTRIBUTE_ICON[attribute] ?? 'Unknown'}.webp`;
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
