// Display helpers for boss matchup multipliers - shared by the boss prep
// screen and the arena's squad strip so both read the same way.

export type MultiplierTone = 'good' | 'neutral' | 'bad';

export function multiplierTone(multiplier: number): MultiplierTone {
  if (multiplier > 1.0001) return 'good';
  if (multiplier < 0.9999) return 'bad';
  return 'neutral';
}

export function formatMultiplier(multiplier: number): string {
  return `×${+multiplier.toFixed(2)}`;
}
