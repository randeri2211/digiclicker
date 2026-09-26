<script lang="ts">
  import type { RosterEntry } from '../game/types';
  import { getSpecies, getSpriteUrl, getSpeciesName } from '../game/images';
  import { levelForXp } from '../game/combat/levelCurve';
  import {
    getRosterList,
    isAway,
    getRosterEntryMenuItems,
    useAbilityReroll,
    computeAttacksPerSecond,
    computeRosterDamageShares,
    partners,
    partnerSlots,
    isPartner,
    setPartner,
  } from '../game/state/game.svelte';
  import ContextMenu from './shared/ContextMenu.svelte';
  import StatWindow from './shared/StatWindow.svelte';
  import XpBar from './shared/XpBar.svelte';
  import SpeciesTags from './shared/SpeciesTags.svelte';
  import RosterFilterControls from './shared/RosterFilterControls.svelte';
  import { loadRosterFilter, saveRosterFilter, applyRosterFilter } from '../game/roster/rosterFilter';

  interface Props {
    /** speciesId preselects that entry on the Evolution screen. */
    onOpenEvolution: (speciesId: string) => void;
    onClose: () => void;
  }

  const { onOpenEvolution, onClose }: Props = $props();

  // Shared filter/sort model (roster/rosterFilter.ts), remembered per browser.
  const FILTER_KEY = 'digiclicker-roster-filter';
  let filter = $state(loadRosterFilter(FILTER_KEY));
  $effect(() => saveRosterFilter(FILTER_KEY, $state.snapshot(filter)));

  // DPS = each one's share after the roster falloff - the same numbers as
  // the sidebar's top contributors.
  const entries = $derived.by(() => {
    const all = getRosterList();
    const attacksPerSecond = computeAttacksPerSecond(all);
    const shares = computeRosterDamageShares(all);
    return applyRosterFilter(
      all.map((entry, i) => ({ entry, dps: attacksPerSecond * shares[i] })),
      filter,
    );
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
      <span class="partner-count" title="Partners level faster and a little higher - open a Digimon's menu to choose">★ Partners {partners.ids.length}/{partnerSlots()}</span>
      <button class="close-btn" onclick={onClose}>Close</button>
    </div>

    <RosterFilterControls bind:filter />

    <div class="grid">
      {#if entries.length === 0}
        <div class="empty-note">No Digimon here.</div>
      {:else}
        {#each entries as row (row.entry.speciesId)}
          {@const sprite = getSpriteUrl(row.entry.speciesId)}
          <button class="card" class:partner={isPartner(row.entry.speciesId)} onclick={(e) => openMenu(row.entry, e)}>
            {#if isPartner(row.entry.speciesId)}<span class="partner-star" title="Partner">★</span>{/if}
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
            {#if isAway(row.entry.speciesId)}<span class="away">On expedition</span>{/if}
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
      partner: {
        isPartner: isPartner(entry.speciesId),
        slotFree: partners.ids.length < partnerSlots(),
        onToggle: () => setPartner(entry.speciesId, !isPartner(entry.speciesId)),
      },
    })}
    onClose={() => (menuState = null)}
  />
{/if}

{#if statsFor}
  <StatWindow entry={statsFor} onClose={() => (statsFor = null)} />
{/if}

<style>
  .partner-count {
    flex: 1;
    font-size: 12px;
    color: var(--warn);
  }
  .card.partner {
    border-color: var(--warn);
  }
  .partner-star {
    position: absolute;
    top: 6px;
    left: 8px;
    color: var(--warn);
    font-size: 14px;
  }
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
    /* anchors the partner star */
    position: relative;
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
  .away {
    font-size: 9px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--warn);
  }
</style>
