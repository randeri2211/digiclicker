<script lang="ts">
  import type { RosterEntry } from '../../game/types';
  import { getSpecies, getSpriteUrl, getSpeciesName } from '../../game/images';
  import { levelForXp } from '../../game/combat/levelCurve';
  import { isReadyToDigivolve } from '../../game/state/game.svelte';
  import XpBar from '../shared/XpBar.svelte';

  interface Props {
    entries: RosterEntry[];
    selectedSpeciesId: string | null;
    onSelect: (speciesId: string) => void;
  }

  const { entries, selectedSpeciesId, onSelect }: Props = $props();

  const sorted = $derived(
    [...entries].sort((a, b) => Number(isReadyToDigivolve(b)) - Number(isReadyToDigivolve(a)))
  );
</script>

<div class="list">
  {#each sorted as entry (entry.speciesId)}
    {@const sprite = getSpriteUrl(entry.speciesId)}
    {@const ready = isReadyToDigivolve(entry)}
    <div
      class="row"
      class:selected={entry.speciesId === selectedSpeciesId}
      onclick={() => onSelect(entry.speciesId)}
      onkeydown={(e) => e.key === 'Enter' && onSelect(entry.speciesId)}
      role="button"
      tabindex="0"
    >
      <div class="thumb">
        {#if sprite}
          <img src={sprite} alt="" />
        {/if}
        {#if ready}
          <span class="ready-dot"></span>
        {/if}
      </div>
      <div class="info">
        <div class="name">{getSpeciesName(entry.speciesId)}</div>
        <div class="meta">Lv {levelForXp(entry.xp)} · {getSpecies(entry.speciesId)?.stage ?? 'Unknown'}</div>
        <div class="row-xp"><XpBar xp={entry.xp} /></div>
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
    flex: 1;
    min-width: 0;
  }
  .row-xp {
    margin-top: 5px;
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
