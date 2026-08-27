import { loadSaveFile, writeSaveFile } from './saveData';
import type { SaveSlot, SaveSlotData } from './saveData';
import { createStarterTeam } from '../roster/starterRoster';

function freshSlotData(): SaveSlotData {
  return {
    currency: { bits: 0, data: 0 },
    team: createStarterTeam(),
    wild: null,
    spawnProgress: { spawnIndex: 0, nextLevel: 1 },
  };
}

function defaultSlotName(): string {
  return `New Save — ${new Date().toLocaleDateString()}`;
}

export function listSlots(): SaveSlot[] {
  return loadSaveFile().slots;
}

export function getSlot(id: string): SaveSlot | undefined {
  return loadSaveFile().slots.find((slot) => slot.id === id);
}

export function createSlot(name?: string, data: SaveSlotData = freshSlotData()): SaveSlot {
  const file = loadSaveFile();
  const slot: SaveSlot = {
    id: crypto.randomUUID(),
    name: name ?? defaultSlotName(),
    savedAt: Date.now(),
    data,
  };
  writeSaveFile({ ...file, slots: [...file.slots, slot] });
  return slot;
}

export function updateSlot(id: string, data: SaveSlotData): void {
  const file = loadSaveFile();
  const slots = file.slots.map((slot) => (slot.id === id ? { ...slot, data, savedAt: Date.now() } : slot));
  writeSaveFile({ ...file, slots });
}

export function deleteSlot(id: string): void {
  const file = loadSaveFile();
  writeSaveFile({ ...file, slots: file.slots.filter((slot) => slot.id !== id) });
}
