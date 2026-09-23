import type { QuestDefinition, QuestRequirement } from '../types';
import questsData from '../../data/quests.json';
import { getSpecies, getSpeciesName } from '../images';
import { levelForXp } from '../combat/levelCurve';
import { getRosterList, roster } from '../state/roster.svelte';
import { areaProgress } from '../state/areaProgress.svelte';
import { inventory, removeItem, addItem } from '../state/inventory.svelte';
import { currency } from '../state/currency.svelte';
import { progress, hasFlag, setFlag, isQuestCompleted } from '../state/progress.svelte';
import { killsOnPath, isBossDefeated } from '../areas/areaProgress';
import { getPath } from '../areas/areaRegistry';
import { ITEM_CATALOG } from '../items/itemCatalog';

export const QUESTS = questsData as unknown as QuestDefinition[];

export function getQuest(id: string): QuestDefinition | undefined {
  return QUESTS.find((q) => q.id === id);
}

export type QuestStatus = 'locked' | 'active' | 'ready' | 'completed';

export interface RequirementProgress {
  label: string;
  current: number;
  target: number;
  met: boolean;
}

function progressOf(label: string, current: number, target: number): RequirementProgress {
  return { label, current: Math.min(current, target), target, met: current >= target };
}

/** How far along one requirement is, from the live game state. */
export function requirementProgress(req: QuestRequirement): RequirementProgress {
  switch (req.kind) {
    case 'own-species':
      return progressOf(`Own ${getSpeciesName(req.speciesId)}`, roster[req.speciesId] ? 1 : 0, 1);
    case 'own-stage': {
      const count = getRosterList().filter((e) => getSpecies(e.speciesId)?.stage === req.stage).length;
      return progressOf(`Own ${req.count} ${req.stage} Digimon`, count, req.count);
    }
    case 'own-element': {
      const count = getRosterList().filter((e) => getSpecies(e.speciesId)?.element === req.element).length;
      return progressOf(`Own ${req.count} ${req.element} Digimon`, count, req.count);
    }
    case 'reach-level': {
      const entries = req.speciesId ? getRosterList().filter((e) => e.speciesId === req.speciesId) : getRosterList();
      const best = entries.reduce((max, e) => Math.max(max, levelForXp(e.xp)), 0);
      const who = req.speciesId ? getSpeciesName(req.speciesId) : 'any Digimon';
      return progressOf(`Get ${who} to Lv ${req.level}`, best, req.level);
    }
    case 'path-kills': {
      const name = getPath(req.areaId, req.pathId)?.name ?? req.pathId;
      return progressOf(`Defeat ${req.kills} wild Digimon in ${name}`, killsOnPath(areaProgress, req.areaId, req.pathId), req.kills);
    }
    case 'defeat-boss': {
      const boss = getPath(req.areaId, req.pathId)?.boss;
      const name = boss ? getSpeciesName(boss.speciesId) : 'the boss';
      return progressOf(`Defeat ${name}`, isBossDefeated(areaProgress, req.areaId, req.pathId) ? 1 : 0, 1);
    }
    case 'deliver-item':
      return progressOf(`Bring ${req.count}× ${ITEM_CATALOG[req.itemId]?.name ?? req.itemId}`, inventory[req.itemId] ?? 0, req.count);
    case 'has-flag':
      return progressOf(req.flag, hasFlag(req.flag) ? 1 : 0, 1);
    case 'roster-size':
      return progressOf(`Own ${req.count} Digimon`, getRosterList().length, req.count);
  }
}

function prerequisitesMet(quest: QuestDefinition): boolean {
  const pre = quest.prerequisites;
  return (pre?.quests ?? []).every(isQuestCompleted) && (pre?.flags ?? []).every(hasFlag);
}

export function questStatus(quest: QuestDefinition): QuestStatus {
  if (isQuestCompleted(quest.id)) return 'completed';
  if (!prerequisitesMet(quest)) return 'locked';
  return quest.requirements.every((req) => requirementProgress(req).met) ? 'ready' : 'active';
}

/** Turns in a ready quest: consumes delivered items, pays the rewards and
 * sets its flags. False and no-op unless the quest is ready. */
export function completeQuest(id: string): boolean {
  const quest = getQuest(id);
  if (!quest || questStatus(quest) !== 'ready') return false;

  for (const req of quest.requirements) {
    if (req.kind === 'deliver-item') removeItem(req.itemId, req.count);
  }
  const { rewards } = quest;
  currency.bits += rewards.bits ?? 0;
  currency.data += rewards.data ?? 0;
  for (const item of rewards.items ?? []) addItem(item.id, item.count);
  for (const flag of rewards.flags ?? []) setFlag(flag);
  progress.completedQuests.push(quest.id);
  return true;
}

// Quests that were already ready last time this was called - so a toast
// fires only when a quest BECOMES ready. Seeded silently on the first call
// (and after loading a save) so existing ready quests don't all announce.
let knownReady: Set<string> | null = null;

export function resetQuestWatch(): void {
  knownReady = null;
}

/** Quests that became ready since the last call (called every tick). */
export function newlyReadyQuests(): QuestDefinition[] {
  const ready = QUESTS.filter((q) => questStatus(q) === 'ready');
  const ids = new Set(ready.map((q) => q.id));
  if (knownReady === null) {
    knownReady = ids;
    return [];
  }
  const fresh = ready.filter((q) => !knownReady!.has(q.id));
  knownReady = ids;
  return fresh;
}
