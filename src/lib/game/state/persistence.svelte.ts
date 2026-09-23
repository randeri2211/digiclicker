import { currency } from './currency.svelte';
import { team } from './team.svelte';
import { combat } from './combat.svelte';
import { inventory } from './inventory.svelte';
import { areaProgress } from './areaProgress.svelte';
import { compendium } from './compendium.svelte';
import { automation } from './digivolveAutomation.svelte';
import { createSlot, updateSlot, getSlot, deleteSlot as deleteSlotFromStorage, listSlots } from './slots';
import type { SaveSlot, SaveSlotData } from './saveData';
import type { AreaProgressState, CompendiumState, DigimonInstance, DigivolveAutomationState, InventoryState, StatBlock, TeamState } from '../types';
import { getSpecies } from '../images';
import { rollBaseStats, rollGrowthPerLevel, zeroStatBlock } from '../combat/stats';
import { computeTeamHp } from '../combat/damage';
import { computeFightTimeLimitMs } from '../combat/spawn';
import { AUTOSAVE_INTERVAL_MS } from '../constants';
import { ITEM_CATALOG } from '../items/itemCatalog';
import { initialAreaProgress } from '../areas/areaProgress';
import { getPath } from '../areas/areaRegistry';

export const activeSlot: { id: string | null } = $state({ id: null });

// Saves made before formHistory/baseStats/growthPerLevel existed (or from
// before digivolutionStats became a StatBlock instead of a bare number) are
// missing/mismatched on those fields - backfill them so old saves don't
// crash the first time evolution/combat code touches a loaded instance.
// baseStats/growthPerLevel are rolled fresh from the instance's CURRENT
// species (the only information available at load time - the original
// birth-form/most-recent-transition context is gone).
// Old saves' StatBlocks have a `defense` key, not `hp` (Defense was
// renamed to HP once it gained a live effect - see combat/stats.ts).
// Prefers hp if present (already-migrated or freshly-rolled blocks),
// else falls back to the old defense value, else 0 - a no-op on a block
// already in the new shape.
function migrateStatBlock(block: StatBlock & { defense?: number }): StatBlock {
  return { ...block, hp: block.hp ?? block.defense ?? 0 };
}

function normalizeInstance(instance: DigimonInstance): DigimonInstance {
  const species = getSpecies(instance.speciesId);
  const stage = species?.stage ?? 'Unknown';
  const statAffinity = species?.statAffinity ?? 'Attack';
  const hasStatBlockDigivolutionStats =
    instance.digivolutionStats !== undefined && typeof instance.digivolutionStats === 'object';

  return {
    ...instance,
    formHistory: instance.formHistory ?? [instance.speciesId],
    baseStats: migrateStatBlock(instance.baseStats ?? rollBaseStats(stage, statAffinity)),
    growthPerLevel: migrateStatBlock(instance.growthPerLevel ?? rollGrowthPerLevel(stage, statAffinity)),
    digivolutionStats: migrateStatBlock(hasStatBlockDigivolutionStats ? instance.digivolutionStats : zeroStatBlock()),
    eggState: instance.eggState ? { ...instance.eggState, isMystery: instance.eggState.isMystery ?? false } : null,
    abilityId: instance.abilityId ?? null,
  };
}

// Backfills 0 for any ITEM_CATALOG key missing from an old save (saves made
// before items existed, or before a future new item is added) - lookups
// elsewhere assume InventoryState always has every ItemId present.
function normalizeInventory(loadedInventory: InventoryState | undefined): InventoryState {
  const entries = Object.keys(ITEM_CATALOG).map((id) => [id, loadedInventory?.[id as keyof InventoryState] ?? 0]);
  return Object.fromEntries(entries) as InventoryState;
}

// Defaults to a fresh initialAreaProgress() if missing entirely, or if the
// saved activePathId no longer resolves against current area data (area
// content can change between plays) - falls back to the starting area's
// starting path rather than leaving the player on a dangling reference.
function normalizeAreaProgress(loaded: AreaProgressState | undefined): AreaProgressState {
  if (!loaded) return initialAreaProgress();
  if (!getPath(loaded.activeAreaId, loaded.activePathId)) return initialAreaProgress();
  return loaded;
}

// One-time migration for saves made before the compendium existed - if
// present, the loaded record is the permanent source of truth as-is. If
// missing, backfill it from the (already-normalized) team's formHistory so
// players don't lose credit for forms they already have. Skips an
// instance's OWN current speciesId while it's still an unhatched egg -
// same egg-safety rule as the live reveal-moment call sites (formHistory
// is set at drop time, before the species is ever shown to the player).
function normalizeCompendium(loaded: CompendiumState | undefined, normalizedTeam: TeamState): CompendiumState {
  if (loaded) return loaded;

  const backfilled: CompendiumState = {};
  const allMembers = [...normalizedTeam.activeMembers, ...normalizedTeam.trainingMembers, ...normalizedTeam.reserveMembers];
  for (const instance of allMembers) {
    for (const speciesId of instance.formHistory) {
      if (instance.eggState && speciesId === instance.speciesId) continue;
      backfilled[speciesId] = true;
    }
  }
  return backfilled;
}

// Defaults to disabled/no-preferences if missing (saves made before
// auto-digivolve existed).
function normalizeAutomation(loaded: DigivolveAutomationState | undefined): DigivolveAutomationState {
  return loaded ?? { enabled: false, preferences: {} };
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
      inventory,
      areaProgress,
      compendium,
      automation,
    })
  );
}

function applySlotToLiveState(data: SaveSlotData): void {
  Object.assign(currency, data.currency);
  const normalizedTeam = normalizeTeam(data.team);
  Object.assign(team, normalizedTeam);
  combat.wild = data.wild
    ? {
        ...data.wild,
        lastTickAt: Date.now(),
        attackProgress: data.wild.attackProgress ?? 0,
        // Saves made before the fight timer existed have neither field -
        // resume as if the encounter just started, with a real timer
        // computed from the current (already-normalized) team's HP.
        spawnedAt: data.wild.spawnedAt ?? Date.now(),
        timeLimitMs: data.wild.timeLimitMs ?? computeFightTimeLimitMs(computeTeamHp(normalizedTeam.activeMembers)),
      }
    : null;
  combat.damagePopup = null;
  Object.assign(inventory, normalizeInventory(data.inventory));
  Object.assign(areaProgress, normalizeAreaProgress(data.areaProgress));
  // Overwrite (not merge) - normalizeCompendium already returns either the
  // loaded record as-is or a full backfill, never a partial one.
  for (const key of Object.keys(compendium)) delete compendium[key];
  Object.assign(compendium, normalizeCompendium(data.compendium, normalizedTeam));

  // preferences has the same dynamic/unbounded key set as compendium -
  // clear stale entries from whichever slot was previously live before
  // assigning the newly loaded ones.
  const normalizedAutomation = normalizeAutomation(data.automation);
  for (const key of Object.keys(automation.preferences)) delete automation.preferences[key];
  Object.assign(automation.preferences, normalizedAutomation.preferences);
  automation.enabled = normalizedAutomation.enabled;
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
    // inventory/areaProgress are optional (backward compat with saves made
    // before those systems existed, backfilled by normalizeInventory/
    // normalizeAreaProgress) - only reject one if present but malformed.
    (data.inventory === undefined || (typeof data.inventory === 'object' && data.inventory !== null)) &&
    (data.areaProgress === undefined || (typeof data.areaProgress === 'object' && data.areaProgress !== null)) &&
    (data.compendium === undefined || (typeof data.compendium === 'object' && data.compendium !== null)) &&
    (data.automation === undefined || (typeof data.automation === 'object' && data.automation !== null))
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
