import type { CombatState, Stage } from '../types';
import { getRosterList } from './roster.svelte';
import { addEgg } from './hatchery.svelte';
import { currency } from './currency.svelte';
import { computeClickDamage, computeAttacksPerSecond, computeRosterDamagePerHit, computeRosterHp } from '../combat/damage';
import { pickNextWildSpawn, spawnDebugWild, computeKillXp, computeKillBits } from '../combat/spawn';
import { awardKillXp } from '../combat/xp';
import { rollEggDrop } from '../eggs/eggs';
import { areaProgress } from './areaProgress.svelte';
import { getActivePath, recordActivePathKill } from '../areas/areaProgress';

export const combat: CombatState = $state({ wild: null, damagePopup: null });

// DEBUG: while enabled, every spawn (including the ones tick() picks after
// a kill) uses this stage+level instead of the normal WILD_SPAWN_POOL
// progression - set-and-forget, no per-spawn click needed. See
// DebugSpawnPanel.svelte.
export const debugSpawn: { enabled: boolean; stage: Stage; level: number } = $state({
  enabled: false,
  stage: 'Rookie',
  level: 1,
});

let popupCounter = 0;

function showDamagePopup(amount: number) {
  popupCounter += 1;
  combat.damagePopup = { amount, id: popupCounter };
}

// Both a tick and a click can independently bring HP to 0, so this is the
// single shared kill-resolution path - clearing combat.wild first prevents
// a click landing alongside a tick from double-awarding the same kill.
function resolveKill(wild: NonNullable<CombatState['wild']>) {
  combat.wild = null;

  const xpValue = computeKillXp(wild.level);
  const bitsValue = computeKillBits(wild.level);

  awardKillXp(xpValue);
  currency.bits += bitsValue;
  recordActivePathKill(areaProgress);

  const egg = rollEggDrop(wild.speciesId);
  if (egg) addEgg(egg);
}

export function handleClick() {
  const wild = combat.wild;
  if (!wild) return;

  const damage = computeClickDamage(getRosterList());
  wild.currentHp = Math.max(0, wild.currentHp - damage);
  showDamagePopup(damage);

  if (wild.currentHp <= 0) {
    resolveKill(wild);
  }
}

// DEBUG: immediately replaces the current wild with one matching the live
// debugSpawn settings - called whenever the panel's enabled/stage/level
// changes, and by tick() below whenever a new spawn is due.
export function applyDebugSpawn(now: number = Date.now()): void {
  if (!debugSpawn.enabled) return;
  const wild = spawnDebugWild(now, debugSpawn.stage, debugSpawn.level, computeRosterHp(getRosterList()));
  if (wild) combat.wild = wild;
}

export function tick(now: number) {
  const wild = combat.wild;
  if (!wild) {
    const rosterHp = computeRosterHp(getRosterList());
    combat.wild = debugSpawn.enabled ? spawnDebugWild(now, debugSpawn.stage, debugSpawn.level, rosterHp) : null;
    if (!combat.wild) {
      const activePath = getActivePath(areaProgress);
      if (activePath) combat.wild = pickNextWildSpawn(now, activePath, rosterHp);
    }
    return;
  }

  const elapsedSeconds = (now - wild.lastTickAt) / 1000;
  const rosterList = getRosterList();
  const attacksPerSecond = computeAttacksPerSecond(rosterList);

  // Discrete attack ticks, not a smooth drain: roster Speed sets how many
  // whole attacks land per second, each dealing the roster's flat
  // Attack+SpecialAttack total. Fractional progress toward the next attack
  // carries over in wild.attackProgress instead of being dropped, so the
  // long-run rate still averages out to attacksPerSecond * damagePerHit
  // regardless of how choppy the tick loop's own polling interval is.
  wild.attackProgress += attacksPerSecond * elapsedSeconds;
  const hits = Math.floor(wild.attackProgress);
  if (hits > 0) {
    wild.attackProgress -= hits;
    const damagePerHit = computeRosterDamagePerHit(rosterList);
    wild.currentHp = Math.max(0, wild.currentHp - hits * damagePerHit);
  }
  wild.lastTickAt = now;

  if (wild.currentHp <= 0) {
    resolveKill(wild);
    return;
  }

  // Timed out before being defeated - no reward, mirrors how resolveKill
  // clears combat.wild before granting rewards. The next tick()'s !wild
  // branch spawns a fresh wild, same respawn gap as after a normal kill.
  if (now >= wild.spawnedAt + wild.timeLimitMs) {
    combat.wild = null;
  }
}
