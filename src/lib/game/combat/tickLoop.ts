import { tick } from '../state/combat.svelte';

const TICK_INTERVAL_MS = 250;

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startCombatTickLoop() {
  if (intervalId !== null) return;
  intervalId = setInterval(() => tick(Date.now()), TICK_INTERVAL_MS);
}

export function stopCombatTickLoop() {
  if (intervalId === null) return;
  clearInterval(intervalId);
  intervalId = null;
}
