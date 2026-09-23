import type { DigimonInstance } from '../types';
import type { ContextMenuItem } from '../../components/shared/ContextMenu.svelte';
import { type TeamBucket, hasRoomIn, moveMember } from './teamActions';
import { getItemCount } from '../state/inventory.svelte';

const BUCKET_LABEL: Record<TeamBucket, string> = {
  active: 'Send To Active Team',
  training: 'Send To Training Team',
  reserve: 'Remove From Team',
};

function sendToItem(instanceId: string, toBucket: TeamBucket): ContextMenuItem {
  return {
    label: BUCKET_LABEL[toBucket],
    onSelect: () => moveMember(instanceId, toBucket),
    disabled: !hasRoomIn(toBucket),
  };
}

// One bucket-aware builder shared by every team slot menu (active,
// training, and the Digimon Hub's reserve cards) - a new action (universal
// or bucket-specific) is a line here, never a new component.
export function getTeamSlotMenuItems(
  instance: DigimonInstance,
  bucket: TeamBucket,
  callbacks: { onOpenStats: () => void; onUseAbilityReroll: () => void }
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    { label: 'Open Stats', onSelect: callbacks.onOpenStats },
    {
      label: 'Use Ability Reroll',
      onSelect: callbacks.onUseAbilityReroll,
      disabled: getItemCount('ability-reroll-crystal') === 0,
    },
  ];

  switch (bucket) {
    case 'active':
      items.push(sendToItem(instance.instanceId, 'training'));
      items.push(sendToItem(instance.instanceId, 'reserve'));
      break;
    case 'training':
      items.push(sendToItem(instance.instanceId, 'active'));
      items.push(sendToItem(instance.instanceId, 'reserve'));
      break;
    case 'reserve':
      items.push(sendToItem(instance.instanceId, 'active'));
      items.push(sendToItem(instance.instanceId, 'training'));
      break;
  }

  return items;
}
