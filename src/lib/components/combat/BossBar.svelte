<script lang="ts">
  import {
    combat,
    areaProgress,
    getPath,
    isBossAvailable,
    isBossDefeated,
    killsOnPath,
  } from '../../game/state/game.svelte';
  import { getSpeciesName, getSpriteUrl } from '../../game/images';

  interface Props {
    onChallenge: (areaId: string, pathId: string) => void;
  }

  const { onChallenge }: Props = $props();

  const areaId = $derived(areaProgress.activeAreaId);
  const pathId = $derived(areaProgress.activePathId);
  const path = $derived(getPath(areaId, pathId));
  const boss = $derived(path?.boss);
  const available = $derived(isBossAvailable(areaProgress, areaId, pathId));
  const defeated = $derived(isBossDefeated(areaProgress, areaId, pathId));
  const kills = $derived(killsOnPath(areaProgress, areaId, pathId));
</script>

{#if boss && path && !combat.boss}
  {@const sprite = getSpriteUrl(boss.speciesId)}
  <div class="boss-bar" class:ready={available && !defeated} class:locked={!available} data-tip="boss">
    <div class="boss-sprite">
      {#if sprite && available}<img src={sprite} alt="" />{:else}<span class="unknown">?</span>{/if}
    </div>
    <div class="boss-info">
      <span class="boss-label">Area boss</span>
      <span class="boss-name">
        {available ? getSpeciesName(boss.speciesId) : '???'} · Lv {boss.level}
        {#if defeated}<span class="cleared">✓ Cleared</span>{/if}
      </span>
      {#if !available}
        <span class="boss-hint">Appears at path mastery - {Math.min(kills, path.mastery.kills)}/{path.mastery.kills} kills</span>
      {:else}
        <span class="boss-hint">Squad of up to {boss.squadSize} · +{boss.rewards.bits} bits · +{boss.rewards.data} Data</span>
      {/if}
    </div>
    {#if available}
      <button class="challenge" onclick={() => onChallenge(areaId, pathId)}>{defeated ? 'Rematch' : 'Challenge'}</button>
    {/if}
  </div>
{/if}

<style>
  .boss-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    margin-bottom: 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
  }
  .boss-bar.ready {
    border-color: rgba(255, 59, 92, 0.55);
  }
  .boss-sprite {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
  }
  .boss-sprite img {
    width: 82%;
    height: 82%;
    object-fit: contain;
  }
  .unknown {
    font-family: var(--head);
    font-size: 16px;
    color: var(--text-dim);
  }
  .boss-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }
  .boss-label {
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--danger);
  }
  .locked .boss-label {
    color: var(--text-dim);
  }
  .boss-name {
    font-family: var(--head);
    font-size: 13px;
    font-weight: 700;
    color: var(--text-h);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .cleared {
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 400;
    color: var(--pos);
  }
  .boss-hint {
    font-size: 11px;
    color: var(--text);
  }
  .challenge {
    appearance: none;
    font: inherit;
    font-size: 12px;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 8px 16px;
    background: rgba(255, 59, 92, 0.12);
    border: 1px solid var(--danger);
    color: var(--danger);
    cursor: pointer;
  }
  .challenge:hover {
    background: rgba(255, 59, 92, 0.2);
  }
  .challenge:focus-visible {
    outline: 1px solid var(--danger);
    outline-offset: 2px;
  }
</style>
