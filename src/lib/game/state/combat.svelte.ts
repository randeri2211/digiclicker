import type { CombatState } from '../types';
import { team } from './team.svelte';
import { currency } from './currency.svelte';
import { computeClickDamage, computeAttacksPerSecond, computeTeamDamagePerHit } from '../combat/damage';
import { pickNextWildSpawn, computeKillXp, computeKillBits } from '../combat/spawn';
import { awardKillXp } from '../combat/xp';

export const combat: CombatState = $state({ wild: null, damagePopup: null });

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

  awardKillXp(xpValue, team);
  currency.bits += bitsValue;
}

export function handleClick() {
  const wild = combat.wild;
  if (!wild) return;

  const damage = computeClickDamage();
  wild.currentHp = Math.max(0, wild.currentHp - damage);
  showDamagePopup(damage);

  if (wild.currentHp <= 0) {
    resolveKill(wild);
  }
}

export function tick(now: number) {
  const wild = combat.wild;
  if (!wild) {
    combat.wild = pickNextWildSpawn(now);
    return;
  }

  const elapsedSeconds = (now - wild.lastTickAt) / 1000;
  const attacksPerSecond = computeAttacksPerSecond(team.activeMembers);

  // Discrete attack ticks, not a smooth drain: team Speed sets how many
  // whole attacks land per second, each dealing the team's flat
  // Attack+SpecialAttack total. Fractional progress toward the next attack
  // carries over in wild.attackProgress instead of being dropped, so the
  // long-run rate still averages out to attacksPerSecond * damagePerHit
  // regardless of how choppy the tick loop's own polling interval is.
  wild.attackProgress += attacksPerSecond * elapsedSeconds;
  const hits = Math.floor(wild.attackProgress);
  if (hits > 0) {
    wild.attackProgress -= hits;
    const damagePerHit = computeTeamDamagePerHit(team.activeMembers);
    wild.currentHp = Math.max(0, wild.currentHp - hits * damagePerHit);
  }
  wild.lastTickAt = now;

  if (wild.currentHp <= 0) {
    resolveKill(wild);
  }
}
