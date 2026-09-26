import { currency } from './currency.svelte';
import { roster } from './roster.svelte';
import { hatchery } from './hatchery.svelte';
import { combat } from './combat.svelte';
import { inventory } from './inventory.svelte';
import { areaProgress } from './areaProgress.svelte';
import { automation } from './digivolveAutomation.svelte';
import { expeditions, updateExpeditions } from './expeditions.svelte';
import { progress } from './progress.svelte';
import { resetQuestWatch } from '../quests/quests';
import { resetResidentWatch } from '../village/village';
import { catchUpSinceSave, dismissOfflineReport } from './offline.svelte';
import { partners } from './partners.svelte';
import { applyBackupReminder, snapshotBackupReminder, markExported } from './backupReminder.svelte';
import { applyPlayStats, snapshotPlayStats } from './playStats.svelte';
import { actScreen } from './actScreen.svelte';
import { createSlot, updateSlot, getSlot, deleteSlot as deleteSlotFromStorage, listSlots } from './slots';
import type { SaveSlot, SaveSlotData } from './saveData';
import { SAVE_KEY, isValidSlotData, invalidateSaveFileCache } from './saveData';
import { pushToast } from './notifications.svelte';
import type { AreaProgressState, InventoryState, RosterState } from '../types';
import { AUTOSAVE_INTERVAL_MS } from '../constants';
import { ITEM_CATALOG } from '../items/itemCatalog';
import { getAbility, rollAbility } from '../abilities/abilityCatalog';
import { initialAreaProgress, reapplyEarnedUnlocks } from '../areas/areaProgress';
import { getPath } from '../areas/areaRegistry';

export const activeSlot: { id: string | null } = $state({ id: null });

/** `takenOver`: another tab saved this same game, so this tab stopped
 * saving (it would overwrite newer progress) - App shows a banner. */
export const saveSession: { takenOver: boolean } = $state({ takenOver: false });
// When this tab last saved the active slot, to tell our writes from others'.
let lastOwnSaveAt = 0;
let saveFailureShown = false;

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
// dangling reference. Saves made before bosses existed lack
// bossesDefeated - nothing beaten. Earned unlocks are re-applied from the
// current area data, so new content behind an old win still opens.
function normalizeAreaProgress(loaded: AreaProgressState): AreaProgressState {
  if (!getPath(loaded.activeAreaId, loaded.activePathId)) return initialAreaProgress();
  const normalized = { ...loaded, bossesDefeated: loaded.bossesDefeated ?? [] };
  reapplyEarnedUnlocks(normalized);
  return normalized;
}

// XP that isn't a finite number (a corrupted entry - JSON turns Infinity
// into null) restarts at 0 rather than breaking every level lookup.
// v2 saves made before inheritedFromLevel existed lack it - 0 means "never
// digivolved into", which is exactly right for them (any upgrade shows as
// an improvement over "no level recorded").
// Special abilities: an entry without a known one (saves from before
// abilities were rolled for everyone, or the old stat-boost ids) rolls a
// fresh one; a pending reroll offer with unknown ids is dropped.
function normalizeRoster(loaded: RosterState): RosterState {
  return Object.fromEntries(
    Object.entries(loaded).map(([id, entry]) => [
      id,
      {
        ...entry,
        xp: Number.isFinite(entry.xp) ? entry.xp : 0,
        inheritedFromLevel: entry.inheritedFromLevel ?? 0,
        abilityId: getAbility(entry.abilityId) ? entry.abilityId : rollAbility(),
        abilityRerolls: entry.abilityRerolls ?? 0,
        abilityOffer: entry.abilityOffer?.every((a) => getAbility(a)) ? entry.abilityOffer : null,
      },
    ])
  );
}

// The Ability Reroll Crystal was removed (rerolls are a village service
// now) - any a save still holds are refunded at their old Shop price.
const REMOVED_CRYSTAL_REFUND_BITS = 400;

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
      // A boss fight in progress isn't saved - after a reload the player is
      // back in normal combat and can simply start the boss again.
      wild: combat.boss ? null : combat.wild,
      inventory,
      areaProgress,
      automation,
      expeditions,
      progress,
      partners: partners.ids,
      backupReminder: snapshotBackupReminder(),
      playStats: snapshotPlayStats(),
    })
  );
}

function applySlotToLiveState(data: SaveSlotData): void {
  Object.assign(currency, data.currency);
  const crystals = (data.inventory as Record<string, number>)['ability-reroll-crystal'] ?? 0;
  if (crystals > 0) currency.bits += crystals * REMOVED_CRYSTAL_REFUND_BITS;
  replaceRecord(roster, normalizeRoster(data.roster));
  Object.assign(hatchery, data.hatchery);
  // Normal wild fights are untimed - saves from when every fight had a
  // timer get theirs dropped.
  combat.wild = data.wild ? { ...data.wild, lastTickAt: Date.now(), timeLimitMs: null } : null;
  combat.boss = null;
  combat.lastBossResult = null;
  combat.damagePopup = null;
  Object.assign(inventory, normalizeInventory(data.inventory));
  Object.assign(areaProgress, normalizeAreaProgress(data.areaProgress));
  replaceRecord(automation.preferences, data.automation.preferences);
  automation.enabled = data.automation.enabled;
  // Parties whose time ran out while the game was closed are back now.
  expeditions.active = data.expeditions?.active ?? [];
  expeditions.lastHaul = null;
  updateExpeditions();
  replaceRecord(progress.flags, data.progress?.flags ?? {});
  progress.completedQuests = data.progress?.completedQuests ?? [];
  // Only Digimon still owned (and within today's slot count).
  partners.ids = (data.partners ?? []).filter((id) => roster[id]);
  applyBackupReminder(data.backupReminder);
  applyPlayStats(data.playStats, false);
  actScreen.actId = null;
  // Quests already ready in this save shouldn't all announce themselves.
  resetQuestWatch();
  resetResidentWatch();
}

/** All or nothing: if the slot's data can't be applied, the game goes back
 * to what it had and nothing is saved over the slot. False on failure. */
export function loadSlotIntoLiveState(slotId: string): boolean {
  const slot = getSlot(slotId);
  if (!slot || !isValidSlotData(slot.data)) return false;
  const before = snapshotLiveState();
  try {
    applySlotToLiveState(slot.data);
  } catch (error) {
    console.error('Could not load save slot', slotId, error);
    applySlotToLiveState(before);
    return false;
  }
  activeSlot.id = slotId;
  saveSession.takenOver = false;
  lastOwnSaveAt = slot.savedAt;
  // The game was closed since this save was written - fight that time now.
  catchUpSinceSave(slot.savedAt);
  return true;
}

export function startNewGameInSlot(name?: string): void {
  const slot = createSlot(name);
  applySlotToLiveState(slot.data);
  activeSlot.id = slot.id;
  saveSession.takenOver = false;
  lastOwnSaveAt = slot.savedAt;
  dismissOfflineReport();
}

export function saveGame(): void {
  if (!activeSlot.id || saveSession.takenOver) return;
  const saved = updateSlot(activeSlot.id, snapshotLiveState());
  if (saved) {
    lastOwnSaveAt = Date.now();
    saveFailureShown = false;
  } else if (!saveFailureShown) {
    // Once per failure streak, not every autosave.
    saveFailureShown = true;
    pushToast("Couldn't save", 'Browser storage is full or blocked - use Export on the main menu to keep a copy.');
  }
}

// Another tab wrote the save file. If it saved the game this tab is
// playing, this tab's progress is now older - stop saving here rather
// than overwrite it. (The storage event only fires in OTHER tabs.)
function onStorage(event: StorageEvent) {
  if (event.key !== SAVE_KEY) return;
  invalidateSaveFileCache();
  if (!activeSlot.id || !event.newValue) return;
  try {
    const slot = JSON.parse(event.newValue).slots?.find((s: SaveSlot) => s.id === activeSlot.id);
    if (slot && slot.savedAt > lastOwnSaveAt) saveSession.takenOver = true;
  } catch {
    // unreadable - leave it to the next load to deal with
  }
}

export function deleteSlot(id: string): void {
  deleteSlotFromStorage(id);
  if (activeSlot.id === id) {
    activeSlot.id = null;
  }
}

export function exportSlotToFile(id: string): void {
  // The game being played: record the export and save first, so the file
  // is current (and the backup reminder resets).
  if (id === activeSlot.id) {
    markExported();
    saveGame();
  }
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
  window.addEventListener('storage', onStorage);
}

export function stopAutosave(): void {
  if (autosaveIntervalId === null) return;
  clearInterval(autosaveIntervalId);
  autosaveIntervalId = null;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('storage', onStorage);
  window.removeEventListener('pagehide', onPageHide);
}
