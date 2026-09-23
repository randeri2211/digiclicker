// Composition root - components import game state/actions from here rather
// than reaching into individual state modules directly.
export { currency } from './currency.svelte';
export { team } from './team.svelte';
export { inventory } from './inventory.svelte';
export { buyItem, canAffordItem } from '../items/items';
export { ITEM_CATALOG } from '../items/itemCatalog';
export { areaProgress, setActivePath } from './areaProgress.svelte';
export { AREAS, getArea, getPath } from '../areas/areaRegistry';
export { isPathUnlocked } from '../areas/areaProgress';
export { compendium, isDiscovered } from './compendium.svelte';
export { automation, setAutomationEnabled, setPreference, clearPreference } from './digivolveAutomation.svelte';
export { useAbilityReroll } from '../abilities/abilities';
export { ABILITY_CATALOG } from '../abilities/abilityCatalog';
export { combat, handleClick, debugSpawn, applyDebugSpawn } from './combat.svelte';
export { startCombatTickLoop, stopCombatTickLoop } from '../combat/tickLoop';
export {
  computeActiveTeamDps,
  computeMemberDps,
  computeInstanceStatValue,
  computeAttacksPerSecond,
  computeTeamDamagePerHit,
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
export {
  getDigivolveOptions,
  getDedigivolveOptions,
  isReadyToDigivolve,
  digivolve,
  dedigivolve,
} from '../evolution/digivolve';
export type { DigivolutionOption } from '../evolution/digivolve';
export { findRootAncestors, rollEggDrop, tryHatch } from '../eggs/eggs';
export { buyMysteryEgg } from '../eggs/mysteryEggs';
export { moveMember, hasRoomIn } from '../team/teamActions';
export type { TeamBucket } from '../team/teamActions';
export { getTeamSlotMenuItems } from '../team/teamMenu';
