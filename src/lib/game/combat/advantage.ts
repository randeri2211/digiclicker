// Boss-fight matchups - pure functions with no constants import (same
// style as fightTimer.ts), so the game and the Balance Lab share them.
//
// Two independent edges between an attacker and a defender:
//   - attribute: Vaccine > Virus > Data > Vaccine (anything else neutral)
//   - element: data/elementChart.json (attacker -> elements it beats)
// Each edge adds +bonus when the attacker has it, -penalty when the
// defender has it, 0 otherwise; the two simply add up. With the default
// 0.5 / 0.25 that's 2.0x at best (both edges) and 0.5x at worst.
import elementChartData from '../../data/elementChart.json';
import type { Element } from '../types';

const ELEMENT_CHART = elementChartData as Record<Element, Element[]>;

const ATTRIBUTE_BEATS: Record<string, string> = {
  Vaccine: 'Virus',
  Virus: 'Data',
  Data: 'Vaccine',
};

export interface Combatant {
  attribute: string;
  element: Element;
}

export interface AdvantageParams {
  /** Added per edge the attacker wins, e.g. 0.5 = +50%. */
  bonus: number;
  /** Subtracted per edge the attacker loses, e.g. 0.25 = -25%. */
  penalty: number;
}

/** +1 attacker wins, -1 defender wins, 0 neutral. */
export type Edge = 1 | 0 | -1;

export function attributeEdge(attacker: Combatant, defender: Combatant): Edge {
  if (ATTRIBUTE_BEATS[attacker.attribute] === defender.attribute) return 1;
  if (ATTRIBUTE_BEATS[defender.attribute] === attacker.attribute) return -1;
  return 0;
}

// Checked from the attacker's side first: a mutual pair (Light <-> Dark)
// counts as an advantage for whoever is attacking.
export function elementEdge(attacker: Combatant, defender: Combatant): Edge {
  if (ELEMENT_CHART[attacker.element]?.includes(defender.element)) return 1;
  if (ELEMENT_CHART[defender.element]?.includes(attacker.element)) return -1;
  return 0;
}

function edgeValue(edge: Edge, p: AdvantageParams): number {
  return edge === 1 ? p.bonus : edge === -1 ? -p.penalty : 0;
}

/** Stat multiplier for `attacker` fighting `defender` - applied to all
 * four stats of a boss-squad member. Never below 0. */
export function advantageMultiplier(attacker: Combatant, defender: Combatant, p: AdvantageParams): number {
  const total = 1 + edgeValue(attributeEdge(attacker, defender), p) + edgeValue(elementEdge(attacker, defender), p);
  return Math.max(0, total);
}
