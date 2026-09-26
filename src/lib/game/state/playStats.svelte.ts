// Running totals for recaps (the end-of-act screen): time actually played
// vs. time the team fought while the player was away, wild Digimon
// defeated and eggs hatched. Saved with the game; saves from before these
// existed start counting when loaded (`trackedSince`).

export interface PlayStats {
  /** Time the game ticked with the player there (ms). */
  onlineMs: number;
  /** Time fast-forwarded while away - game closed or tab hidden (ms). */
  offlineMs: number;
  wildKills: number;
  eggsHatched: number;
  /** When counting began - the save's start, or when an older save first
   * loaded with these stats. */
  trackedSince: number;
  /** True when counting began mid-save (older saves) - recaps say so. */
  partial: boolean;
}

export const playStats: PlayStats = $state({ onlineMs: 0, offlineMs: 0, wildKills: 0, eggsHatched: 0, trackedSince: 0, partial: false });

export function applyPlayStats(saved: PlayStats | undefined, isNewGame: boolean, now: number = Date.now()): void {
  Object.assign(
    playStats,
    saved ?? { onlineMs: 0, offlineMs: 0, wildKills: 0, eggsHatched: 0, trackedSince: now, partial: !isNewGame },
  );
}

export function snapshotPlayStats(): PlayStats {
  return { ...playStats };
}
