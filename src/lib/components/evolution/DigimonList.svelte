<script lang="ts">
  import type { DigimonInstance } from '../../game/types';
  import { getSpecies, getSpriteUrl } from '../../game/images';
  import { levelForXp } from '../../game/combat/levelCurve';
  import { isReadyToDigivolve } from '../../game/state/game.svelte';

  interface Props {
    members: DigimonInstance[];
    selectedInstanceId: string | null;
    onSelect: (instanceId: string) => void;
  }

  const { members, selectedInstanceId, onSelect }: Props = $props();

  const sorted = $derived(
    [...members].sort((a, b) => Number(isReadyToDigivolve(b)) - Number(isReadyToDigivolve(a)))
  );
</script>

<div class="list">
  {#each sorted as member (member.instanceId)}
    {@const species = getSpecies(member.speciesId)}
    {@const ready = isReadyToDigivolve(member)}
    <div
      class="row"
      class:selected={member.instanceId === selectedInstanceId}
      onclick={() => onSelect(member.instanceId)}
      onkeydown={(e) => e.key === 'Enter' && onSelect(member.instanceId)}
      role="button"
      tabindex="0"
    >
      <div class="thumb">
        {#if getSpriteUrl(member.speciesId)}
          <img src={getSpriteUrl(member.speciesId)} alt="" />
        {/if}
        {#if ready}
          <span class="ready-dot"></span>
        {/if}
      </div>
      <div class="info">
        <div class="name">{species?.name ?? member.speciesId}</div>
        <div class="meta">Lv {levelForXp(member.xp)} · {species?.stage ?? 'Unknown'}</div>
      </div>
    </div>
  {/each}
</div>

<style>
  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    padding-right: 4px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    cursor: pointer;
  }
  .row:hover {
    border-color: var(--panel-border-strong);
  }
  .row.selected {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .thumb {
    position: relative;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .thumb img {
    width: 80%;
    height: 80%;
    object-fit: contain;
  }
  .ready-dot {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 8px;
    height: 8px;
    background: var(--warn);
    box-shadow: 0 0 6px var(--warn);
    border-radius: 50%;
  }
  .info {
    min-width: 0;
  }
  .name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-h);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meta {
    font-size: 11px;
    color: var(--text-dim);
    margin-top: 2px;
  }
</style>
