import type {
  AreaProgressState,
  CurrencyState,
  DigivolveAutomationState,
  ExpeditionState,
  ProgressState,
  HatcheryState,
  InventoryState,
  RosterState,
  WildSpawnState,
} from '../types';

// v2 = one-entry-per-species roster (replaced v1's active/training/reserve
// team). v1 saves stay untouched under their own key - never read, never
// deleted - so a converter could still be written later if wanted.
export const CURRENT_SAVE_VERSION = 2;
export const SAVE_KEY = 'digiclicker-saves-v2';

export interface SaveSlotData {
  currency: CurrencyState;
  roster: RosterState;
  hatchery: HatcheryState;
  wild: WildSpawnState | null;
  /** normalizeInventory in persistence.svelte.ts backfills any ITEM_CATALOG
   * entry missing from it (items added after the save was made). */
  inventory: InventoryState;
  /** normalizeAreaProgress in persistence.svelte.ts falls back to the
   * starting area/path if the saved activePathId no longer resolves
   * against current area data. */
  areaProgress: AreaProgressState;
  automation: DigivolveAutomationState;
  /** Optional for saves made before expeditions existed - defaults to
   * none running. */
  expeditions?: ExpeditionState;
  /** Optional for saves made before quests existed - no flags, nothing
   * completed. */
  progress?: ProgressState;
}

export interface SaveSlot {
  id: string;
  name: string;
  savedAt: number;
  data: SaveSlotData;
}

export interface SaveFile {
  version: number;
  slots: SaveSlot[];
}

function emptySaveFile(): SaveFile {
  return { version: CURRENT_SAVE_VERSION, slots: [] };
}

let cached: SaveFile | undefined;

/**
 * Reads/parses/validates the save file from localStorage, memoized after
 * the first call. Any failure - storage unavailable, corrupted JSON, wrong
 * shape, wrong version - falls back to an empty save file rather than
 * throwing or partially recovering.
 */
export function loadSaveFile(): SaveFile {
  if (cached) return cached;

  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      cached = emptySaveFile();
      return cached;
    }

    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      parsed.version !== CURRENT_SAVE_VERSION ||
      !Array.isArray(parsed.slots)
    ) {
      cached = emptySaveFile();
      return cached;
    }

    cached = parsed as SaveFile;
    return cached;
  } catch {
    cached = emptySaveFile();
    return cached;
  }
}

export function writeSaveFile(file: SaveFile): void {
  cached = file;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(file));
  } catch {
    // Storage unavailable/full/disabled - silently drop the write rather
    // than crash the game. The in-memory cache still reflects the change
    // for this session even if it couldn't persist.
  }
}
