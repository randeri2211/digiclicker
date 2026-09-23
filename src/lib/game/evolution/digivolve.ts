import type { DigimonSpecies, RosterEntry, StatRangeBlock } from '../types';
import { getSpecies } from '../images';
import { getRequirement, isRequirementMet } from './requirements';
import type { DigivolutionRequirement } from './requirements';
import {
  rollInheritedBonus,
  computeInheritedBonusRange,
  computeGrowthPerLevelRange,
  maxStatBlocks,
  canRangeImprove,
} from '../combat/stats';
import { levelForXp } from '../combat/levelCurve';
import { IN_GAME_STAGES } from '../constants';
import { createRosterEntry } from '../roster/starterRoster';
import { roster, addToRoster, isOwned } from '../state/roster.svelte';
import { automation, setPreference } from '../state/digivolveAutomation.svelte';

// Species whose stage isn't in IN_GAME_STAGES stay fully present in the
// scraped data (so nothing is lost, and re-enabling a stage later is a
// one-line change in constants.ts) but never surface as a digivolve
// option.
function isInGameSpecies(species: DigimonSpecies): boolean {
  return IN_GAME_STAGES.has(species.stage);
}

// Stage-skipping evolvesTo edges (2+ tiers at once - see
// classify_evolution_skips in EvolutionGraphConverter.py) are disabled
// in-game for now, regardless of whether they're a redundant "shortcut"
// or an essential "path" - source is the edge's OWN species (the one
// whose evolvesTo the edge came from), since evolutionSkips is only ever
// populated on that side, never on the target.
function isSkipEdge(source: DigimonSpecies, targetId: string): boolean {
  return Boolean(source.evolutionSkips?.[targetId]);
}

export interface DigivolutionOption {
  species: DigimonSpecies;
  requirement: DigivolutionRequirement | null;
  requirementMet: boolean;
  /** Already in the roster - digivolving into it again is an "upgrade":
   * it improves the owned entry's inheritedBonus instead of adding a copy
   * (the roster holds one entry per species). */
  owned: boolean;
  /** Always true for an unowned target. For an owned one, true only if the
   * best possible roll at the source's current level beats the owned
   * entry's inheritedBonus on at least one stat - otherwise an upgrade
   * would just throw the source's levels away. */
  canImprove: boolean;
  /** Range only, not a rolled value - the actual roll happens once, at the
   * moment digivolve() is called, so there's nothing for the player to
   * preview-reroll by reopening the screen before committing. */
  inheritedBonusRange: StatRangeBlock;
  growthPerLevelRange: StatRangeBlock;
}

// The in-game, non-skip targets of a species - shared by the options list
// and the cheaper readiness check below.
function getTargetSpecies(current: DigimonSpecies): DigimonSpecies[] {
  return current.evolvesTo
    .filter((targetId) => !isSkipEdge(current, targetId))
    .map((targetId) => getSpecies(targetId))
    .filter((species): species is DigimonSpecies => species !== undefined && isInGameSpecies(species));
}

/**
 * evolvesFrom on the target species can list multiple sources (DNA/fusion
 * digivolutions, e.g. omnimon has 14) - that ambiguity never surfaces here
 * since this only ever reads the source entry's own evolvesTo.
 */
export function getDigivolveOptions(entry: RosterEntry): DigivolutionOption[] {
  const current = getSpecies(entry.speciesId);
  if (!current) return [];

  const preTransitionLevel = levelForXp(entry.xp);
  return getTargetSpecies(current).map((species) => {
    const requirement = getRequirement(entry.speciesId, species.id);
    const inheritedBonusRange = computeInheritedBonusRange(species.stage, species.statAffinity, preTransitionLevel);
    const ownedEntry = roster[species.id];
    return {
      species,
      requirement,
      requirementMet: isRequirementMet(entry, requirement),
      owned: ownedEntry !== undefined,
      canImprove: !ownedEntry || canRangeImprove(inheritedBonusRange, ownedEntry.inheritedBonus),
      inheritedBonusRange,
      growthPerLevelRange: computeGrowthPerLevelRange(species.stage, species.statAffinity),
    };
  });
}

// Deliberately doesn't reuse getDigivolveOptions() for a readiness check
// that may run on every render (e.g. the ready-count badge) - avoids
// building full option objects (with their stat ranges) for every entry.
// Counts only NEW forms, not upgrades of owned ones - almost every entry
// past its level gate could upgrade something, which would leave the
// badge permanently lit.
export function isReadyToDigivolve(entry: RosterEntry): boolean {
  const current = getSpecies(entry.speciesId);
  if (!current) return false;
  return getTargetSpecies(current).some(
    (species) => !isOwned(species.id) && isRequirementMet(entry, getRequirement(entry.speciesId, species.id))
  );
}

/**
 * The only place a digivolve happens (auto-fired ones included, see
 * tryAutoDigivolve below). False and no-op unless the target is a real,
 * in-game option for this source, its requirement is met, and - for an
 * already-owned target - the upgrade could actually improve something.
 *
 * Rolls an inheritedBonus from the source's level right now - the roll
 * happens only here, never passed in from the UI (which only sees the
 * deterministic range preview), so there's no way to peek it before
 * committing. An unowned target joins the roster as a NEW entry with that
 * bonus (the source stays). An owned target is upgraded instead: each
 * stat keeps the higher of its current bonus and the new roll, so it can
 * only ever improve. Either way the source then resets to level 1 - its
 * levels are "spent" on the new form or the upgrade.
 *
 * Also records the "last choice" for this source species, regardless of
 * whether automation is enabled - so turning automation on later already
 * benefits from whatever was played manually before. An existing
 * preference for the same target is left untouched (a pinned custom
 * minLevel survives); only picking a DIFFERENT target replaces it, at that
 * target's base requirement.
 */
export function digivolve(entry: RosterEntry, targetSpeciesId: string): boolean {
  const option = getDigivolveOptions(entry).find((o) => o.species.id === targetSpeciesId);
  if (!option || !option.requirementMet || !option.canImprove) return false;

  const target = option.species;
  const sourceLevel = levelForXp(entry.xp);
  const inheritedBonus = rollInheritedBonus(target.stage, target.statAffinity, sourceLevel);
  const ownedTarget = roster[target.id];
  if (ownedTarget) {
    ownedTarget.inheritedBonus = maxStatBlocks(ownedTarget.inheritedBonus, inheritedBonus);
    ownedTarget.inheritedFromLevel = Math.max(ownedTarget.inheritedFromLevel, sourceLevel);
  } else {
    addToRoster(createRosterEntry(target.id, inheritedBonus, sourceLevel));
  }
  entry.xp = 0;

  if (automation.preferences[entry.speciesId]?.targetSpeciesId !== target.id) {
    setPreference(entry.speciesId, target.id, option.requirement?.minLevel ?? 0);
  }
  return true;
}

// Called after every xp award (see awardKillXp in combat/xp.ts) - fires a
// digivolve with no player interaction when automation is on, this
// entry's species has a saved preference, and the entry's level has
// crossed that preference's own minLevel (an optional extra floor on top
// of - never a replacement for - the real requirement, which digivolve()
// itself enforces). Only ever UNLOCKS a new form, never upgrades an owned
// one: targets with no level requirement would otherwise re-fire on every
// kill and pin the source at level 1 forever. Upgrades stay manual.
export function tryAutoDigivolve(entry: RosterEntry): void {
  if (!automation.enabled) return;

  const preference = automation.preferences[entry.speciesId];
  if (!preference || isOwned(preference.targetSpeciesId)) return;
  if (levelForXp(entry.xp) < preference.minLevel) return;

  digivolve(entry, preference.targetSpeciesId);
}
