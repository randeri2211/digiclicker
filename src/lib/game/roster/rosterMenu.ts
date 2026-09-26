import type { ContextMenuItem } from '../../components/shared/ContextMenu.svelte';
import type { DigiMeatId } from '../types';
import { isSystemUnlocked, lockedHint } from '../village/village';
import { inventory } from '../state/inventory.svelte';
import { ITEM_CATALOG } from '../items/itemCatalog';
import { MEAT_IDS } from '../state/shop.svelte';
import { DIGI_MEAT } from '../constants';

// One builder shared by every roster entry menu (the sidebar's top
// contributors and the Roster screen's cards) - a new action is a line
// here, never a new component.
export function getRosterEntryMenuItems(callbacks: {
  onOpenStats: () => void;
  onRerollAbility: () => void;
  /** Feed one Digi-Meat (only meats the player owns are listed). */
  onFeed: (meatId: DigiMeatId) => void;
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
    ...MEAT_IDS.filter((id) => inventory[id] > 0).map((id) => ({
      label: `Feed ${ITEM_CATALOG[id].name} (${inventory[id]}) · +${DIGI_MEAT[id].xp.toLocaleString()} XP`,
      onSelect: () => callbacks.onFeed(id),
    })),
    isSystemUnlocked('ability-rerolls')
      ? { label: 'Reroll ability…', onSelect: callbacks.onRerollAbility }
      : { label: `Reroll ability - ${lockedHint('ability-rerolls').toLowerCase()}`, onSelect: () => {}, disabled: true },
  ];
}
