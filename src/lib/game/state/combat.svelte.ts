import type { CombatState, ItemId, Stage, SquadMember } from '../types';
import { roster } from './roster.svelte';
import { getFightingRoster, isAway } from './expeditions.svelte';
import { removeItem } from './inventory.svelte';
import { addEgg } from './hatchery.svelte';
import { currency } from './currency.svelte';
import {
  computeClickDamage,
  computeAttacksPerSecond,
  computeRosterDamagePerHit,
  computeSquadAttacksPerSecond,
  computeSquadDamagePerHit,
  computeSquadClickDamage,
  computeSquadStat,
  type WeightedEntry,
  type SquadStatBonus,
} from '../combat/damage';
import { pickNextWildSpawn, spawnDebugWild, makeBossSpawn, computeKillXp, computeKillBits } from '../combat/spawn';
import { advantageMultiplier } from '../combat/advantage';
import { awardKillXp } from '../combat/xp';
import { rollEggDrop } from '../eggs/eggs';
import { getSpecies } from '../images';
import { areaProgress } from './areaProgress.svelte';
import { getActivePath, recordActivePathKill, isBossAvailable, recordBossVictory } from '../areas/areaProgress';
import { getPath } from '../areas/areaRegistry';
import { ADVANTAGE_BONUS, DISADVANTAGE_PENALTY, BOSS_CHIP_BONUS } from '../constants';

/** Boss chip item -> the squad stats it boosts for one boss fight. */
export const BOSS_CHIP_STATS: Partial<Record<ItemId, (keyof SquadStatBonus)[]>> = {
  'attack-chip': ['attack', 'specialAttack'],
  'speed-chip': ['speed'],
  'hp-disk': ['hp'],
};

export const combat: CombatState = $state({ wild: null, damagePopup: null, boss: null, lastBossResult: null });

// DEBUG: while enabled, every spawn (including the ones tick() picks after
// a kill) uses this stage+level instead of the normal WILD_SPAWN_POOL
// progression - set-and-forget, no per-spawn click needed. See
// DebugSpawnPanel.svelte.
export const debugSpawn: { enabled: boolean; stage: Stage; level: number } = $state({
  enabled: false,
  stage: 'Rookie',
  level: 1,
});

let popupCounter = 0;
let resultCounter = 0;

function showDamagePopup(amount: number) {
  popupCounter += 1;
  combat.damagePopup = { amount, id: popupCounter };
}

// ---- Boss fights ------------------------------------------------------

/** A roster species' matchup multiplier against a boss species - what the
 * boss prep screen shows and what a started fight locks in. */
export function squadMultiplier(memberSpeciesId: string, bossSpeciesId: string): number {
  const member = getSpecies(memberSpeciesId);
  const boss = getSpecies(bossSpeciesId);
  if (!member || !boss) return 1;
  return advantageMultiplier(member, boss, { bonus: ADVANTAGE_BONUS, penalty: DISADVANTAGE_PENALTY });
}

// The squad's roster entries with their locked-in multipliers. An entry
// is looked up fresh each time, so its current level/XP always counts.
function squadEntries(squad: SquadMember[]): WeightedEntry[] {
  return squad
    .filter((member) => roster[member.speciesId])
    .map((member) => ({ entry: roster[member.speciesId], multiplier: member.multiplier }));
}

/** Starts the boss on that path with the chosen squad. False and no-op
 * unless the boss is available, no other boss fight is running, and the
 * squad is 1..squadSize owned, distinct species who aren't away on an
 * expedition. Each chip in `chips` (one of each kind at most) is spent
 * and boosts its stats for the whole squad for this fight; chips the
 * player doesn't own are ignored. */
export function startBossFight(
  areaId: string,
  pathId: string,
  squadSpeciesIds: string[],
  now: number = Date.now(),
  chips: ItemId[] = []
): boolean {
  const boss = getPath(areaId, pathId)?.boss;
  if (!boss || combat.boss || !isBossAvailable(areaProgress, areaId, pathId)) return false;
  const unique = [...new Set(squadSpeciesIds)];
  if (unique.length === 0 || unique.length > boss.squadSize || unique.some((id) => !roster[id] || isAway(id))) return false;

  const statBonus: SquadStatBonus = {};
  for (const chip of new Set(chips)) {
    const stats = BOSS_CHIP_STATS[chip];
    if (!stats || !removeItem(chip, 1)) continue;
    for (const stat of stats) statBonus[stat] = (statBonus[stat] ?? 0) + BOSS_CHIP_BONUS;
  }

  const squad = unique.map((speciesId) => ({ speciesId, multiplier: squadMultiplier(speciesId, boss.speciesId) }));
  combat.boss = { areaId, pathId, squad, statBonus };
  combat.wild = makeBossSpawn(now, boss, computeSquadStat(squadEntries(squad), 'hp', statBonus));
  combat.damagePopup = null;
  return true;
}

// Win: rewards every time, recorded as cleared (and unlocks applied) on
// the first. Loss/retreat: nothing. Either way normal spawns resume on the
// next tick.
function endBossFight(won: boolean): void {
  const fight = combat.boss;
  const boss = fight ? getPath(fight.areaId, fight.pathId)?.boss : undefined;
  combat.boss = null;
  combat.wild = null;
  if (!fight || !boss) return;

  let firstClear = false;
  if (won) {
    currency.bits += boss.rewards.bits;
    currency.data += boss.rewards.data;
    firstClear = recordBossVictory(areaProgress, fight.areaId, fight.pathId);
  }
  resultCounter += 1;
  combat.lastBossResult = {
    speciesId: boss.speciesId,
    won,
    bits: won ? boss.rewards.bits : 0,
    data: won ? boss.rewards.data : 0,
    firstClear,
    id: resultCounter,
  };
}

export function retreatBossFight(): void {
  if (combat.boss) endBossFight(false);
}

export function dismissBossResult(): void {
  combat.lastBossResult = null;
}

// ---- Wild fights --------------------------------------------------------

// Both a tick and a click can independently bring HP to 0, so this is the
// single shared kill-resolution path - clearing combat.wild first prevents
// a click landing alongside a tick from double-awarding the same kill.
function resolveKill(wild: NonNullable<CombatState['wild']>) {
  if (combat.boss) {
    endBossFight(true);
    return;
  }
  combat.wild = null;

  const xpValue = computeKillXp(wild.level);
  const bitsValue = computeKillBits(wild.level);

  awardKillXp(xpValue);
  currency.bits += bitsValue;
  recordActivePathKill(areaProgress);

  const egg = rollEggDrop(wild.speciesId);
  if (egg) addEgg(egg);
}

export function handleClick() {
  const wild = combat.wild;
  if (!wild) return;

  const damage = combat.boss
    ? computeSquadClickDamage(squadEntries(combat.boss.squad), combat.boss.statBonus)
    : computeClickDamage(getFightingRoster());
  wild.currentHp = Math.max(0, wild.currentHp - damage);
  showDamagePopup(damage);

  if (wild.currentHp <= 0) {
    resolveKill(wild);
  }
}

// DEBUG: immediately replaces the current wild with one matching the live
// debugSpawn settings - called whenever the panel's enabled/stage/level
// changes, and by tick() below whenever a new spawn is due.
export function applyDebugSpawn(now: number = Date.now()): void {
  if (!debugSpawn.enabled || combat.boss) return;
  const wild = spawnDebugWild(now, debugSpawn.stage, debugSpawn.level);
  if (wild) combat.wild = wild;
}

export function tick(now: number) {
  const wild = combat.wild;
  if (!wild) {
    combat.wild = debugSpawn.enabled ? spawnDebugWild(now, debugSpawn.stage, debugSpawn.level) : null;
    if (!combat.wild) {
      const activePath = getActivePath(areaProgress);
      if (activePath) combat.wild = pickNextWildSpawn(now, activePath);
    }
    return;
  }

  const elapsedSeconds = (now - wild.lastTickAt) / 1000;
  // A boss fight uses only the squad (with matchup multipliers and chip
  // bonuses); a normal fight uses the whole roster minus anyone away on an
  // expedition.
  const squad = combat.boss ? squadEntries(combat.boss.squad) : null;
  const bonus = combat.boss?.statBonus ?? {};
  const attacksPerSecond = squad ? computeSquadAttacksPerSecond(squad, bonus) : computeAttacksPerSecond(getFightingRoster());

  // Discrete attack ticks, not a smooth drain: Speed sets how many whole
  // attacks land per second, each dealing the fighters' flat
  // Attack+SpecialAttack total. Fractional progress toward the next attack
  // carries over in wild.attackProgress instead of being dropped, so the
  // long-run rate still averages out to attacksPerSecond * damagePerHit
  // regardless of how choppy the tick loop's own polling interval is.
  wild.attackProgress += attacksPerSecond * elapsedSeconds;
  const hits = Math.floor(wild.attackProgress);
  if (hits > 0) {
    wild.attackProgress -= hits;
    const damagePerHit = squad ? computeSquadDamagePerHit(squad, bonus) : computeRosterDamagePerHit(getFightingRoster());
    wild.currentHp = Math.max(0, wild.currentHp - hits * damagePerHit);
  }
  wild.lastTickAt = now;

  if (wild.currentHp <= 0) {
    resolveKill(wild);
    return;
  }

  // Only boss fights are timed - running out is a loss (no rewards), and
  // normal spawns resume on the next tick.
  if (wild.timeLimitMs !== null && now >= wild.spawnedAt + wild.timeLimitMs) {
    endBossFight(false);
  }
}
