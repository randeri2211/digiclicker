import type { MapTerrain } from '../../game/types';

// Land colours for the code-drawn map (used until a region has background
// art). Muted so the cyan HUD routes and nodes stay the brightest thing.
export const TERRAIN_COLOR: Record<MapTerrain, string> = {
  forest: '#1d4a33',
  savanna: '#57491f',
  mountain: '#4a3a30',
  snow: '#5f7888',
  town: '#34404e',
  lake: '#1b4a68',
  ruins: '#524834',
  desert: '#66512c',
  dark: '#3a2346',
  volcano: '#5a261b',
  sky: '#2d4c70',
  digital: '#1a3d4c',
};

// Deterministic 0..1 noise from a string, so every area keeps the same
// outline on every render and every machine.
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** An irregular closed blob (an SVG path `d`) around (x, y) - the land of
 * one area. The wobble is fixed per `seed`; `scale` grows it evenly, which
 * is how the island's shore is drawn as a slightly bigger copy. */
export function blobPath(seed: string, x: number, y: number, r: number, scale = 1): string {
  const random = seededRandom(seed);
  const count = 12;
  const points = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const radius = r * scale * (0.8 + random() * 0.32);
    return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius];
  });
  // Quadratic curves through the midpoints of consecutive points - a smooth
  // outline that still passes near every sampled radius.
  const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(points[count - 1], points[0]);
  let d = `M${start[0].toFixed(1)},${start[1].toFixed(1)}`;
  for (let i = 0; i < count; i++) {
    const control = points[i];
    const end = mid(points[i], points[(i + 1) % count]);
    d += ` Q${control[0].toFixed(1)},${control[1].toFixed(1)} ${end[0].toFixed(1)},${end[1].toFixed(1)}`;
  }
  return d + ' Z';
}
