import { roster, getRosterList } from './roster.svelte';
import { hatchery } from './hatchery.svelte';
import { areaProgress } from './areaProgress.svelte';
import { playStats } from './playStats.svelte';
import { isReadyToDigivolve } from '../evolution/digivolve';
import { isBossAvailable } from '../areas/areaProgress';
import { AREAS } from '../areas/areaRegistry';
import { isSystemUnlocked } from '../village/village';

// Onboarding: short one-time tips, each shown the first time it becomes
// relevant (one at a time, from the tick loop). Remembered per browser -
// they're about the interface, not a particular save. Settings can bring
// them back.

export interface Tip {
  id: string;
  title: string;
  text: string;
  /** The UI it's about: an element marked data-tip="<target>" - spotlit,
   * with the tip beside it (centred if it isn't on screen). */
  target?: string;
  /** Show once this holds. */
  when: () => boolean;
}

const unlockedPathCount = () => Object.values(areaProgress.unlockedPaths).reduce((n, paths) => n + paths.length, 0);
const anyBossAvailable = () =>
  Object.entries(AREAS).some(([areaId, area]) =>
    Object.entries(area.paths).some(([pathId, path]) => path.boss && isBossAvailable(areaProgress, areaId, pathId)),
  );

// In the order they'd normally come up.
export const TIPS: Tip[] = [
  {
    id: 'welcome',
    target: 'arena',
    title: 'Welcome, Tamer!',
    text: 'Click the wild Digimon to attack. Your whole roster fights on its own too - even while the game is closed.',
    when: () => true,
  },
  {
    id: 'quests',
    target: 'quests',
    title: 'Quests',
    text: 'Jijimon has a quest for you. Quests tell the story and bring new residents - each one opens something new.',
    when: () => true,
  },
  {
    id: 'map',
    target: 'map',
    title: 'A new path is open',
    text: 'Paths unlock as you defeat enough Digimon. Click a path on the map to travel there.',
    when: () => unlockedPathCount() >= 2,
  },
  {
    id: 'digivolve',
    target: 'evolve',
    title: 'Ready to digivolve',
    text: 'One of your Digimon can digivolve! Open Evolution here. The new form joins your roster - the old one stays and starts over at Lv 1.',
    when: () => getRosterList().some(isReadyToDigivolve),
  },
  {
    id: 'eggs',
    target: 'hatchery',
    title: 'A Digi-Egg!',
    text: 'Eggs in the hatchery grow as you defeat Digimon. When one is ready, hatch it with Data to meet a new Digimon.',
    when: () => hatchery.incubating.length + hatchery.stored.length > 0,
  },
  {
    id: 'expeditions',
    target: 'expeditions',
    title: 'Expeditions',
    text: 'Send a few Digimon exploring from here. They bring back Data, eggs and boss chips - but miss the fighting while away.',
    when: () => isSystemUnlocked('expeditions'),
  },
  {
    id: 'partners',
    target: 'roster',
    title: 'Partners',
    text: 'Click a Digimon here (or in the Roster) and choose "Make partner". Partners level faster and a little higher - train the squad you will take to bosses.',
    when: () => Object.keys(roster).length >= 4,
  },
  {
    id: 'boss',
    target: 'boss',
    title: 'A boss appeared',
    text: 'Challenge it here. Pick a squad with good matchups - attribute and element - and bring boss chips if you have any.',
    when: anyBossAvailable,
  },
  {
    id: 'backup',
    target: 'settings',
    title: 'Keep your progress safe',
    text: 'Your save lives only in this browser. Settings (here) -> Export Save makes a backup file you can import anywhere.',
    when: () => playStats.onlineMs >= 30 * 60_000,
  },
];

const SEEN_KEY = 'digiclicker-tips-seen';

function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // not remembered - tips may show again next time, which is harmless
  }
}

let seen = loadSeen();
export const tips: { current: Tip | null } = $state({ current: null });

/** Called by the tick loop: shows the next unseen tip that applies. */
export function checkTips(): void {
  if (tips.current) return;
  tips.current = TIPS.find((tip) => !seen.has(tip.id) && tip.when()) ?? null;
}

export function dismissTip(): void {
  if (!tips.current) return;
  seen.add(tips.current.id);
  saveSeen(seen);
  tips.current = null;
}

export function skipAllTips(): void {
  seen = new Set(TIPS.map((tip) => tip.id));
  saveSeen(seen);
  tips.current = null;
}

export function resetTips(): void {
  seen = new Set();
  saveSeen(seen);
  tips.current = null;
}
