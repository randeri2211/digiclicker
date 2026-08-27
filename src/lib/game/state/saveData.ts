import type { CurrencyState, TeamState, WildSpawnState } from '../types';

export const CURRENT_SAVE_VERSION = 1;
export const SAVE_KEY = 'digiclicker-saves-v1';

export interface SpawnProgressData {
  spawnIndex: number;
  nextLevel: number;
}

export interface SaveSlotData {
  currency: CurrencyState;
  team: TeamState;
  wild: WildSpawnState | null;
  spawnProgress: SpawnProgressData;
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
