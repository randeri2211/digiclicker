<script lang="ts">
  import type { RosterEntry } from '../../game/types';
  import { clickPowerFactor } from '../../game/state/shop.svelte';
  import { getSpeciesName, getSpriteUrl, getSpecies } from '../../game/images';
  import RosterFilterControls from '../shared/RosterFilterControls.svelte';
  import ElementIcon from '../shared/ElementIcon.svelte';
  import AttributeIcon from '../shared/AttributeIcon.svelte';
  import { loadRosterFilter, saveRosterFilter, applyRosterFilter, isFilterActive, describeFilter, SORT_KEYS } from '../../game/roster/rosterFilter';
  import { levelForXp } from '../../game/combat/levelCurve';
  import {
    getFightingRoster,
    computeRosterDps,
    computeClickDamage,
    computeRosterStatTotal,
    computeAttacksPerSecond,
    computeRosterDamagePerHit,
    computeRosterDamageShares,
    partners,
    partnerSlots,
    roster,
  } from '../../game/state/game.svelte';

  interface Props {
    onEntryClick?: (entry: RosterEntry, event: MouseEvent) => void;
  }

  const { onEntryClick }: Props = $props();

  // The whole roster contributes, which can be hundreds of entries - only
  // the biggest contributors are listed, the totals cover everyone.
  const TOP_CONTRIBUTOR_COUNT = 5;

  // Only who's actually fighting - Digimon away on an expedition sit out.
  const entries = $derived(getFightingRoster());
  const totalDps = $derived(computeRosterDps(entries));
  const attacksPerSecond = $derived(computeAttacksPerSecond(entries));
  const damagePerHit = $derived(computeRosterDamagePerHit(entries));
  const clickDamage = $derived(computeClickDamage(entries) * clickPowerFactor());

  const totals = $derived({
    attack: computeRosterStatTotal(entries, 'attack'),
    specialAttack: computeRosterStatTotal(entries, 'specialAttack'),
    speed: computeRosterStatTotal(entries, 'speed'),
    hp: computeRosterStatTotal(entries, 'hp'),
  });

  // Shared filter/sort model (roster/rosterFilter.ts) - its own setting,
  // separate from the Roster screen's, remembered per browser.
  const FILTER_KEY = 'digiclicker-contributors-filter';
  let filter = $state(loadRosterFilter(FILTER_KEY));
  $effect(() => saveRosterFilter(FILTER_KEY, $state.snapshot(filter)));
  let filterOpen = $state(false);
  const filterActive = $derived(isFilterActive(filter) || filter.sort !== 'dps');
  const filterSummary = $derived(
    [describeFilter(filter), filter.sort !== 'dps' ? `by ${SORT_KEYS[filter.sort]}` : ''].filter(Boolean).join(' · '),
  );

  // Each one's share after the roster falloff (computed over the whole
  // roster, so the numbers stay comparable when a filter is on).
  const topContributors = $derived.by(() => {
    const shares = computeRosterDamageShares(entries);
    return applyRosterFilter(
      entries.map((entry, i) => ({ entry, dps: attacksPerSecond * shares[i] })),
      filter,
    ).slice(0, TOP_CONTRIBUTOR_COUNT);
  });

  // Close the filter popup on an outside click or Escape.
  $effect(() => {
    if (!filterOpen) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      if (e instanceof MouseEvent && (e.target as HTMLElement).closest('.filter-wrap')) return;
      filterOpen = false;
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
    };
  });

  const fmt = (n: number) => n.toFixed(1);

  // Collapsed or open - a per-browser display preference, not game state.
  const COLLAPSE_KEY = 'digiclicker-contributors-collapsed';
  let contributorsCollapsed = $state(readCollapsed());
  function readCollapsed(): boolean {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  }
  function toggleContributors() {
    contributorsCollapsed = !contributorsCollapsed;
    try {
      localStorage.setItem(COLLAPSE_KEY, contributorsCollapsed ? '1' : '0');
    } catch {
      // storage unavailable - it just won't be remembered
    }
  }
</script>

<div class="stats-panel" data-tip="roster">
  <div class="stats-head">
    <div class="stats-title">Roster DPS</div>
    <div class="stats-total">{fmt(totalDps)}</div>
  </div>
  <div class="totals-grid">
    <div class="total-cell">
      <span class="total-label">Attack</span>
      <span class="total-value">{fmt(totals.attack)}</span>
    </div>
    <div class="total-cell">
      <span class="total-label">Sp. Atk</span>
      <span class="total-value">{fmt(totals.specialAttack)}</span>
    </div>
    <div class="total-cell">
      <span class="total-label">Speed</span>
      <span class="total-value">{fmt(totals.speed)} <span class="total-sub">({fmt(attacksPerSecond)}/s)</span></span>
    </div>
    <div class="total-cell">
      <span class="total-label">HP</span>
      <span class="total-value">{fmt(totals.hp)}</span>
    </div>
  </div>
  <div class="dmg-summary">
    Dmg/hit {fmt(damagePerHit)} &times; {fmt(attacksPerSecond)}/s · Click {fmt(clickDamage)} · {entries.length} Digimon
  </div>
  <div class="stats-subtitle">★ Partners {partners.ids.length}/{partnerSlots()}</div>
  <div class="partner-row">
    {#each partners.ids as id (id)}
      {#if roster[id]}
        {@const sprite = getSpriteUrl(id)}
        <button
          class="partner-chip"
          class:clickable={onEntryClick}
          onclick={(e) => onEntryClick?.(roster[id], e)}
          title="{getSpeciesName(id)} - open menu"
        >
          <span class="partner-icon">{#if sprite}<img src={sprite} alt="" />{/if}</span>
          {getSpeciesName(id)} <span class="partner-lv">Lv {levelForXp(roster[id].xp)}</span>
        </button>
      {/if}
    {:else}
      <span class="partner-empty">None yet - pick them from a Digimon's menu</span>
    {/each}
  </div>
  <div class="contrib-head">
    <button class="stats-subtitle collapse-toggle" onclick={toggleContributors} aria-expanded={!contributorsCollapsed}>
      <span class="chevron" class:collapsed={contributorsCollapsed}>▾</span> Top contributors
      {#if filterActive}<span class="filter-summary">· {filterSummary}</span>{/if}
    </button>
    <div class="filter-wrap">
      <button class="filter-btn" class:active={filterActive} onclick={() => (filterOpen = !filterOpen)} title="Filter by element / attribute" aria-expanded={filterOpen}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 5h18l-7 8v6l-4 2v-8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        </svg>
      </button>
      {#if filterOpen}
        <div class="filter-pop" role="dialog" aria-label="Filter top contributors">
          <RosterFilterControls bind:filter layout="stack" />
        </div>
      {/if}
    </div>
  </div>
  {#if !contributorsCollapsed}
  <div class="stats-rows">
    {#if topContributors.length === 0}<span class="partner-empty">No Digimon match this filter</span>{/if}
    {#each topContributors as row (row.entry.speciesId)}
      {@const species = getSpecies(row.entry.speciesId)}
      {@const sprite = getSpriteUrl(row.entry.speciesId)}
      <div
        class="stats-row"
        class:clickable={onEntryClick}
        onclick={(e) => onEntryClick?.(row.entry, e)}
        onkeydown={(e) => e.key === 'Enter' && e.currentTarget.click()}
        role="button"
        tabindex="0"
      >
        <span class="row-icon">{#if sprite}<img src={sprite} alt="" />{/if}</span>
        <span class="row-main">
          <span class="row-name">{getSpeciesName(row.entry.speciesId)}</span>
          <span class="row-meta">
            Lv {levelForXp(row.entry.xp)}
            {#if species?.element}
              · <ElementIcon element={species.element} size={14} />{species.element}
            {/if}
            {#if species?.attribute}
              · <AttributeIcon attribute={species.attribute} size={14} />{species.attribute}
            {/if}
          </span>
        </span>
        <span class="row-dps">{fmt(row.dps)}</span>
      </div>
    {/each}
  </div>
  {/if}
</div>

<style>
  .partner-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }
  .partner-icon {
    width: 60px;
    height: 60px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .partner-icon img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .partner-chip.clickable {
    cursor: pointer;
  }
  .partner-chip.clickable:hover {
    background: rgba(255, 176, 32, 0.08);
  }
  .partner-lv {
    color: var(--text-dim);
  }
  .contrib-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
  }
  .contrib-head .collapse-toggle {
    margin-top: 0;
    width: auto;
  }
  .filter-summary {
    color: var(--accent);
    text-transform: none;
    letter-spacing: 0;
  }
  .filter-wrap {
    position: relative;
  }
  .filter-btn {
    appearance: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text-dim);
    cursor: pointer;
  }
  .filter-btn:hover {
    color: var(--text);
  }
  .filter-btn.active {
    color: var(--accent);
    border-color: var(--accent);
  }
  .filter-pop {
    position: absolute;
    top: 26px;
    right: 0;
    z-index: 5;
    width: 190px;
    padding: 10px;
    background: var(--panel);
    border: 1px solid var(--panel-border-strong);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
  }
  .partner-chip {
    appearance: none;
    font-family: inherit;
    background: none;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    padding: 2px 8px 2px 2px;
    color: var(--warn);
    border: 1px solid var(--warn);
  }
  .partner-empty {
    font-size: 11px;
    color: var(--text-dim);
  }
  .stats-panel {
    margin-bottom: 24px;
    padding: 12px 14px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
  }
  .stats-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .stats-title {
    font-family: var(--head);
    font-size: 12px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--text-h);
  }
  .stats-total {
    font-family: var(--head);
    font-size: 16px;
    font-weight: 700;
    color: var(--pos);
  }
  .totals-grid {
    margin-top: 10px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 12px;
  }
  .total-cell {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    font-size: 11px;
  }
  .total-label {
    color: var(--text-dim);
  }
  .total-value {
    color: var(--text-h);
    font-variant-numeric: tabular-nums;
  }
  .total-sub {
    color: var(--text-dim);
    font-size: 10px;
  }
  .dmg-summary {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--panel-border);
    font-size: 10px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .stats-rows {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .stats-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
  }
  .row-icon {
    width: 80px;
    height: 80px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
  }
  .row-icon img {
    width: 90%;
    height: 90%;
    object-fit: contain;
  }
  .row-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .row-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--text-dim);
  }
  .collapse-toggle {
    appearance: none;
    font: inherit;
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    padding: 0;
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
  }
  .collapse-toggle:hover {
    color: var(--text);
  }
  .chevron {
    display: inline-block;
    font-size: 13px;
    line-height: 1;
    transition: transform 0.15s;
  }
  .chevron.collapsed {
    transform: rotate(-90deg);
  }
  .row-name {
    color: var(--text);
  }
  .row-dps {
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .stats-row.clickable {
    cursor: pointer;
  }
  .stats-row.clickable:hover .row-name {
    color: var(--text-h);
  }
  .stats-subtitle {
    margin-top: 10px;
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-dim);
  }
</style>
