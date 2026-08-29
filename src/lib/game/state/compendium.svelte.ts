import type { CompendiumState } from '../types';

export const compendium: CompendiumState = $state({});

export function recordDiscovery(speciesId: string): void {
  compendium[speciesId] = true;
}

export function isDiscovered(speciesId: string): boolean {
  return Boolean(compendium[speciesId]);
}
