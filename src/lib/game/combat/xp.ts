import type { DigimonInstance, TeamState } from '../types';
import { tryHatch } from '../eggs/eggs';
import { tryAutoDigivolve } from '../evolution/digivolve';
import { levelForXp } from './levelCurve';
import { MAX_LEVEL } from '../constants';

/**
 * Flat-XP rule (GAMEPLAY_DESIGN.md, confirmed): do not divide by team size.
 * Every active AND training member receives the full kill XP value,
 * regardless of team size - growing the team is a pure multiplier on total
 * XP earned, never diluted.
 */
export function awardKillXp(xpValue: number, team: TeamState): void {
  const members: DigimonInstance[] = [...team.activeMembers, ...team.trainingMembers];
  for (const member of members) {
    // Already capped - no more xp to gain (and nothing left to hatch
    // toward either), so skip entirely rather than accumulating xp that
    // levelForXp would just clamp away anyway.
    if (levelForXp(member.xp) >= MAX_LEVEL) continue;

    member.xp += xpValue;
    // Only active/training members ever gain xp, so an egg only ever
    // progresses toward hatching while placed in one of those slots -
    // reserveMembers is naturally "not progressing" with no special-casing.
    tryHatch(member);
    tryAutoDigivolve(member);
  }
}
