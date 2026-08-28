import { tick } from '../state/combat.svelte';
import { COMBAT_TICK_INTERVAL_MS } from '../constants';

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startCombatTickLoop() {
  if (intervalId !== null) return;
  intervalId = setInterval(() => tick(Date.now()), COMBAT_TICK_INTERVAL_MS);
}

export function stopCombatTickLoop() {
  if (intervalId === null) return;
  clearInterval(intervalId);
  intervalId = null;
}
