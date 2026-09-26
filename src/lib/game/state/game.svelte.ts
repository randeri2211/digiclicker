// Composition root - components import game state/actions from here rather
// than reaching into individual state modules directly.
export { currency } from './currency.svelte';
export { roster, isOwned, getRosterList } from './roster.svelte';
export { hatchery, addEgg, hatcherySlotCost, buyHatcherySlot } from './hatchery.svelte';
export {
  expeditions,
  isAway,
  getFightingRoster,
  startExpedition,
  claimExpedition,
  recallExpedition,
  hasReturned,
  dismissHaul,
} from './expeditions.svelte';
export { progress, hasFlag, setFlag } from './progress.svelte';
export { notifications, pushToast, dismissToast } from './notifications.svelte';
export { QUESTS, getQuest, questStatus, requirementProgress, completeQuest } from '../quests/quests';
export type { QuestStatus } from '../quests/quests';
export { inventory } from './inventory.svelte';
export { buyItem, canAffordItem } from '../items/items';
export { ITEM_CATALOG } from '../items/itemCatalog';
export { areaProgress, setActivePath, travelTo } from './areaProgress.svelte';
export { AREAS, getArea, getPath } from '../areas/areaRegistry';
export { isPathUnlocked, isBossAvailable, isBossDefeated, killsOnPath, pathNodeState } from '../areas/areaProgress';
export type { PathNodeState } from '../areas/areaProgress';
export {
  REGIONS,
  MAP_SIZE,
  getRegion,
  getRegionOfArea,
  isAreaBuilt,
  isAreaUnlocked,
  isRegionUnlocked,
} from '../areas/regionRegistry';
export { layoutPathNodes } from '../areas/mapLayout';
export {
  NPCS,
  getNpc,
  getResidents,
  hasJoined,
  isSystemUnlocked,
  lockedHint,
  residentFlag,
  SYSTEM_NAMES,
} from '../village/village';
export { automation, setAutomationEnabled, setPreference, clearPreference } from './digivolveAutomation.svelte';
export { abilityRerollCost, startAbilityReroll, chooseRerolledAbility, currentActNumber } from '../abilities/abilities';
export { abilityRerollDialog, openAbilityReroll, closeAbilityReroll } from './abilityReroll.svelte';
export { ABILITY_CATALOG, ABILITY_FAMILIES, getAbility } from '../abilities/abilityCatalog';
export {
  combat,
  handleClick,
  debugSpawn,
  applyDebugSpawn,
  startBossFight,
  retreatBossFight,
  dismissBossResult,
  squadMultiplier,
} from './combat.svelte';
export { startCombatTickLoop, stopCombatTickLoop } from '../combat/tickLoop';
export {
  computeRosterDps,
  computeClickDamage,
  computeEntryDps,
  computeEntryStatValue,
  computeRosterStatTotal,
  computeAttacksPerSecond,
  computeRosterDamagePerHit,
  computeRosterDamageShares,
} from '../combat/damage';
export {
  activeSlot,
  listSlots,
  loadSlotIntoLiveState,
  startNewGameInSlot,
  saveGame,
  deleteSlot,
  exportSlotToFile,
  importSlotFromFile,
  startAutosave,
  stopAutosave,
} from './persistence.svelte';
export type { SaveSlot } from './saveData';
export { getDigivolveOptions, isReadyToDigivolve, digivolve } from '../evolution/digivolve';
export type { DigivolutionOption } from '../evolution/digivolve';
export { findRootAncestors, rollEggDrop, hatchEgg, isEggReady } from '../eggs/eggs';
export { buyMysteryEgg } from '../eggs/mysteryEggs';
export { getRosterEntryMenuItems } from '../roster/rosterMenu';
export { offline, dismissOfflineReport } from './offline.svelte';
export type { OfflineReport } from './offline.svelte';
export { partners, partnerSlots, isPartner, setPartner } from './partners.svelte';
export { saveSession } from './persistence.svelte';
export { getSaveFileProblem, dismissSaveFileProblem } from './saveData';
export type { SaveFileProblem } from './saveData';
export { backupReminder, snoozeBackupReminder, setBackupReminderOff } from './backupReminder.svelte';
export { playStats } from './playStats.svelte';
export { ACTS, actScreen, openActScreen, closeActScreen, completedActs } from './actScreen.svelte';
export type { ActDefinition } from './actScreen.svelte';
