import { currency } from './currency.svelte';
import { team } from './team.svelte';
import { combat } from './combat.svelte';
import { getSpawnProgress, setSpawnProgress } from '../combat/spawn';
import { createSlot, updateSlot, getSlot, deleteSlot as deleteSlotFromStorage, listSlots } from './slots';
import type { SaveSlot, SaveSlotData } from './saveData';
import type { DigimonInstance, TeamState } from '../types';
import { getSpecies } from '../images';
import { rollBaseStats, rollGrowthPerLevel, zeroStatBlock } from '../combat/stats';
import { AUTOSAVE_INTERVAL_MS } from '../constants';

export const activeSlot: { id: string | null } = $state({ id: null });

// Saves made before formHistory/baseStats/growthPerLevel existed (or from
// before digivolutionStats became a StatBlock instead of a bare number) are
// missing/mismatched on those fields - backfill them so old saves don't
// crash the first time evolution/combat code touches a loaded instance.
// baseStats/growthPerLevel are rolled fresh from the instance's CURRENT
// species (the only information available at load time - the original
// birth-form/most-recent-transition context is gone).
function normalizeInstance(instance: DigimonInstance): DigimonInstance {
  const species = getSpecies(instance.speciesId);
  const stage = species?.stage ?? 'Unknown';
  const statAffinity = species?.statAffinity ?? 'Attack';
  const hasStatBlockDigivolutionStats =
    instance.digivolutionStats !== undefined && typeof instance.digivolutionStats === 'object';

  return {
    ...instance,
    formHistory: instance.formHistory ?? [instance.speciesId],
    baseStats: instance.baseStats ?? rollBaseStats(stage, statAffinity),
    growthPerLevel: instance.growthPerLevel ?? rollGrowthPerLevel(stage, statAffinity),
    digivolutionStats: hasStatBlockDigivolutionStats ? instance.digivolutionStats : zeroStatBlock(),
    eggState: instance.eggState ?? null,
  };
}

function normalizeTeam(loadedTeam: TeamState): TeamState {
  return {
    ...loadedTeam,
    activeMembers: loadedTeam.activeMembers.map(normalizeInstance),
    trainingMembers: loadedTeam.trainingMembers.map(normalizeInstance),
    reserveMembers: (loadedTeam.reserveMembers ?? []).map(normalizeInstance),
  };
}

function snapshotLiveState(): SaveSlotData {
  // JSON round-trip so the saved snapshot is a true point-in-time copy, not
  // an alias into the live reactive state (which would keep "changing" the
  // save as the player keeps playing, before it's ever written to disk).
  // structuredClone() looks like the natural tool for this but throws
  // DataCloneError on Svelte 5's $state proxies once a nested object (e.g.
  // combat.wild) is non-null - JSON is what this data is destined for
  // anyway (localStorage), and unwraps proxies transparently.
  return JSON.parse(
    JSON.stringify({
      currency,
      team,
      wild: combat.wild,
      spawnProgress: getSpawnProgress(),
    })
  );
}

function applySlotToLiveState(data: SaveSlotData): void {
  Object.assign(currency, data.currency);
  Object.assign(team, normalizeTeam(data.team));
  combat.wild = data.wild
    ? { ...data.wild, lastTickAt: Date.now(), attackProgress: data.wild.attackProgress ?? 0 }
    : null;
  combat.damagePopup = null;
  setSpawnProgress(data.spawnProgress);
}

export function loadSlotIntoLiveState(slotId: string): void {
  const slot = getSlot(slotId);
  if (!slot) return;
  applySlotToLiveState(slot.data);
  activeSlot.id = slotId;
}

export function startNewGameInSlot(name?: string): void {
  const slot = createSlot(name);
  applySlotToLiveState(slot.data);
  activeSlot.id = slot.id;
}

export function saveGame(): void {
  if (!activeSlot.id) return;
  updateSlot(activeSlot.id, snapshotLiveState());
}

export function deleteSlot(id: string): void {
  deleteSlotFromStorage(id);
  if (activeSlot.id === id) {
    activeSlot.id = null;
  }
}

export function exportSlotToFile(id: string): void {
  const slot = getSlot(id);
  if (!slot) return;

  const blob = new Blob([JSON.stringify(slot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slot.name.replace(/[^a-z0-9 _-]/gi, '_')}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function isValidSlotData(value: unknown): value is SaveSlotData {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.currency === 'object' &&
    data.currency !== null &&
    typeof data.team === 'object' &&
    data.team !== null &&
    typeof data.spawnProgress === 'object' &&
    data.spawnProgress !== null
  );
}

export async function importSlotFromFile(file: File): Promise<SaveSlot | null> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const data: unknown = parsed?.data ?? parsed;
    if (!isValidSlotData(data)) return null;

    const name = typeof parsed?.name === 'string' ? `${parsed.name} (imported)` : undefined;
    return createSlot(name, data);
  } catch {
    return null;
  }
}

export { listSlots };

let autosaveIntervalId: ReturnType<typeof setInterval> | null = null;

function onVisibilityChange() {
  if (document.visibilityState === 'hidden') saveGame();
}

function onPageHide() {
  saveGame();
}

export function startAutosave(): void {
  if (autosaveIntervalId !== null) return;
  autosaveIntervalId = setInterval(saveGame, AUTOSAVE_INTERVAL_MS);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);
}

export function stopAutosave(): void {
  if (autosaveIntervalId === null) return;
  clearInterval(autosaveIntervalId);
  autosaveIntervalId = null;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('pagehide', onPageHide);
}
