import type { DigivolveAutomationState } from '../types';

export const automation: DigivolveAutomationState = $state({ enabled: false, preferences: {} });

export function setAutomationEnabled(enabled: boolean): void {
  automation.enabled = enabled;
}

export function setPreference(sourceSpeciesId: string, targetSpeciesId: string, minLevel: number): void {
  automation.preferences[sourceSpeciesId] = { targetSpeciesId, minLevel };
}

export function clearPreference(sourceSpeciesId: string): void {
  delete automation.preferences[sourceSpeciesId];
}
