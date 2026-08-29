<script lang="ts">
  import { areaProgress, getArea, getPath } from '../../game/state/game.svelte';

  const area = $derived(getArea(areaProgress.activeAreaId));
  const path = $derived(getPath(areaProgress.activeAreaId, areaProgress.activePathId));
  const kills = $derived(areaProgress.killsByPath[`${areaProgress.activeAreaId}:${areaProgress.activePathId}`] ?? 0);
</script>

<div class="area-label">{area?.label ?? ''}</div>
<div class="area-name">{area?.name ?? ''}</div>
{#if path}
  <div class="path-name">
    {path.name} · Lv {path.levelRange[0]}-{path.levelRange[1]}
    <span class="path-mastery">Mastery: {Math.min(kills, path.mastery.kills)}/{path.mastery.kills}</span>
  </div>
{/if}

<style>
  .area-label {
    font-size: 12px;
    letter-spacing: 3px;
    color: var(--text-dim);
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .area-name {
    font-family: var(--head);
    font-size: 22px;
    font-weight: 700;
    color: var(--text-h);
    letter-spacing: 1px;
    margin-bottom: 4px;
  }
  .path-name {
    font-size: 13px;
    color: var(--text);
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .path-mastery {
    font-size: 11px;
    color: var(--accent);
  }
</style>
