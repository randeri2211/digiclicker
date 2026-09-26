import type { AbilityContext, AbilityDefinition, AbilityEffect, AbilityId } from '../types';
import { ABILITY_PERCENT, ABILITY_TIER_WEIGHTS } from '../constants';
import elementChart from '../../data/elementChart.json';
import { weightedPick } from '../util/random';

// Special abilities: one per roster entry, rolled at creation, inherited
// on digivolve, rerolled for Bits (abilities.ts). Each family comes in
// tiers I-III (common -> rare, ABILITY_TIER_WEIGHTS); sizes are in
// balance.json (ABILITY_PERCENT) so the Balance Lab can tune them.
//
// Where each context applies:
//   roster      - while in the roster and not away (auras; duplicates stack
//                 with ABILITY_AURA_FALLOFF, see abilityEffects.ts)
//   boss        - only as a boss squad member (sums over the squad)
//   expedition  - only on an expedition party (sums over the party)

const MATCHUP_ATTRIBUTES = ['Vaccine', 'Data', 'Virus'];
const ELEMENTS = Object.keys(elementChart);

interface Family {
  effect: AbilityEffect;
  context: AbilityContext;
  /** One ability per target (vs-attribute / vs-element), else none. */
  targets?: string[];
  name: (target?: string) => string;
  describe: (percent: number, target?: string) => string;
}

const FAMILIES: Family[] = [
  { effect: 'roster-attack', context: 'roster', name: () => 'Battle Cry', describe: (p) => `+${p}% damage for the whole roster.` },
  { effect: 'roster-speed', context: 'roster', name: () => 'Quickstep', describe: (p) => `+${p}% attack speed for the whole roster.` },
  { effect: 'kill-xp', context: 'roster', name: () => 'Mentor', describe: (p) => `+${p}% XP from every kill.` },
  { effect: 'kill-bits', context: 'roster', name: () => 'Treasure Nose', describe: (p) => `+${p}% Bits from every kill.` },
  { effect: 'egg-xp', context: 'roster', name: () => 'Warm Heart', describe: (p) => `+${p}% XP for incubating eggs.` },
  { effect: 'click-damage', context: 'roster', name: () => "Tamer's Bond", describe: (p) => `+${p}% click damage.` },
  {
    effect: 'vs-attribute',
    context: 'boss',
    targets: MATCHUP_ATTRIBUTES,
    name: (t) => `${t} Buster`,
    describe: (p, t) => `In a boss squad: +${p}% stats against ${t} bosses.`,
  },
  {
    effect: 'vs-element',
    context: 'boss',
    targets: ELEMENTS,
    name: (t) => `${t} Hunter`,
    describe: (p, t) => `In a boss squad: +${p}% stats against ${t} bosses.`,
  },
  { effect: 'squad-damage', context: 'boss', name: () => 'Rallying Leader', describe: (p) => `In a boss squad: +${p}% damage for the whole squad.` },
  { effect: 'boss-timer', context: 'boss', name: () => 'Iron Will', describe: (p) => `In a boss squad: +${p}% boss fight time.` },
  { effect: 'expedition-speed', context: 'expedition', name: () => 'Pathfinder', describe: (p) => `On an expedition: the party returns ${p}% faster.` },
  { effect: 'expedition-haul', context: 'expedition', name: () => 'Scavenger', describe: (p) => `On an expedition: +${p}% haul.` },
  { effect: 'expedition-eggs', context: 'expedition', name: () => 'Egg Seeker', describe: (p) => `On an expedition: +${p}% egg chance.` },
];

const ROMAN = ['I', 'II', 'III'] as const;

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildCatalog(): Record<AbilityId, AbilityDefinition> {
  const catalog: Record<AbilityId, AbilityDefinition> = {};
  for (const family of FAMILIES) {
    const targets = family.targets ?? [undefined];
    for (const target of targets) {
      const familyName = family.name(target);
      for (const tier of [1, 2, 3] as const) {
        const percent = ABILITY_PERCENT[family.effect][tier - 1];
        const id = `${slug(familyName)}-${tier}`;
        catalog[id] = {
          id,
          name: `${familyName} ${ROMAN[tier - 1]}`,
          family: familyName,
          description: family.describe(percent, target),
          effect: family.effect,
          context: family.context,
          ...(target ? { target } : {}),
          tier,
          percent,
          // A family's weight is split across its targets, so "Hunter"
          // (10 elements) isn't 10x likelier than "Battle Cry".
          weight: ABILITY_TIER_WEIGHTS[tier - 1] / targets.length,
        };
      }
    }
  }
  return catalog;
}

export const ABILITY_CATALOG: Record<AbilityId, AbilityDefinition> = buildCatalog();

/** Every family name, in catalog order - the roster filter's options. */
export const ABILITY_FAMILIES: string[] = [...new Set(Object.values(ABILITY_CATALOG).map((a) => a.family))];

export function getAbility(id: AbilityId | null | undefined): AbilityDefinition | undefined {
  return id ? ABILITY_CATALOG[id] : undefined;
}

/** A weighted-random ability, never one of `exclude`. */
export function rollAbility(exclude: Iterable<AbilityId> = []): AbilityId {
  const skip = new Set(exclude);
  const pool = Object.values(ABILITY_CATALOG).filter((a) => !skip.has(a.id));
  return weightedPick(pool.length ? pool : Object.values(ABILITY_CATALOG), (a) => a.weight).id;
}
