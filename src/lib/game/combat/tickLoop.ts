import { tick } from '../state/combat.svelte';
import { updateExpeditions } from '../state/expeditions.svelte';
import { newlyReadyQuests } from '../quests/quests';
import { pushToast } from '../state/notifications.svelte';
import { newlyJoinedResidents } from '../village/village';
import { COMBAT_TICK_INTERVAL_MS } from '../constants';

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startCombatTickLoop() {
  if (intervalId !== null) return;
  intervalId = setInterval(() => {
    const now = Date.now();
    updateExpeditions(now);
    tick(now);
    for (const quest of newlyReadyQuests()) pushToast('Quest ready', quest.title);
    for (const npc of newlyJoinedResidents()) pushToast(`${npc.name} joined the village`, npc.role);
  }, COMBAT_TICK_INTERVAL_MS);
}

export function stopCombatTickLoop() {
  if (intervalId === null) return;
  clearInterval(intervalId);
  intervalId = null;
}
