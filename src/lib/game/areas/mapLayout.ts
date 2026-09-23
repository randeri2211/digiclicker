import type { AreaData, RegionData, RegionMapArea } from '../types';
import { getArea } from './areaRegistry';

export interface MapPoint {
  x: number;
  y: number;
}

// Sideways gap between sibling paths (a fork) at the same step of a route.
const FORK_SPREAD = 26;

/** Each path's step from the area's startingPath - how many same-area
 * unlocks it takes to reach it (breadth-first, so the shortest chain). */
function pathDepths(area: AreaData): Map<string, number> {
  const depths = new Map([[area.startingPath, 0]]);
  const queue = [area.startingPath];
  while (queue.length > 0) {
    const pathId = queue.shift()!;
    for (const ref of area.paths[pathId]?.unlocks ?? []) {
      if (ref.includes(':') || depths.has(ref) || !area.paths[ref]) continue;
      depths.set(ref, depths.get(pathId)! + 1);
      queue.push(ref);
    }
  }
  return depths;
}

/**
 * Where every built area's path nodes sit on a region map, keyed
 * "areaId:pathId". PokeClicker-style, an area's paths are the road out of
 * it: laid along its first outgoing route (the first `routes` pair it
 * starts), from just inside its own land to just before the next area's
 * shore - so the last path (usually the boss) guards the way on. Forks
 * spread sideways. An area with no route out (the map's last) lays its
 * paths across its own land instead. A path's explicit `map` wins.
 */
export function layoutPathNodes(region: RegionData): Map<string, MapPoint> {
  const byId = new Map(region.areas.map((mapArea) => [mapArea.id, mapArea]));
  const points = new Map<string, MapPoint>();

  for (const mapArea of region.areas) {
    const area = getArea(mapArea.id);
    if (!area) continue;

    const route = region.routes.find(([from]) => from === mapArea.id);
    const next = route ? byId.get(route[1]) : undefined;
    const [start, end] = next ? roadEnds(mapArea, next) : acrossLand(mapArea);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const normal = { x: -dy / length, y: dx / length };

    const depths = pathDepths(area);
    const steps = Math.max(...depths.values());
    const siblings = new Map<number, string[]>();
    for (const [pathId, depth] of depths) siblings.set(depth, [...(siblings.get(depth) ?? []), pathId]);

    for (const [pathId, depth] of depths) {
      const own = area.paths[pathId].map;
      if (own) {
        points.set(`${mapArea.id}:${pathId}`, own);
        continue;
      }
      const t = steps === 0 ? 0.5 : depth / steps;
      const group = siblings.get(depth)!;
      const offset = (group.indexOf(pathId) - (group.length - 1) / 2) * FORK_SPREAD;
      points.set(`${mapArea.id}:${pathId}`, {
        x: start.x + dx * t + normal.x * offset,
        y: start.y + dy * t + normal.y * offset,
      });
    }
  }
  return points;
}

// From a little inside the area toward the next one, stopping at its shore.
function roadEnds(from: RegionMapArea, to: RegionMapArea): [MapPoint, MapPoint] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const startAt = from.r * 0.1;
  // The drawn shore reaches ~1.15-1.3x the radius (see RegionMap), so stop
  // past it, on the land bridge.
  const endAt = Math.max(startAt, length - to.r * 1.35);
  return [
    { x: from.x + (dx / length) * startAt, y: from.y + (dy / length) * startAt },
    { x: from.x + (dx / length) * endAt, y: from.y + (dy / length) * endAt },
  ];
}

// The map's last area: a line across its middle.
function acrossLand(area: RegionMapArea): [MapPoint, MapPoint] {
  return [
    { x: area.x - area.r * 0.55, y: area.y + area.r * 0.15 },
    { x: area.x + area.r * 0.55, y: area.y + area.r * 0.15 },
  ];
}
