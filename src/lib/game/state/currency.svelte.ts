import type { CurrencyState } from '../types';

export const currency: CurrencyState = $state({ bits: 0, data: 0 });

export function addBits(amount: number) {
  currency.bits += amount;
}

export function addData(amount: number) {
  currency.data += amount;
}

/** False and no-op if bits are insufficient - never allows going negative. */
export function spendBits(amount: number): boolean {
  if (currency.bits < amount) return false;
  currency.bits -= amount;
  return true;
}
