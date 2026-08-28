<script lang="ts">
  import AreaHeader from './AreaHeader.svelte';
  import Arena from './Arena.svelte';
  import AreaTabs from './AreaTabs.svelte';
  import DebugSpawnPanel from './DebugSpawnPanel.svelte';
</script>

<div class="combat">
  <AreaHeader />
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
