import type { DigimonInstance, TeamState } from '../types';

/**
 * Flat-XP rule (GAMEPLAY_DESIGN.md, confirmed): do not divide by team size.
 * Every active AND training member receives the full kill XP value,
 * regardless of team size - growing the team is a pure multiplier on total
 * XP earned, never diluted.
 */
export function awardKillXp(xpValue: number, team: TeamState): void {
  const members: DigimonInstance[] = [...team.activeMembers, ...team.trainingMembers];
  for (const member of members) {
    member.xp += xpValue;
  }
}
