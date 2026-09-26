import { tick } from '../state/combat.svelte';
import { updateExpeditions } from '../state/expeditions.svelte';
import { newlyReadyQuests } from '../quests/quests';
import { pushToast } from '../state/notifications.svelte';
import { newlyJoinedResidents } from '../village/village';
import { catchUpGap, flushPendingReport } from '../state/offline.svelte';
import { checkBackupReminder } from '../state/backupReminder.svelte';
import { COMBAT_TICK_INTERVAL_MS } from '../constants';

let intervalId: ReturnType<typeof setInterval> | null = null;
let lastLoopAt: number | null = null;

// A gap this long between loop runs means the browser throttled or froze
// the tab (hidden tabs can drop to one timer a minute): that time is
// fast-forwarded instead of landing as one oversized tick.
const GAP_MS = 5_000;

export function startCombatTickLoop() {
  if (intervalId !== null) return;
  lastLoopAt = Date.now();
  intervalId = setInterval(() => {
    const now = Date.now();
    if (lastLoopAt !== null && now - lastLoopAt > GAP_MS) catchUpGap(now - lastLoopAt - COMBAT_TICK_INTERVAL_MS, now);
    lastLoopAt = now;
    if (typeof document === 'undefined' || document.visibilityState !== 'hidden') flushPendingReport();
    updateExpeditions(now);
    checkBackupReminder(now);
    tick(now);
    for (const quest of newlyReadyQuests()) pushToast('Quest ready', quest.title);
    for (const npc of newlyJoinedResidents()) pushToast(`${npc.name} joined the village`, npc.role);
  }, COMBAT_TICK_INTERVAL_MS);
}

export function stopCombatTickLoop() {
  if (intervalId === null) return;
  clearInterval(intervalId);
  intervalId = null;
  lastLoopAt = null;
}
