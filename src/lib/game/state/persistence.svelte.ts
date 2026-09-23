import { currency } from './currency.svelte';
import { roster } from './roster.svelte';
import { hatchery } from './hatchery.svelte';
import { combat } from './combat.svelte';
import { inventory } from './inventory.svelte';
import { areaProgress } from './areaProgress.svelte';
import { automation } from './digivolveAutomation.svelte';
import { createSlot, updateSlot, getSlot, deleteSlot as deleteSlotFromStorage, listSlots } from './slots';
import type { SaveSlot, SaveSlotData } from './saveData';
import type { AreaProgressState, InventoryState, RosterState } from '../types';
import { AUTOSAVE_INTERVAL_MS } from '../constants';
import { ITEM_CATALOG } from '../items/itemCatalog';
import { initialAreaProgress } from '../areas/areaProgress';
import { getPath } from '../areas/areaRegistry';

export const activeSlot: { id: string | null } = $state({ id: null });

// Keeps only current ITEM_CATALOG keys, backfilling 0 for any added after
// the save was made - lookups elsewhere assume InventoryState always has
// every ItemId present.
function normalizeInventory(loadedInventory: InventoryState): InventoryState {
  const entries = Object.keys(ITEM_CATALOG).map((id) => [id, loadedInventory[id as keyof InventoryState] ?? 0]);
  return Object.fromEntries(entries) as InventoryState;
}

// Falls back to the starting area's starting path if the saved
// activePathId no longer resolves against current area data (area
// content can change between plays), rather than leaving the player on a
// dangling reference.
function normalizeAreaProgress(loaded: AreaProgressState): AreaProgressState {
  if (!getPath(loaded.activeAreaId, loaded.activePathId)) return initialAreaProgress();
  return loaded;
}

// v2 saves made before inheritedFromLevel existed lack it - 0 means "never
// digivolved into", which is exactly right for them (any upgrade shows as
// an improvement over "no level recorded").
function normalizeRoster(loaded: RosterState): RosterState {
  return Object.fromEntries(
    Object.entries(loaded).map(([id, entry]) => [id, { ...entry, inheritedFromLevel: entry.inheritedFromLevel ?? 0 }])
  );
}

// Overwrites a keyed-record $state object in place (not merge) - its key
// set is dynamic, so keys from whichever slot was previously live have to
// be cleared before assigning the newly loaded ones.
function replaceRecord<T>(target: Record<string, T>, source: Record<string, T>): void {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, source);
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
      roster,
      hatchery,
      wild: combat.wild,
      inventory,
      areaProgress,
      automation,
    })
  );
}

function applySlotToLiveState(data: SaveSlotData): void {
  Object.assign(currency, data.currency);
  replaceRecord(roster, normalizeRoster(data.roster));
  Object.assign(hatchery, data.hatchery);
  combat.wild = data.wild ? { ...data.wild, lastTickAt: Date.now() } : null;
  combat.damagePopup = null;
  Object.assign(inventory, normalizeInventory(data.inventory));
  Object.assign(areaProgress, normalizeAreaProgress(data.areaProgress));
  replaceRecord(automation.preferences, data.automation.preferences);
  automation.enabled = data.automation.enabled;
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

function isObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null;
}

// Shape check only - an exported v1 save (active/training team, no
// roster/hatchery) fails here and is rejected cleanly rather than
// crashing the first time the roster is read.
function isValidSlotData(value: unknown): value is SaveSlotData {
  if (!isObject(value)) return false;
  const data = value as Record<string, unknown>;
  return (
    isObject(data.currency) &&
    isObject(data.roster) &&
    isObject(data.hatchery) &&
    isObject(data.inventory) &&
    isObject(data.areaProgress) &&
    isObject(data.automation)
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
