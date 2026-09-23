import { combat, fastForwardWildCombat } from './combat.svelte';
import { currency } from './currency.svelte';
import { roster } from './roster.svelte';
import { hatchery } from './hatchery.svelte';
import { areaProgress } from './areaProgress.svelte';
import { levelForXp } from '../combat/levelCurve';
import { OFFLINE_PROGRESS_CAP_HOURS, OFFLINE_PROGRESS_EFFICIENCY } from '../constants';

/** What happened while the game wasn't ticking - shown as "welcome back". */
export interface OfflineReport {
  /** Real time away. */
  awayMs: number;
  /** Time actually fought (capped, times efficiency). */
  countedMs: number;
  capped: boolean;
  kills: number;
  bits: number;
  eggs: number;
  /** Existing Digimon that levelled up: level before -> after. */
  levelUps: Record<string, { from: number; to: number }>;
  /** Digimon that joined the roster (auto-digivolves) while away. */
  newDigimon: string[];
  /** "areaId:pathId" of paths opened by mastery while away. */
  newPaths: string[];
}

// Away time shorter than this is caught up silently, with no report.
const REPORT_MIN_AWAY_MS = 60_000;

export const offline: { report: OfflineReport | null } = $state({ report: null });

// Catch-ups while the tab is hidden collect here, and become the report
// once the player is looking again (see flushPendingReport).
let pending: OfflineReport | null = null;

function unlockedKeys(): Set<string> {
  return new Set(
    Object.entries(areaProgress.unlockedPaths).flatMap(([areaId, paths]) => paths.map((pathId) => `${areaId}:${pathId}`)),
  );
}

/** Fast-forwards `awayMs` of play (capped and scaled) and reports what it
 * earned. Nothing is fought during a boss fight - the boss timer runs on
 * real time, so that fight simply resolves on the next tick. */
export function catchUp(awayMs: number, now: number = Date.now()): OfflineReport {
  const capMs = OFFLINE_PROGRESS_CAP_HOURS * 3_600_000;
  const countedMs = Math.min(awayMs, capMs) * OFFLINE_PROGRESS_EFFICIENCY;

  const bitsBefore = currency.bits;
  const eggsBefore = hatchery.incubating.length + hatchery.stored.length;
  const levelsBefore = Object.fromEntries(Object.values(roster).map((e) => [e.speciesId, levelForXp(e.xp)]));
  const pathsBefore = unlockedKeys();

  const kills = combat.boss ? 0 : fastForwardWildCombat(countedMs, now);

  const levelUps: OfflineReport['levelUps'] = {};
  const newDigimon: string[] = [];
  for (const entry of Object.values(roster)) {
    const before = levelsBefore[entry.speciesId];
    const after = levelForXp(entry.xp);
    if (before === undefined) newDigimon.push(entry.speciesId);
    else if (after > before) levelUps[entry.speciesId] = { from: before, to: after };
  }
  return {
    awayMs,
    countedMs,
    capped: awayMs > capMs,
    kills,
    bits: currency.bits - bitsBefore,
    // Eggs only ever arrive during a catch-up (hatching needs the player).
    eggs: Math.max(0, hatchery.incubating.length + hatchery.stored.length - eggsBefore),
    levelUps,
    newDigimon,
    newPaths: [...unlockedKeys()].filter((key) => !pathsBefore.has(key)),
  };
}

function merge(a: OfflineReport, b: OfflineReport): OfflineReport {
  const levelUps = { ...a.levelUps };
  for (const [id, change] of Object.entries(b.levelUps)) {
    levelUps[id] = { from: levelUps[id]?.from ?? change.from, to: change.to };
  }
  return {
    awayMs: a.awayMs + b.awayMs,
    countedMs: a.countedMs + b.countedMs,
    capped: a.capped || b.capped,
    kills: a.kills + b.kills,
    bits: a.bits + b.bits,
    eggs: a.eggs + b.eggs,
    levelUps,
    newDigimon: [...a.newDigimon, ...b.newDigimon],
    newPaths: [...a.newPaths, ...b.newPaths],
  };
}

/** Catch up a gap and hold it until the player can see the report. */
export function catchUpGap(awayMs: number, now: number = Date.now()): void {
  const report = catchUp(awayMs, now);
  pending = pending ? merge(pending, report) : report;
}

/** Shows what collected while hidden (if it was long enough to mention). */
export function flushPendingReport(): void {
  if (!pending) return;
  if (pending.awayMs >= REPORT_MIN_AWAY_MS) {
    offline.report = offline.report ? merge(offline.report, pending) : pending;
  }
  pending = null;
}

/** Catch up the time since a save was written, and report it. */
export function catchUpSinceSave(savedAt: number, now: number = Date.now()): void {
  pending = null;
  const awayMs = now - savedAt;
  if (awayMs <= 0) return;
  const report = catchUp(awayMs, now);
  offline.report = awayMs >= REPORT_MIN_AWAY_MS ? report : null;
}

export function dismissOfflineReport(): void {
  offline.report = null;
}
