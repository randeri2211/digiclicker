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
  /** Optional for saves made before partners existed - none. */
  partners?: string[];
  /** Optional: when this save was last exported (backup reminder). */
  backupReminder?: { lastExportAt: number; snoozedUntil: number; off: boolean };
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

// ---- Keeping saves safe ------------------------------------------------
// Saves live only in this browser, so nothing here may ever throw away data
// it can't read: an unreadable file (or slot) is set aside under its own key
// before anything else is written, a rolling backup of the last good file
// is kept, and a failed write is reported instead of silently dropped.

/** Unreadable data is copied to `${UNREADABLE_KEY_PREFIX}<timestamp>`. */
export const UNREADABLE_KEY_PREFIX = `${SAVE_KEY}-unreadable-`;
/** The last good save file, refreshed at most every BACKUP_INTERVAL_MS. */
export const BACKUP_KEY = `${SAVE_KEY}-backup`;
const BACKUP_INTERVAL_MS = 10 * 60_000;

/** What happened when the save file was read - for the main menu notice. */
export interface SaveFileProblem {
  /** Why the file (or some slots) couldn't be used. */
  reason: string;
  /** Where the untouched original was kept (null if even that failed). */
  keptAs: string | null;
  /** The automatic backup was used instead. */
  restoredFromBackup: boolean;
  /** Slots that were set aside (the rest loaded normally). */
  droppedSlots: number;
}

let cached: SaveFile | undefined;
let problem: SaveFileProblem | null = null;
// Nothing is written while the original couldn't be set aside - better to
// lose this session's progress than the player's old save.
let writesBlocked = false;
let lastBackupAt = 0;

/** A slot is usable if it has an id and data of the expected shape. */
export function isValidSlotData(value: unknown): value is SaveSlotData {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Record<string, unknown>;
  const isObject = (v: unknown) => typeof v === 'object' && v !== null;
  return (
    isObject(data.currency) &&
    isObject(data.roster) &&
    isObject(data.hatchery) &&
    isObject(data.inventory) &&
    isObject(data.areaProgress) &&
    isObject(data.automation)
  );
}

function isValidSlot(value: unknown): value is SaveSlot {
  if (typeof value !== 'object' || value === null) return false;
  const slot = value as Record<string, unknown>;
  return typeof slot.id === 'string' && typeof slot.name === 'string' && isValidSlotData(slot.data);
}

/** Copies `raw` aside; returns the key, or null if storage refused. */
function keepAside(raw: string): string | null {
  const key = `${UNREADABLE_KEY_PREFIX}${Date.now()}`;
  try {
    localStorage.setItem(key, raw);
    return key;
  } catch {
    return null;
  }
}

/** A stored file's usable part: null if the file itself is unusable, else
 * the file with only its valid slots (and how many were dropped). */
function parseSaveFile(raw: string): { file: SaveFile; dropped: number } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'the save data is corrupted' };
  }
  if (typeof parsed !== 'object' || parsed === null || !Array.isArray((parsed as SaveFile).slots)) {
    return { error: 'the save data is in an unknown format' };
  }
  const version = (parsed as SaveFile).version;
  if (version !== CURRENT_SAVE_VERSION) {
    return { error: `the save data is from a different game version (${String(version)})` };
  }
  const slots = (parsed as SaveFile).slots;
  const valid = slots.filter(isValidSlot);
  return { file: { version: CURRENT_SAVE_VERSION, slots: valid }, dropped: slots.length - valid.length };
}

/**
 * Reads the save file from localStorage, memoized after the first call.
 * Never loses data: if the file is unreadable it's kept aside (see
 * UNREADABLE_KEY_PREFIX) and the automatic backup is tried; slots that
 * can't be used are set aside while the rest load. getSaveFileProblem()
 * says what happened.
 */
export function loadSaveFile(): SaveFile {
  if (cached) return cached;

  let raw: string | null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    // Storage unavailable (e.g. blocked) - play without saving.
    writesBlocked = true;
    cached = emptySaveFile();
    return cached;
  }
  if (!raw) {
    cached = emptySaveFile();
    return cached;
  }

  const result = parseSaveFile(raw);
  if ('file' in result) {
    cached = result.file;
    if (result.dropped > 0) {
      const keptAs = keepAside(raw);
      if (!keptAs) writesBlocked = true;
      problem = { reason: `${result.dropped} save slot(s) couldn't be read`, keptAs, restoredFromBackup: false, droppedSlots: result.dropped };
    }
    return cached;
  }

  // The whole file is unusable: keep it, then fall back to the backup.
  const keptAs = keepAside(raw);
  if (!keptAs) writesBlocked = true;
  let backup: SaveFile | null = null;
  try {
    const backupRaw = localStorage.getItem(BACKUP_KEY);
    const parsedBackup = backupRaw ? parseSaveFile(backupRaw) : null;
    if (parsedBackup && 'file' in parsedBackup) backup = parsedBackup.file;
  } catch {
    // no backup available
  }
  problem = { reason: result.error, keptAs, restoredFromBackup: backup !== null, droppedSlots: 0 };
  cached = backup ?? emptySaveFile();
  return cached;
}

export function getSaveFileProblem(): SaveFileProblem | null {
  return problem;
}

export function dismissSaveFileProblem(): void {
  problem = null;
}

/** Forget the memoized file - another tab changed it (see persistence). */
export function invalidateSaveFileCache(): void {
  cached = undefined;
}

/** Writes the file; false if it couldn't be stored (storage full, blocked,
 * or writes paused because an unreadable original couldn't be kept). */
export function writeSaveFile(file: SaveFile): boolean {
  cached = file;
  if (writesBlocked) return false;
  try {
    // Before overwriting, keep the previous good file as the backup
    // (at most every BACKUP_INTERVAL_MS).
    if (Date.now() - lastBackupAt > BACKUP_INTERVAL_MS) {
      const previous = localStorage.getItem(SAVE_KEY);
      if (previous && 'file' in parseSaveFile(previous)) localStorage.setItem(BACKUP_KEY, previous);
      lastBackupAt = Date.now();
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(file));
    return true;
  } catch {
    // Storage full/disabled - the caller tells the player; the in-memory
    // copy still holds this session's progress.
    return false;
  }
}

/** Test hook: forget everything memoized (as a page reload would). */
export function resetSaveFileStateForTests(): void {
  cached = undefined;
  problem = null;
  writesBlocked = false;
  lastBackupAt = 0;
}
