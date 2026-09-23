import type { ContextMenuItem } from '../../components/shared/ContextMenu.svelte';
import { getItemCount } from '../state/inventory.svelte';

// One builder shared by every roster entry menu (the sidebar's top
// contributors and the Roster screen's cards) - a new action is a line
// here, never a new component.
export function getRosterEntryMenuItems(callbacks: {
  onOpenStats: () => void;
  onUseAbilityReroll: () => void;
  onOpenDigivolve: () => void;
}): ContextMenuItem[] {
  return [
    { label: 'Open Stats', onSelect: callbacks.onOpenStats },
    { label: 'Digivolve…', onSelect: callbacks.onOpenDigivolve },
    {
      label: 'Use Ability Reroll',
      onSelect: callbacks.onUseAbilityReroll,
      disabled: getItemCount('ability-reroll-crystal') === 0,
    },
  ];
}
