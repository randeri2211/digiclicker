<script lang="ts">
  import { areaProgress, setActivePath, getArea, isPathUnlocked } from '../../game/state/game.svelte';

  const area = $derived(getArea(areaProgress.activeAreaId));
  const pathEntries = $derived(area ? Object.entries(area.paths) : []);

  function killsFor(pathId: string): number {
    return areaProgress.killsByPath[`${areaProgress.activeAreaId}:${pathId}`] ?? 0;
  }
</script>

<div class="path-tabs">
  {#each pathEntries as [pathId, path] (pathId)}
    {@const unlocked = isPathUnlocked(areaProgress, areaProgress.activeAreaId, pathId)}
    {@const active = pathId === areaProgress.activePathId}
    <div
      class="path-tab"
      class:active
      class:locked={!unlocked}
      onclick={() => unlocked && setActivePath(pathId)}
      onkeydown={(e) => e.key === 'Enter' && unlocked && setActivePath(pathId)}
      role="button"
      tabindex={unlocked ? 0 : -1}
    >
      {#if !unlocked}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="currentColor" stroke-width="1.8" />
          <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" stroke-width="1.8" />
        </svg>
      {/if}
      {path.name}
      {#if active}
        <span class="tab-progress">{Math.min(killsFor(pathId), path.mastery.kills)}/{path.mastery.kills}</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .path-tabs {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }
  .path-tab {
    padding: 8px 16px;
    font-size: 12px;
    letter-spacing: 1px;
    text-transform: uppercase;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .path-tab.active {
    color: var(--text-h);
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .path-tab.locked {
    color: var(--text-dim);
    cursor: not-allowed;
  }
  .tab-progress {
    font-size: 10px;
    color: var(--text-dim);
  }
</style>
