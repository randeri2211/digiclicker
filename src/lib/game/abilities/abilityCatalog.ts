import type { AbilityDefinition, AbilityId, StatBlock } from '../types';

const STAT_LABEL: Record<keyof StatBlock, string> = {
  attack: 'Attack',
  hp: 'HP',
  speed: 'Speed',
  specialAttack: 'Special Attack',
};

// Tier -> (percent, weight). Weight drives rarity in rerollAbility's
// weighted pick - Minor common, Superior rare. Placeholders, same "tune
// later" convention as every other balance number in this game.
const TIERS: { suffix: 'minor' | 'major' | 'superior'; label: string; percent: number; weight: number }[] = [
  { suffix: 'minor', label: 'Minor', percent: 5, weight: 10 },
  { suffix: 'major', label: 'Major', percent: 10, weight: 5 },
  { suffix: 'superior', label: 'Superior', percent: 20, weight: 1 },
];

const STAT_KEYS: (keyof StatBlock)[] = ['attack', 'hp', 'speed', 'specialAttack'];

function abilityIdFor(statKey: keyof StatBlock, suffix: string): AbilityId {
  const prefix = statKey === 'specialAttack' ? 'special-attack' : statKey;
  return `${prefix}-${suffix}` as AbilityId;
}

/** Single source of truth for special-ability metadata/weighting - 4
 * stats x 3 rarity tiers, 12 entries total. Every AbilityId must have an
 * entry here. */
export const ABILITY_CATALOG: Record<AbilityId, AbilityDefinition> = Object.fromEntries(
  STAT_KEYS.flatMap((statKey) =>
    TIERS.map((tier) => {
      const id = abilityIdFor(statKey, tier.suffix);
      const definition: AbilityDefinition = {
        id,
        name: `${tier.label} ${STAT_LABEL[statKey]} Boost`,
        description: `+${tier.percent}% ${STAT_LABEL[statKey]}.`,
        statKey,
        percent: tier.percent,
        weight: tier.weight,
      };
      return [id, definition];
    })
  )
) as Record<AbilityId, AbilityDefinition>;
