// Diminishing returns for the whole roster fighting wilds - pure, no
// constants import, so the Balance Lab (src/balance/model.ts) shares it,
// like fightTimer.ts.
//
// Without it, roster damage grew with every Digimon collected (and the
// summed Speed made DPS grow with the square of the roster), so farming
// became instant once the collection took off (tools/simulate.mjs). Now the
// roster is sorted strongest first and the i-th member counts falloff^i:
// with 0.9 the best counts 100%, the 2nd 90%, the 3rd 81%... A bigger
// roster always helps, but the total approaches 1 / (1 - falloff)
// members' worth (10 at 0.9). falloff 1 = a plain sum (the old rule).
// Boss squads don't use this - they're a handful of picked Digimon.

/** Sum of `values` with diminishing returns (see above). */
export function diminishedSum(values: number[], falloff: number): number {
  if (falloff >= 1) return values.reduce((total, v) => total + v, 0);
  const sorted = [...values].sort((a, b) => b - a);
  let total = 0;
  let weight = 1;
  for (const value of sorted) {
    total += value * weight;
    weight *= falloff;
    if (weight < 1e-6) break;
  }
  return total;
}

/** Each value's weighted share (same order as `values`) - the shares add
 * up to diminishedSum(values, falloff). */
export function diminishedShares(values: number[], falloff: number): number[] {
  if (falloff >= 1) return [...values];
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => b.value - a.value);
  const shares = new Array<number>(values.length).fill(0);
  let weight = 1;
  for (const { value, index } of order) {
    shares[index] = value * weight;
    weight *= falloff;
  }
  return shares;
}
