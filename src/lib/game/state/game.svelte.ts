// Composition root - components import game state/actions from here rather
// than reaching into individual state modules directly.
export { currency } from './currency.svelte';
export { team } from './team.svelte';
export { combat, handleClick } from './combat.svelte';
export { startCombatTickLoop, stopCombatTickLoop } from '../combat/tickLoop';
export { computeActiveTeamDps, computeMemberDps } from '../combat/damage';
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
