import actsData from '../../data/acts.json';
import { hasFlag, setFlag } from './progress.svelte';

// The end-of-act screen (components/ActCompleteScreen.svelte): shown once
// when an act's finale flag is set, replayable from the quest log. Acts are
// data (data/acts.json) so every act reuses the same screen.

export interface ActDefinition {
  id: string;
  number: number;
  title: string;
  regionId: string;
  finaleFlag: string;
  villain: string;
  closingQuote: string;
  closingLine: string;
  reward: { name: string; text: string };
  next: { regionId: string; title: string; teaser: string };
}

export const ACTS = actsData as ActDefinition[];

export const actScreen: { actId: string | null } = $state({ actId: null });

const seenFlag = (actId: string) => `act-seen:${actId}`;

export function isActComplete(act: ActDefinition): boolean {
  return hasFlag(act.finaleFlag);
}

export function completedActs(): ActDefinition[] {
  return ACTS.filter(isActComplete);
}

/** Called by the tick loop: opens the screen for a newly finished act. */
export function checkActCompletion(): void {
  if (actScreen.actId) return;
  const fresh = ACTS.find((act) => isActComplete(act) && !hasFlag(seenFlag(act.id)));
  if (fresh) actScreen.actId = fresh.id;
}

export function openActScreen(actId: string): void {
  actScreen.actId = actId;
}

export function closeActScreen(): void {
  if (actScreen.actId) setFlag(seenFlag(actScreen.actId));
  actScreen.actId = null;
}
