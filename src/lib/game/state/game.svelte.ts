// Composition root - components import game state/actions from here rather
// than reaching into individual state modules directly.
export { currency } from './currency.svelte';
export { roster, isOwned, getRosterList } from './roster.svelte';
export { hatchery, addEgg } from './hatchery.svelte';
export {
  expeditions,
  isAway,
  getFightingRoster,
  startExpedition,
  claimExpedition,
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
export { automation, setAutomationEnabled, setPreference, clearPreference } from './digivolveAutomation.svelte';
export { useAbilityReroll } from '../abilities/abilities';
export { ABILITY_CATALOG } from '../abilities/abilityCatalog';
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
