<script lang="ts">
  import EvolveCta from './EvolveCta.svelte';
  import TeamSection from './TeamSection.svelte';
  import TeamStatsPanel from './TeamStatsPanel.svelte';
  import { team } from '../../game/state/game.svelte';

  interface Props {
    onOpenEvolution: () => void;
  }

  const { onOpenEvolution }: Props = $props();
</script>

<div class="sidebar">
  <EvolveCta onClick={onOpenEvolution} />
  <TeamStatsPanel members={team.activeMembers} />
  <TeamSection
    kind="active"
    capacity={team.activeCapacity}
    maxCapacity={team.activeMaxCapacity}
    members={team.activeMembers}
  />
  <TeamSection
    kind="training"
    capacity={team.trainingCapacity}
    maxCapacity={team.trainingMaxCapacity}
    members={team.trainingMembers}
  />
</div>

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
