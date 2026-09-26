import type { Element, RosterEntry, Stage } from '../types';
import { getSpecies } from '../images';
import { IN_GAME_STAGES } from '../constants';

// One filter + sort model for every roster list (the Roster screen, the
// sidebar's top contributors) - the UI is RosterFilterControls.svelte.
// Each view keeps its own filter, remembered per browser (loadRosterFilter /
// saveRosterFilter) - a display preference, not game state.

export const FILTER_STAGES = [...IN_GAME_STAGES] as Stage[];
export const FILTER_ELEMENTS: Element[] = ['Fire', 'Water', 'Plant', 'Electric', 'Earth', 'Wind', 'Metal', 'Light', 'Dark', 'Neutral'];
/** "Other" groups the handful of non-standard attributes (None, Unknown...). */
export const FILTER_ATTRIBUTES = ['Vaccine', 'Data', 'Virus', 'Free', 'Other'] as const;
export type AttributeGroup = (typeof FILTER_ATTRIBUTES)[number];
export const SORT_KEYS = { dps: 'DPS', level: 'Level', stage: 'Stage', name: 'Name' } as const;
export type RosterSortKey = keyof typeof SORT_KEYS;

export interface RosterFilter {
  stage: Stage | 'Any';
  element: Element | 'Any';
  attribute: AttributeGroup | 'Any';
  sort: RosterSortKey;
}

export const DEFAULT_ROSTER_FILTER: RosterFilter = { stage: 'Any', element: 'Any', attribute: 'Any', sort: 'dps' };

export function attributeGroup(speciesId: string): AttributeGroup {
  const attribute = getSpecies(speciesId)?.attribute ?? '';
  return (FILTER_ATTRIBUTES as readonly string[]).includes(attribute) ? (attribute as AttributeGroup) : 'Other';
}

/** Any narrowing on (sort doesn't count - it hides nothing). */
export function isFilterActive(filter: RosterFilter): boolean {
  return filter.stage !== 'Any' || filter.element !== 'Any' || filter.attribute !== 'Any';
}

/** "Rookie / Fire" - the active narrowing, for headers. */
export function describeFilter(filter: RosterFilter): string {
  return [filter.stage, filter.element, filter.attribute].filter((part) => part !== 'Any').join(' / ');
}

export function matchesRosterFilter(speciesId: string, filter: RosterFilter): boolean {
  const species = getSpecies(speciesId);
  if (filter.stage !== 'Any' && species?.stage !== filter.stage) return false;
  if (filter.element !== 'Any' && species?.element !== filter.element) return false;
  if (filter.attribute !== 'Any' && attributeGroup(speciesId) !== filter.attribute) return false;
  return true;
}

/** Filters and sorts rows that carry an entry and its DPS (highest first;
 * ties fall back to DPS). */
export function applyRosterFilter<Row extends { entry: RosterEntry; dps: number }>(rows: Row[], filter: RosterFilter): Row[] {
  const byDps = (a: Row, b: Row) => b.dps - a.dps;
  const stageOrder = (row: Row) => getSpecies(row.entry.speciesId)?.stageOrder ?? 0;
  const name = (row: Row) => getSpecies(row.entry.speciesId)?.name ?? row.entry.speciesId;
  const compare: Record<RosterSortKey, (a: Row, b: Row) => number> = {
    dps: byDps,
    level: (a, b) => b.entry.xp - a.entry.xp || byDps(a, b),
    stage: (a, b) => stageOrder(b) - stageOrder(a) || byDps(a, b),
    name: (a, b) => name(a).localeCompare(name(b)),
  };
  return rows.filter((row) => matchesRosterFilter(row.entry.speciesId, filter)).sort(compare[filter.sort]);
}

export function loadRosterFilter(key: string): RosterFilter {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? '{}');
    return {
      stage: FILTER_STAGES.includes(saved.stage) ? saved.stage : 'Any',
      element: FILTER_ELEMENTS.includes(saved.element) ? saved.element : 'Any',
      attribute: (FILTER_ATTRIBUTES as readonly string[]).includes(saved.attribute) ? saved.attribute : 'Any',
      sort: saved.sort in SORT_KEYS ? saved.sort : 'dps',
    };
  } catch {
    return { ...DEFAULT_ROSTER_FILTER };
  }
}

export function saveRosterFilter(key: string, filter: RosterFilter): void {
  try {
    localStorage.setItem(key, JSON.stringify(filter));
  } catch {
    // not remembered - fine
  }
}
