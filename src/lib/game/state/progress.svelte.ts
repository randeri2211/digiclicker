import type { ProgressState } from '../types';

export const progress: ProgressState = $state({ flags: {}, completedQuests: [] });

export function hasFlag(flag: string): boolean {
  return Boolean(progress.flags[flag]);
}

export function setFlag(flag: string): void {
  progress.flags[flag] = true;
}

export function isQuestCompleted(questId: string): boolean {
  return progress.completedQuests.includes(questId);
}
