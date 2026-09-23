<script lang="ts">
  import type { RosterEntry, Stage } from '../game/types';
  import { getSpecies, getSpriteUrl, getSpeciesName } from '../game/images';
  import { levelForXp } from '../game/combat/levelCurve';
  import { IN_GAME_STAGES } from '../game/constants';
  import {
    getRosterList,
    getRosterEntryMenuItems,
    useAbilityReroll,
    computeAttacksPerSecond,
    computeEntryDps,
  } from '../game/state/game.svelte';
  import ContextMenu from './shared/ContextMenu.svelte';
  import StatWindow from './shared/StatWindow.svelte';
  import XpBar from './shared/XpBar.svelte';
  import SpeciesTags from './shared/SpeciesTags.svelte';

  interface Props {
    /** speciesId preselects that entry on the Evolution screen. */
    onOpenEvolution: (speciesId: string) => void;
    onClose: () => void;
  }

  const { onOpenEvolution, onClose }: Props = $props();

  type SortKey = 'dps' | 'level' | 'stage';
  const STAGES = [...IN_GAME_STAGES] as Stage[];

  let stageFilter: Stage | 'all' = $state('all');
  let sortKey: SortKey = $state('dps');

  function stageOrderOf(entry: RosterEntry): number {
    return getSpecies(entry.speciesId)?.stageOrder ?? 0;
  }

  const entries = $derived.by(() => {
    const all = getRosterList();
    const attacksPerSecond = computeAttacksPerSecond(all);
    const filtered = stageFilter === 'all' ? all : all.filter((e) => getSpecies(e.speciesId)?.stage === stageFilter);
    const rows = filtered.map((entry) => ({ entry, dps: computeEntryDps(entry, attacksPerSecond) }));
    switch (sortKey) {
      case 'dps':
        return rows.sort((a, b) => b.dps - a.dps);
      case 'level':
        return rows.sort((a, b) => b.entry.xp - a.entry.xp);
      case 'stage':
        return rows.sort((a, b) => stageOrderOf(b.entry) - stageOrderOf(a.entry));
    }
  });

  let menuState: { entry: RosterEntry; x: number; y: number } | null = $state(null);
  let statsFor: RosterEntry | null = $state(null);

  function openMenu(entry: RosterEntry, event: MouseEvent) {
    event.stopPropagation();
    menuState = { entry, x: event.clientX, y: event.clientY };
  }

  $effect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div
  class="backdrop"
  onclick={onClose}
  onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onClose()}
  role="button"
  tabindex="0"
>
  <div
    class="panel"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="dialog"
    tabindex="-1"
  >
    <div class="panel-header">
      <div class="panel-title">Roster</div>
      <button class="close-btn" onclick={onClose}>Close</button>
    </div>

    <div class="controls">
      <label class="filter-toggle">
        Stage
        <select bind:value={stageFilter}>
          <option value="all">All</option>
          {#each STAGES as stage (stage)}
            <option value={stage}>{stage}</option>
          {/each}
        </select>
      </label>
      <label class="filter-toggle">
        Sort by
        <select bind:value={sortKey}>
          <option value="dps">DPS</option>
          <option value="level">Level</option>
          <option value="stage">Stage</option>
        </select>
      </label>
    </div>

    <div class="grid">
      {#if entries.length === 0}
        <div class="empty-note">No Digimon here.</div>
      {:else}
        {#each entries as row (row.entry.speciesId)}
          {@const sprite = getSpriteUrl(row.entry.speciesId)}
          <button class="card" onclick={(e) => openMenu(row.entry, e)}>
            <div class="card-sprite">
              {#if sprite}
                <img src={sprite} alt="" />
              {/if}
            </div>
            <div class="card-name">{getSpeciesName(row.entry.speciesId)}</div>
            <div class="card-meta">
              Lv {levelForXp(row.entry.xp)} · {getSpecies(row.entry.speciesId)?.stage ?? 'Unknown'}
            </div>
            <div class="card-xp"><XpBar xp={row.entry.xp} /></div>
            <SpeciesTags speciesId={row.entry.speciesId} />
            <div class="card-meta">{row.dps.toFixed(1)} DPS</div>
          </button>
        {/each}
      {/if}
    </div>
  </div>
</div>

{#if menuState}
  {@const entry = menuState.entry}
  <ContextMenu
    x={menuState.x}
    y={menuState.y}
    items={getRosterEntryMenuItems({
      onOpenStats: () => (statsFor = entry),
      onUseAbilityReroll: () => useAbilityReroll(entry),
      onOpenDigivolve: () => onOpenEvolution(entry.speciesId),
    })}
    onClose={() => (menuState = null)}
  />
{/if}

{#if statsFor}
  <StatWindow entry={statsFor} onClose={() => (statsFor = null)} />
{/if}

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(5, 7, 10, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  .panel {
    width: 92%;
    height: 88%;
    max-width: 1280px;
    background: var(--panel);
    border: 1px solid var(--panel-border-strong);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .panel-title {
    font-family: var(--head);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-h);
  }
  .close-btn {
    appearance: none;
    font: inherit;
    font-family: var(--mono);
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    font-size: 12px;
    padding: 8px 14px;
    cursor: pointer;
  }
  .close-btn:hover {
    border-color: var(--panel-border-strong);
    color: var(--text-h);
  }
  .controls {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .filter-toggle select {
    font: inherit;
    font-family: var(--mono);
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text-h);
    padding: 2px 4px;
  }
  .filter-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--text-dim);
    cursor: pointer;
  }
  .grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
    overflow-y: auto;
    align-content: start;
  }
  .empty-note {
    font-size: 13px;
    color: var(--text-dim);
    padding: 20px;
  }
  .card {
    appearance: none;
    font: inherit;
    font-family: var(--mono);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 10px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
  }
  .card:hover {
    border-color: var(--accent);
  }
  .card-sprite {
    position: relative;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--panel);
    border: 1px solid var(--panel-border);
  }
  .card-sprite img {
    width: 82%;
    height: 82%;
    object-fit: contain;
  }
  .card-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-h);
  }
  .card-meta {
    font-size: 10px;
    color: var(--text-dim);
  }
  .card-xp {
    width: 100%;
  }
</style>
