import type { BoostId, DigiMeatId, EggType, ItemId, RosterEntry, ShopState, ShopUpgradeId } from '../types';
import { spendBits } from './currency.svelte';
import { addItem, removeItem } from './inventory.svelte';
import { addEgg } from './hatchery.svelte';
import { levelForXp } from '../combat/levelCurve';
import { tryAutoDigivolve } from '../evolution/digivolve';
import { MYSTERY_EGG_WEIGHTS, rollMysteryEgg } from '../eggs/mysteryEggs';
import { currentActNumber } from '../abilities/abilities';
import { ITEM_CATALOG } from '../items/itemCatalog';
import { isSystemUnlocked } from '../village/village';
import { playSound } from '../audio/sfx.svelte';
import {
  DIGI_MEAT,
  SHOP_BOOST_PERCENT,
  SHOP_BOOST_MINUTES,
  SHOP_BOOST_MAX_BANKED_MINUTES,
  SHOP_BOOST_BASE_COST,
  SHOP_BOOST_COST_GROWTH,
  SHOP_BOOST_COST_CAP_BY_ACT,
  SHOP_EXPEDITION_SLOT_COST,
  SHOP_CLICK_POWER_PERCENT,
  SHOP_CLICK_POWER_MAX_TIER,
  SHOP_CLICK_POWER_BASE_COST,
  SHOP_CLICK_POWER_COST_GROWTH,
  SHOP_DEAL_WINDOW_HOURS,
  SHOP_DEAL_COUNT,
  SHOP_DEAL_DISCOUNT,
  SHOP_DEAL_MEAT_QUANTITY,
  SHOP_DEAL_CHIP_PRICE,
  MYSTERY_EGG_COST_BITS,
  EXPEDITION_MAX_CONCURRENT,
} from '../constants';

// The Shop (Andromon's, the 'shop' system): Digi-Meat, timed boosts,
// permanent upgrades and a few rotating deals. Everything here is a Bits
// sink - prices that grow with use keep it relevant late in an act.

export function initialShopState(): ShopState {
  return {
    boostEndsAt: { xp: 0, bits: 0, egg: 0 },
    boostPurchases: { xp: 0, bits: 0, egg: 0 },
    upgrades: { 'expedition-slot': 0, 'click-power': 0 },
    dealWindow: -1,
    dealsBought: [],
  };
}

export const shop: ShopState = $state(initialShopState());

/** A per-act cap from a list (acts past the list use its last value). */
function actCap(caps: number[]): number {
  return caps[Math.min(currentActNumber(), caps.length) - 1] ?? Infinity;
}

// ---- Digi-Meat --------------------------------------------------------

export const MEAT_IDS = Object.keys(DIGI_MEAT) as DigiMeatId[];

/** Feeds one owned meat to `entry` for its flat XP (then auto-digivolve
 * gets its chance, as after a kill). False if none is owned. */
export function feedMeat(entry: RosterEntry, meatId: DigiMeatId): boolean {
  if (!removeItem(meatId, 1)) return false;
  const before = levelForXp(entry.xp);
  entry.xp += DIGI_MEAT[meatId].xp;
  if (levelForXp(entry.xp) > before) playSound('levelUp');
  tryAutoDigivolve(entry);
  return true;
}

// ---- Timed boosts -------------------------------------------------------

export const BOOSTS: { id: BoostId; name: string; description: string }[] = [
  { id: 'xp', name: 'XP Booster', description: `+${SHOP_BOOST_PERCENT.xp}% kill XP` },
  { id: 'bits', name: 'Bit Magnet', description: `+${SHOP_BOOST_PERCENT.bits}% Bits from kills` },
  { id: 'egg', name: 'Incubator Heat', description: `+${SHOP_BOOST_PERCENT.egg}% egg incubation XP` },
];

const BOOST_MS = SHOP_BOOST_MINUTES * 60_000;
const MAX_BANKED_MS = SHOP_BOOST_MAX_BANKED_MINUTES * 60_000;

/** The boost's multiplier at time `at` (1 when not running) - `at` lets
 * the offline catch-up ask about each replayed kill's own moment. */
export function boostFactor(id: BoostId, at: number = Date.now()): number {
  return at < shop.boostEndsAt[id] ? 1 + SHOP_BOOST_PERCENT[id] / 100 : 1;
}

export function boostRemainingMs(id: BoostId, now: number = Date.now()): number {
  return Math.max(0, shop.boostEndsAt[id] - now);
}

export function boostCost(id: BoostId): number {
  const raw = SHOP_BOOST_BASE_COST * Math.pow(SHOP_BOOST_COST_GROWTH, shop.boostPurchases[id]);
  return Math.round(Math.min(raw, actCap(SHOP_BOOST_COST_CAP_BY_ACT)));
}

/** Room to bank another SHOP_BOOST_MINUTES on this boost. */
export function canExtendBoost(id: BoostId, now: number = Date.now()): boolean {
  return boostRemainingMs(id, now) + BOOST_MS <= MAX_BANKED_MS;
}

function extendBoost(id: BoostId, now: number): void {
  shop.boostEndsAt[id] = Math.max(now, shop.boostEndsAt[id]) + BOOST_MS;
}

/** Buys SHOP_BOOST_MINUTES more of a boost at its current price. */
export function buyBoost(id: BoostId, now: number = Date.now()): boolean {
  if (!isSystemUnlocked('shop') || !canExtendBoost(id, now) || !spendBits(boostCost(id))) return false;
  extendBoost(id, now);
  shop.boostPurchases[id] += 1;
  return true;
}

// ---- Permanent upgrades -------------------------------------------------

export const UPGRADES: { id: ShopUpgradeId; name: string; description: string; maxTier: number }[] = [
  { id: 'expedition-slot', name: 'Second Expedition Slot', description: 'Send two expedition parties at once.', maxTier: 1 },
  { id: 'click-power', name: 'Click Power', description: `+${SHOP_CLICK_POWER_PERCENT}% click damage per tier.`, maxTier: SHOP_CLICK_POWER_MAX_TIER },
];

/** Next tier's price, or null when maxed. */
export function upgradeCost(id: ShopUpgradeId): number | null {
  const tier = shop.upgrades[id];
  if (id === 'expedition-slot') return tier >= 1 ? null : SHOP_EXPEDITION_SLOT_COST;
  if (tier >= SHOP_CLICK_POWER_MAX_TIER) return null;
  return Math.round(SHOP_CLICK_POWER_BASE_COST * Math.pow(SHOP_CLICK_POWER_COST_GROWTH, tier));
}

export function buyUpgrade(id: ShopUpgradeId): boolean {
  const cost = upgradeCost(id);
  if (!isSystemUnlocked('shop') || cost === null || !spendBits(cost)) return false;
  shop.upgrades[id] += 1;
  return true;
}

export function expeditionSlots(): number {
  return EXPEDITION_MAX_CONCURRENT + shop.upgrades['expedition-slot'];
}

export function clickPowerFactor(): number {
  return 1 + (shop.upgrades['click-power'] * SHOP_CLICK_POWER_PERCENT) / 100;
}

// ---- Rotating deals -----------------------------------------------------

export interface ShopDeal {
  kind: 'meat' | 'boost' | 'egg' | 'chip';
  id: string;
  quantity: number;
  price: number;
  name: string;
  description: string;
}

const WINDOW_MS = SHOP_DEAL_WINDOW_HOURS * 3_600_000;
const CHIP_IDS: ItemId[] = ['attack-chip', 'speed-chip', 'hp-disk'];

export function dealWindow(now: number = Date.now()): number {
  return Math.floor(now / WINDOW_MS);
}

export function dealWindowEndsAt(now: number = Date.now()): number {
  return (dealWindow(now) + 1) * WINDOW_MS;
}

/** A small seeded random (mulberry32) - the same window always gives the
 * same deals, so reloads and offline time need nothing saved but what was
 * bought. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const off = (price: number) => Math.round(price * (1 - SHOP_DEAL_DISCOUNT));
const pct = Math.round(SHOP_DEAL_DISCOUNT * 100);

function makeDeal(kind: ShopDeal['kind'], rand: () => number): ShopDeal {
  const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];
  switch (kind) {
    case 'meat': {
      const id = pick(MEAT_IDS);
      const q = SHOP_DEAL_MEAT_QUANTITY;
      return { kind, id, quantity: q, price: off(DIGI_MEAT[id].costBits * q), name: `${q}× ${ITEM_CATALOG[id].name}`, description: `${pct}% off a bundle.` };
    }
    case 'boost': {
      const boost = pick(BOOSTS);
      return { kind, id: boost.id, quantity: 1, price: off(boostCost(boost.id)), name: `${boost.name} (${SHOP_BOOST_MINUTES} min)`, description: `${boost.description} - ${pct}% off, doesn't raise its price.` };
    }
    case 'egg': {
      const eggType = pick(Object.keys(MYSTERY_EGG_WEIGHTS) as EggType[]);
      return { kind, id: eggType, quantity: 1, price: off(MYSTERY_EGG_COST_BITS), name: `Mystery ${eggType} Digi-Egg`, description: `${pct}% off - hatches into a random ${eggType} Fresh Digimon.` };
    }
    case 'chip': {
      const id = pick(CHIP_IDS);
      return { kind, id, quantity: 1, price: SHOP_DEAL_CHIP_PRICE, name: ITEM_CATALOG[id].name, description: `Rare - usually only found on expeditions. ${ITEM_CATALOG[id].description}` };
    }
  }
}

/** This window's deals: SHOP_DEAL_COUNT offers, at most one boss chip,
 * no exact repeats. */
export function getDeals(now: number = Date.now()): ShopDeal[] {
  const rand = seededRandom(dealWindow(now) * 2654435761);
  const kinds: { kind: ShopDeal['kind']; weight: number }[] = [
    { kind: 'meat', weight: 3 },
    { kind: 'boost', weight: 3 },
    { kind: 'egg', weight: 2 },
    { kind: 'chip', weight: 0.4 }, // rare - chips are mainly expedition finds
  ];
  const deals: ShopDeal[] = [];
  for (let attempt = 0; deals.length < SHOP_DEAL_COUNT && attempt < 50; attempt++) {
    const pool = kinds.filter((k) => k.kind !== 'chip' || !deals.some((d) => d.kind === 'chip'));
    let roll = rand() * pool.reduce((sum, k) => sum + k.weight, 0);
    const kind = pool.find((k) => (roll -= k.weight) <= 0)?.kind ?? 'meat';
    const deal = makeDeal(kind, rand);
    if (!deals.some((d) => d.kind === deal.kind && d.id === deal.id)) deals.push(deal);
  }
  return deals;
}

/** Forgets last window's purchases once a new window starts. */
function syncDealWindow(now: number): void {
  const window = dealWindow(now);
  if (shop.dealWindow !== window) {
    shop.dealWindow = window;
    shop.dealsBought = [];
  }
}

export function isDealBought(index: number, now: number = Date.now()): boolean {
  return shop.dealWindow === dealWindow(now) && shop.dealsBought.includes(index);
}

/** Buys deal `index` of the current window, once. */
export function buyDeal(index: number, now: number = Date.now()): boolean {
  if (!isSystemUnlocked('shop')) return false;
  syncDealWindow(now);
  const deal = getDeals(now)[index];
  if (!deal || shop.dealsBought.includes(index)) return false;
  if (deal.kind === 'boost' && !canExtendBoost(deal.id as BoostId, now)) return false;
  if (!spendBits(deal.price)) return false;
  if (deal.kind === 'meat' || deal.kind === 'chip') addItem(deal.id as ItemId, deal.quantity);
  else if (deal.kind === 'boost') extendBoost(deal.id as BoostId, now);
  else addEgg(rollMysteryEgg(deal.id as EggType));
  shop.dealsBought.push(index);
  return true;
}
