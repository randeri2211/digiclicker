<script lang="ts">
  import type { RosterEntry } from '../../game/types';
  import { getSpeciesName } from '../../game/images';
  import {
    getFightingRoster,
    computeRosterDps,
    computeClickDamage,
    computeRosterStatTotal,
    computeAttacksPerSecond,
    computeRosterDamagePerHit,
    computeRosterDamageShares,
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
  const clickDamage = $derived(computeClickDamage(entries));

  const totals = $derived({
    attack: computeRosterStatTotal(entries, 'attack'),
    specialAttack: computeRosterStatTotal(entries, 'specialAttack'),
    speed: computeRosterStatTotal(entries, 'speed'),
    hp: computeRosterStatTotal(entries, 'hp'),
  });

  // Each one's share after the roster falloff, so the list adds up to the
  // total above.
  const topContributors = $derived.by(() => {
    const shares = computeRosterDamageShares(entries);
    return entries
      .map((entry, i) => ({ entry, dps: attacksPerSecond * shares[i] }))
      .sort((a, b) => b.dps - a.dps)
      .slice(0, TOP_CONTRIBUTOR_COUNT);
  });

  const fmt = (n: number) => n.toFixed(1);
</script>

<div class="stats-panel">
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
  <div class="stats-subtitle">Top contributors</div>
  <div class="stats-rows">
    {#each topContributors as row (row.entry.speciesId)}
      <div
        class="stats-row"
        class:clickable={onEntryClick}
        onclick={(e) => onEntryClick?.(row.entry, e)}
        onkeydown={(e) => e.key === 'Enter' && e.currentTarget.click()}
        role="button"
        tabindex="0"
      >
        <span class="row-name">{getSpeciesName(row.entry.speciesId)}</span>
        <span class="row-dps">{fmt(row.dps)}</span>
      </div>
    {/each}
  </div>
</div>

<style>
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
    justify-content: space-between;
    font-size: 11px;
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
