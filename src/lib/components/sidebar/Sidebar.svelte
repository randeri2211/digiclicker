<script lang="ts">
  import EvolveCta from './EvolveCta.svelte';
  import TeamSection from './TeamSection.svelte';
  import TeamStatsPanel from './TeamStatsPanel.svelte';
  import ContextMenu from '../shared/ContextMenu.svelte';
  import StatWindow from '../shared/StatWindow.svelte';
  import { team, getTeamSlotMenuItems, useAbilityReroll } from '../../game/state/game.svelte';
  import type { TeamBucket } from '../../game/state/game.svelte';
  import type { DigimonInstance } from '../../game/types';

  interface Props {
    onOpenEvolution: () => void;
  }

  const { onOpenEvolution }: Props = $props();

  let menuState: { instance: DigimonInstance; bucket: TeamBucket; x: number; y: number } | null = $state(null);
  let statsFor: DigimonInstance | null = $state(null);

  function openMenu(bucket: TeamBucket, member: DigimonInstance, event: MouseEvent) {
    event.stopPropagation();
    menuState = { instance: member, bucket, x: event.clientX, y: event.clientY };
  }
</script>

<div class="sidebar">
  <EvolveCta onClick={onOpenEvolution} />
  <TeamStatsPanel members={team.activeMembers} />
  <TeamSection
    kind="active"
    capacity={team.activeCapacity}
    maxCapacity={team.activeMaxCapacity}
    members={team.activeMembers}
    onSlotClick={(member, event) => openMenu('active', member, event)}
  />
  <TeamSection
    kind="training"
    capacity={team.trainingCapacity}
    maxCapacity={team.trainingMaxCapacity}
    members={team.trainingMembers}
    onSlotClick={(member, event) => openMenu('training', member, event)}
  />
</div>

{#if menuState}
  <ContextMenu
    x={menuState.x}
    y={menuState.y}
    items={getTeamSlotMenuItems(menuState.instance, menuState.bucket, {
      onOpenStats: () => (statsFor = menuState?.instance ?? null),
      onUseAbilityReroll: () => menuState && useAbilityReroll(menuState.instance),
    })}
    onClose={() => (menuState = null)}
  />
{/if}

{#if statsFor}
  <StatWindow instance={statsFor} onClose={() => (statsFor = null)} />
{/if}

<style>
  .sidebar {
    width: 340px;
    flex-shrink: 0;
    border-left: 1px solid var(--panel-border);
    background: rgba(13, 19, 25, 0.6);
    padding: 24px 20px;
    overflow-y: auto;
  }
</style>
