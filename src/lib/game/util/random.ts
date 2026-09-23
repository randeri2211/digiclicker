/**
 * Weighted-random pick from a list of entries. Falls back to the last
 * entry on the (floating-point-edge-case) chance the loop exits without
 * picking - never returns undefined for a non-empty list.
 */
export function weightedPick<T>(entries: T[], weightOf: (entry: T) => number): T {
  const totalWeight = entries.reduce((sum, entry) => sum + weightOf(entry), 0);
  let roll = Math.random() * totalWeight;
  for (const entry of entries) {
    roll -= weightOf(entry);
    if (roll <= 0) return entry;
  }
  return entries[entries.length - 1];
}
