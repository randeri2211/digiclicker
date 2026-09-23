<script lang="ts">
  import AreaHeader from './AreaHeader.svelte';
  import Arena from './Arena.svelte';
  import AreaTabs from './AreaTabs.svelte';
  import PathTabs from './PathTabs.svelte';
  import DebugSpawnPanel from './DebugSpawnPanel.svelte';
  import BossBar from './BossBar.svelte';
  import NpcStrip from './NpcStrip.svelte';

  interface Props {
    onChallengeBoss: (areaId: string, pathId: string) => void;
    onOpenQuests: () => void;
  }

  const { onChallengeBoss, onOpenQuests }: Props = $props();
</script>

<div class="combat">
  <AreaHeader />
  <PathTabs />
  <BossBar onChallenge={onChallengeBoss} />
  <NpcStrip {onOpenQuests} />
  {#if import.meta.env.DEV}
    <DebugSpawnPanel />
  {/if}
  <Arena />
  <AreaTabs />
</div>

<style>
  .combat {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 28px 32px;
    min-width: 0;
  }
</style>
