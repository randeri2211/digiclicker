import type { ContextMenuItem } from '../../components/shared/ContextMenu.svelte';
import { isSystemUnlocked, lockedHint } from '../village/village';

// One builder shared by every roster entry menu (the sidebar's top
// contributors and the Roster screen's cards) - a new action is a line
// here, never a new component.
export function getRosterEntryMenuItems(callbacks: {
  onOpenStats: () => void;
  onRerollAbility: () => void;
  onOpenDigivolve: () => void;
  /** Partner toggle for this entry (omit to hide it). */
  partner?: { isPartner: boolean; slotFree: boolean; onToggle: () => void };
}): ContextMenuItem[] {
  const partner = callbacks.partner;
  return [
    { label: 'Open Stats', onSelect: callbacks.onOpenStats },
    { label: 'Digivolve…', onSelect: callbacks.onOpenDigivolve },
    ...(partner
      ? [
          {
            label: partner.isPartner ? 'Remove partner' : partner.slotFree ? 'Make partner ★' : 'Make partner (slots full)',
            onSelect: partner.onToggle,
            disabled: !partner.isPartner && !partner.slotFree,
          },
        ]
      : []),
    isSystemUnlocked('ability-rerolls')
      ? { label: 'Reroll ability…', onSelect: callbacks.onRerollAbility }
      : { label: `Reroll ability - ${lockedHint('ability-rerolls').toLowerCase()}`, onSelect: () => {}, disabled: true },
  ];
}
