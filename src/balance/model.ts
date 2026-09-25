// The Balance Lab's model of the game's scaling formulas, parameterized by a
// draft balance object instead of the live constants - so charts can redraw
// on every keystroke before anything is saved.
//
// Most formulas here MIRROR one in src/lib/game (named next to each) - if
// you change a formula in the game, change it here too. The fight timer and
// the leveling curves (incl. kill XP) are the exception: both sides import
// combat/fightTimer.ts and combat/levelCurveFormulas.ts directly. Deliberately never
// imports constants.ts: that module imports balance.json, so the lab would
// hot-reload itself every time it saves.
import { AREAS } from '../lib/game/areas/areaRegistry';
import { getSpecies, getSpeciesIdsByStage } from '../lib/game/images';
import type { StatAffinity, StatBlock } from '../lib/game/types';
import { fightTimerSeconds as sharedFightTimerSeconds } from '../lib/game/combat/fightTimer';
import type { FightTimerFormula, FightTimerParams } from '../lib/game/combat/fightTimer';
import { curveValue, type CurveFormula, type CurveParams } from '../lib/game/combat/levelCurveFormulas';
import { diminishedSum } from '../lib/game/combat/rosterFalloff';

type BalanceModule = typeof import('../lib/game/balance.json');
export type Balance = BalanceModule extends { default: infer D } ? D : BalanceModule;

// Mirrors IN_GAME_STAGES in constants.ts (copied, not imported - see above).
export const STAGES = ['Fresh', 'In-Training', 'Rookie', 'Champion', 'Ultimate', 'Mega'] as const;
export type InGameStage = (typeof STAGES)[number];

const STAT_KEYS: (keyof StatBlock)[] = ['attack', 'hp', 'speed', 'specialAttack'];
const STAT_TO_AFFINITY: Record<keyof StatBlock, StatAffinity> = {
  attack: 'Attack',
  hp: 'HP',
  speed: 'Speed',
  specialAttack: 'SpecialAttack',
};

// Real share of each stat affinity per stage, from the species data - an
// "average Rookie" is ~half Attack-type, an average Fresh mostly HP-type.
export const AFFINITY_SHARE: Record<InGameStage, Record<StatAffinity, number>> = Object.fromEntries(
  STAGES.map((stage) => {
    const ids = getSpeciesIdsByStage(stage);
    const counts: Record<StatAffinity, number> = { Attack: 0, HP: 0, Speed: 0, SpecialAttack: 0 };
    for (const id of ids) {
      const affinity = getSpecies(id)?.statAffinity;
      if (affinity) counts[affinity] += 1;
    }
    const total = Math.max(1, ids.length);
    return [stage, Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v / total]))];
  })
) as Record<InGameStage, Record<StatAffinity, number>>;

/** An example roster to test the numbers against - not saved to
 * balance.json, only remembered by this browser. */
export interface Scenario {
  counts: Record<InGameStage, number>;
  level: number;
  /** Source level the digivolved entries inherited from. */
  inheritedFromLevel: number;
  clicksPerSecond: number;
  /** Normal wild fights are untimed, so "can the roster win" becomes "how
   * fast": kills slower than this count as slow. */
  targetKillSeconds: number;
  /** Boss check: the matchup multiplier assumed for every squad member
   * (1 = neutral, 1.5 = one edge won, 2 = both). */
  bossMatchup: number;
}

export const DEFAULT_SCENARIO: Scenario = {
  counts: { Fresh: 3, 'In-Training': 4, Rookie: 8, Champion: 5, Ultimate: 1, Mega: 0 },
  level: 20,
  inheritedFromLevel: 20,
  clicksPerSecond: 6,
  targetKillSeconds: 10,
  bossMatchup: 1.5,
};

// combat/stats.ts computeStatRange midpoint: (power * scale + level *
// INHERITED_BONUS_LEVEL_SCALE) * factor, averaged over the stage's real
// affinity mix. Fresh entries come from eggs (no inherited bonus); every
// other stage is assumed to have been digivolved into.
function averageFactor(b: Balance, stage: InGameStage, stat: keyof StatBlock): number {
  const dominantShare = AFFINITY_SHARE[stage][STAT_TO_AFFINITY[stat]];
  return dominantShare * b.STAT_DOMINANT_FACTOR + (1 - dominantShare) * b.STAT_OFF_FACTOR;
}

// combat/damage.ts computeEntryStatValue (ability bonus left out - it's an
// item-driven extra, not part of the baseline curve).
export function entryStat(b: Balance, stage: InGameStage, stat: keyof StatBlock, level: number, inheritedFromLevel: number): number {
  const power = b.STAGE_POWER[stage];
  const factor = averageFactor(b, stage, stat);
  const base = power * b.BASE_STAT_SCALE * factor;
  const growth = power * b.GROWTH_PER_LEVEL_SCALE * factor;
  const inherited =
    stage === 'Fresh' ? 0 : (power * b.INHERITED_BONUS_SCALE + inheritedFromLevel * b.INHERITED_BONUS_LEVEL_SCALE) * factor;
  return base + level * growth + inherited;
}

// Not a mirror - the lab runs the game's own fightTimer.ts, fed from the
// draft (optionally with a different formula, for comparison curves).
export function fightTimerParams(b: Balance, formula = b.FIGHT_TIMER_FORMULA as FightTimerFormula): FightTimerParams {
  return {
    formula,
    baseSeconds: b.FIGHT_TIMER_BASE_SECONDS,
    maxBonusSeconds: b.FIGHT_TIMER_MAX_BONUS_SECONDS,
    halfBonusHp: b.FIGHT_TIMER_HALF_BONUS_HP,
    fullBonusHp: b.FIGHT_TIMER_FULL_BONUS_HP,
    powerExponent: b.FIGHT_TIMER_POWER_EXPONENT,
  };
}

export function fightTimerSeconds(b: Balance, rosterHp: number, formula?: FightTimerFormula): number {
  return sharedFightTimerSeconds(fightTimerParams(b, formula), rosterHp);
}

// combat/spawn.ts computeWildMaxHp.
export function wildHp(b: Balance, stage: InGameStage, level: number): number {
  return Math.round(b.WILD_HP_BASE * b.WILD_HP_STAGE_MULTIPLIER[stage] * Math.pow(b.WILD_HP_LEVEL_GROWTH_FACTOR, level));
}

// Not mirrors - the lab builds its leveling curves through the game's own
// levelCurveFormulas.ts, fed from the draft (optionally with a different
// formula, for comparison curves).
export function levelXpCurve(b: Balance, formula = b.LEVEL_XP_FORMULA as CurveFormula): CurveParams {
  return {
    formula,
    first: b.LEVEL_XP_FIRST,
    last: b.LEVEL_XP_LAST,
    exponent: b.LEVEL_XP_EXPONENT,
    growth: b.LEVEL_XP_GROWTH,
  };
}

export function killXpCurve(b: Balance, formula = b.KILL_XP_FORMULA as CurveFormula): CurveParams {
  return {
    formula,
    first: b.KILL_XP_FIRST,
    last: b.KILL_XP_LAST,
    exponent: b.KILL_XP_EXPONENT,
    growth: b.KILL_XP_GROWTH,
  };
}

/** [level, value] for every level from 1 to MAX_LEVEL - 1. */
export function curvePoints(b: Balance, curve: CurveParams): [number, number][] {
  const out: [number, number][] = [];
  for (let level = 1; level < b.MAX_LEVEL; level++) out.push([level, curveValue(curve, level, b.MAX_LEVEL)]);
  return out;
}

// combat/spawn.ts computeKillXp - the same shared curve, not a mirror.
export function killXp(b: Balance, wildLevel: number): number {
  return Math.max(0, curveValue(killXpCurve(b), Math.max(1, wildLevel), b.MAX_LEVEL));
}

/** [level, kills] for every level-up - calculated, not a setting: XP cost
 * of the level-up from L divided by the XP of a level-L wild (fighting
 * wilds at your own level). */
export function killsPerLevelUp(b: Balance): [number, number][] {
  const xp = levelXpCurve(b);
  return curvePoints(b, xp).map(([level, cost]) => {
    const perKill = killXp(b, level);
    return [level, perKill > 0 ? cost / perKill : Number.NaN];
  });
}

export interface RosterSummary {
  size: number;
  totals: StatBlock;
  attacksPerSecond: number;
  damagePerHit: number;
  dps: number;
  clickDamage: number;
  /** DPS while clicking at the example roster's clicks per second. */
  activeDps: number;
  /** Damage dealt within the example roster's target kill time. */
  idleDamagePerFight: number;
  activeDamagePerFight: number;
}

// combat/damage.ts computeAttacksPerSecond / computeRosterDamagePerHit /
// computeRosterDps / computeClickDamage, over the whole scenario roster.
export function summarizeRoster(b: Balance, s: Scenario): RosterSummary {
  // One value per member, then the game's diminishing-returns sum
  // (combat/rosterFalloff.ts) - the same totals the game computes.
  const perMember: Record<keyof StatBlock, number[]> = { attack: [], hp: [], speed: [], specialAttack: [] };
  const damage: number[] = [];
  let size = 0;
  for (const stage of STAGES) {
    const count = s.counts[stage] ?? 0;
    size += count;
    const values: StatBlock = {
      attack: entryStat(b, stage, 'attack', s.level, s.inheritedFromLevel),
      hp: entryStat(b, stage, 'hp', s.level, s.inheritedFromLevel),
      speed: entryStat(b, stage, 'speed', s.level, s.inheritedFromLevel),
      specialAttack: entryStat(b, stage, 'specialAttack', s.level, s.inheritedFromLevel),
    };
    for (let i = 0; i < count; i++) {
      for (const stat of STAT_KEYS) perMember[stat].push(values[stat]);
      damage.push(values.attack + values.specialAttack);
    }
  }
  const totals: StatBlock = {
    attack: diminishedSum(perMember.attack, b.ROSTER_STAT_FALLOFF),
    hp: diminishedSum(perMember.hp, b.ROSTER_STAT_FALLOFF),
    speed: diminishedSum(perMember.speed, b.ROSTER_STAT_FALLOFF),
    specialAttack: diminishedSum(perMember.specialAttack, b.ROSTER_STAT_FALLOFF),
  };
  const attacksPerSecond = b.BASE_ATTACKS_PER_SECOND + totals.speed * b.SPEED_TO_APS_SCALE;
  const damagePerHit = diminishedSum(damage, b.ROSTER_STAT_FALLOFF);
  const dps = attacksPerSecond * damagePerHit;
  const clickDamage = b.CLICK_DAMAGE_BASE + dps * b.CLICK_DAMAGE_DPS_FRACTION;
  return {
    size,
    totals,
    attacksPerSecond,
    damagePerHit,
    dps,
    clickDamage,
    activeDps: dps + s.clicksPerSecond * clickDamage,
    idleDamagePerFight: dps * s.targetKillSeconds,
    activeDamagePerFight: (dps + s.clicksPerSecond * clickDamage) * s.targetKillSeconds,
  };
}

/** Highest wild level of this stage the roster kills within the target
 * time (i.e. `damagePerFight` covers its HP), or 0 if not even level 1. */
export function maxWinnableLevel(b: Balance, stage: InGameStage, damagePerFight: number): number {
  let best = 0;
  for (let level = 1; level <= b.MAX_LEVEL; level++) {
    if (wildHp(b, stage, level) <= damagePerFight) best = level;
    else break;
  }
  return best;
}

export type Verdict = 'idle' | 'clicking' | 'too-hard';

export interface PathCheck {
  areaName: string;
  pathName: string;
  levelRange: [number, number];
  /** The toughest spawn in the path's pool: highest wild HP at its top level. */
  toughestName: string;
  toughestLevel: number;
  toughestHp: number;
  /** Seconds to kill the toughest spawn, idle and while clicking. */
  idleKillSeconds: number;
  activeKillSeconds: number;
  verdict: Verdict;
}

// Checks every real area path (src/lib/data/areas) against the roster:
// does it kill the toughest spawn within the target time idle, only while
// clicking, or not at all (normal fights are untimed - "too-hard" here
// means slow, not unwinnable).
export function checkPaths(b: Balance, summary: RosterSummary): PathCheck[] {
  return Object.values(AREAS).flatMap((area) =>
    Object.values(area.paths).map((path) => {
      let toughest = { name: '', level: 0, hp: 0 };
      for (const entry of path.digimonPool) {
        const species = getSpecies(entry.id);
        const stage = species?.stage as InGameStage | undefined;
        if (!species || !stage || !STAGES.includes(stage)) continue;
        const topLevel = (entry.levelRange ?? path.levelRange)[1];
        const hp = wildHp(b, stage, topLevel);
        if (hp > toughest.hp) toughest = { name: species.name, level: topLevel, hp };
      }
      const verdict: Verdict =
        toughest.hp <= summary.idleDamagePerFight
          ? 'idle'
          : toughest.hp <= summary.activeDamagePerFight
            ? 'clicking'
            : 'too-hard';
      return {
        areaName: area.name,
        pathName: path.name,
        levelRange: path.levelRange,
        toughestName: toughest.name,
        toughestLevel: toughest.level,
        toughestHp: toughest.hp,
        idleKillSeconds: summary.dps > 0 ? toughest.hp / summary.dps : Infinity,
        activeKillSeconds: summary.activeDps > 0 ? toughest.hp / summary.activeDps : Infinity,
        verdict,
      };
    })
  );
}

export interface BossCheck {
  areaName: string;
  pathName: string;
  bossName: string;
  level: number;
  hp: number;
  squadSize: number;
  /** "3 Champion", "2 Ultimate + 1 Champion", ... from the example roster. */
  squadText: string;
  squadHp: number;
  timerSeconds: number;
  idleKillSeconds: number;
  activeKillSeconds: number;
  verdict: Verdict;
}

// Every boss in the area data, fought by a squad of the example roster's
// highest-stage members (up to the boss's squad size), each at the assumed
// matchup multiplier - the same squad formulas as combat/damage.ts, and
// the game's own fight timer on the squad's HP.
export function checkBosses(b: Balance, s: Scenario): BossCheck[] {
  const out: BossCheck[] = [];
  for (const area of Object.values(AREAS)) {
    for (const path of Object.values(area.paths)) {
      const boss = path.boss;
      const bossSpecies = boss ? getSpecies(boss.speciesId) : undefined;
      const bossStage = bossSpecies?.stage as InGameStage | undefined;
      if (!boss || !bossSpecies || !bossStage || !STAGES.includes(bossStage)) continue;

      const picked: { stage: InGameStage; count: number }[] = [];
      let left = boss.squadSize;
      for (const stage of [...STAGES].reverse()) {
        const take = Math.min(left, s.counts[stage] ?? 0);
        if (take > 0) picked.push({ stage, count: take });
        left -= take;
        if (left <= 0) break;
      }
      const totals: StatBlock = { attack: 0, hp: 0, speed: 0, specialAttack: 0 };
      for (const { stage, count } of picked) {
        for (const stat of STAT_KEYS) {
          totals[stat] += count * entryStat(b, stage, stat, s.level, s.inheritedFromLevel) * s.bossMatchup;
        }
      }
      const dps = (b.BASE_ATTACKS_PER_SECOND + totals.speed * b.SPEED_TO_APS_SCALE) * (totals.attack + totals.specialAttack);
      const click = b.CLICK_DAMAGE_BASE + dps * b.CLICK_DAMAGE_DPS_FRACTION;
      const hp = Math.round(wildHp(b, bossStage, boss.level) * boss.hpMultiplier);
      const timerSeconds = fightTimerSeconds(b, totals.hp);
      const idleKillSeconds = dps > 0 ? hp / dps : Infinity;
      const activeDps = dps + s.clicksPerSecond * click;
      const activeKillSeconds = activeDps > 0 ? hp / activeDps : Infinity;
      out.push({
        areaName: area.name,
        pathName: path.name,
        bossName: bossSpecies.name,
        level: boss.level,
        hp,
        squadSize: boss.squadSize,
        squadText: picked.length ? picked.map((p) => `${p.count} ${p.stage}`).join(' + ') : 'none',
        squadHp: totals.hp,
        timerSeconds,
        idleKillSeconds,
        activeKillSeconds,
        verdict: idleKillSeconds <= timerSeconds ? 'idle' : activeKillSeconds <= timerSeconds ? 'clicking' : 'too-hard',
      });
    }
  }
  return out;
}

/** Compact number for labels: 1234 -> 1.23k, 4.4e7 -> 44M. */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '–';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${+(n / 1e9).toPrecision(3)}B`;
  if (abs >= 1e6) return `${+(n / 1e6).toPrecision(3)}M`;
  if (abs >= 1e3) return `${+(n / 1e3).toPrecision(3)}k`;
  if (abs >= 100) return `${Math.round(n)}`;
  return `${+n.toPrecision(3)}`;
}
