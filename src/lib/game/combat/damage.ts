import type { DigimonInstance, StatBlock } from '../types';
import { levelForXp } from './levelCurve';
import { damageRelevantSum } from './stats';

// PLACEHOLDER combat formulas - not final game balance.
const CLICK_DAMAGE = 8;
const BASE_ATTACKS_PER_SECOND = 1;
const SPEED_TO_APS_SCALE = 0.02;

export function computeClickDamage(): number {
  return CLICK_DAMAGE;
}

// One member's contribution to a stat (baseStats + level*growthPerLevel +
// digivolutionStats) - the same three-block accumulation used everywhere
// else, generalized so it can total up Speed as well as damage.
function statContribution(member: DigimonInstance, pick: (block: StatBlock) => number): number {
  const level = levelForXp(member.xp);
  return pick(member.baseStats) + level * pick(member.growthPerLevel) + pick(member.digivolutionStats);
}

// This member's flat damage on a single attack tick - not an average, a
// member's Attack+SpecialAttack total is deterministic per instant (no
// per-hit roll), so every tick at a given moment hits for exactly this.
export function computeMemberDamagePerHit(member: DigimonInstance): number {
  return statContribution(member, damageRelevantSum);
}

export function computeTeamDamagePerHit(members: DigimonInstance[]): number {
  return members.reduce((total, member) => total + computeMemberDamagePerHit(member), 0);
}

// Attack rate is a team-wide number (driven by the whole team's summed
// Speed), not per-member - there's one shared tick clock, not one per
// Digimon.
export function computeAttacksPerSecond(members: DigimonInstance[]): number {
  const teamSpeed = members.reduce((total, member) => total + statContribution(member, (block) => block.speed), 0);
  return BASE_ATTACKS_PER_SECOND + teamSpeed * SPEED_TO_APS_SCALE;
}

// Aggregate rate (attacks/sec * damage/hit) - not used by the tick loop
// itself (that simulates discrete attack ticks, see combat.svelte.ts), but
// kept as the single number for any "DPS" display.
export function computeActiveTeamDps(members: DigimonInstance[]): number {
  return computeAttacksPerSecond(members) * computeTeamDamagePerHit(members);
}

// A member's share of team DPS at the shared team attack rate - summing
// this across the team reproduces computeActiveTeamDps exactly.
export function computeMemberDps(member: DigimonInstance, members: DigimonInstance[]): number {
  return computeAttacksPerSecond(members) * computeMemberDamagePerHit(member);
}
