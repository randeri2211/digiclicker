<script lang="ts">
  import type { DigimonInstance, StatBlock } from '../../game/types';
  import { getInstanceDisplayName } from '../../game/images';
  import { levelForXp } from '../../game/combat/levelCurve';
  import { computeInstanceStatValue, ABILITY_CATALOG } from '../../game/state/game.svelte';

  interface Props {
    instance: DigimonInstance;
    onClose: () => void;
  }

  const { instance, onClose }: Props = $props();

  const level = $derived(levelForXp(instance.xp));
  // The instance's real speciesId is already resolved even while it's an
  // unhatched egg - hide the name (the whole point of an egg) but the
  // stat numbers below still reflect the real, hidden species.
  const displayName = $derived(getInstanceDisplayName(instance));
  const ability = $derived(instance.abilityId ? ABILITY_CATALOG[instance.abilityId] : null);

  const ROWS: { label: string; key: keyof StatBlock }[] = [
    { label: 'Attack', key: 'attack' },
    { label: 'HP', key: 'hp' },
    { label: 'Speed', key: 'speed' },
    { label: 'Special Attack', key: 'specialAttack' },
  ];

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
      <div class="panel-title">
        {displayName}
        <span class="level">Lv {level}</span>
      </div>
      <button class="close-btn" onclick={onClose}>Close</button>
    </div>

    <table class="stat-table">
      <thead>
        <tr>
          <th>Stat</th>
          <th>Base</th>
          <th>Per Level</th>
          <th>Digivolution</th>
          <th>Current</th>
        </tr>
      </thead>
      <tbody>
        {#each ROWS as row (row.key)}
          <tr>
            <td>{row.label}</td>
            <td>{instance.baseStats[row.key]}</td>
            <td>{instance.growthPerLevel[row.key]}</td>
            <td>{instance.digivolutionStats[row.key]}</td>
            <td class="current">{Math.round(computeInstanceStatValue(instance, row.key))}</td>
          </tr>
        {/each}
      </tbody>
    </table>

    <div class="ability-row">
      <span class="ability-label">Special Ability</span>
      {#if ability}
        <span class="ability-name">{ability.name}</span>
        <span class="ability-desc">{ability.description}</span>
      {:else}
        <span class="ability-desc">No special ability</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(5, 7, 10, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
  }
  .panel {
    width: 460px;
    background: var(--panel);
    border: 1px solid var(--panel-border-strong);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .panel-title {
    font-family: var(--head);
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-h);
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .level {
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 400;
    text-transform: none;
    color: var(--text-dim);
  }
  .close-btn {
    appearance: none;
    font: inherit;
    font-family: var(--mono);
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    font-size: 12px;
    padding: 6px 12px;
    cursor: pointer;
  }
  .close-btn:hover {
    border-color: var(--panel-border-strong);
    color: var(--text-h);
  }
  .stat-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .stat-table th {
    text-align: left;
    color: var(--text-dim);
    font-weight: 600;
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 6px 8px;
    border-bottom: 1px solid var(--panel-border);
  }
  .stat-table td {
    color: var(--text-h);
    padding: 8px;
    border-bottom: 1px solid var(--panel-border);
  }
  .stat-table th:not(:first-child),
  .stat-table td:not(:first-child) {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .stat-table td.current {
    color: var(--pos);
    font-weight: 600;
  }
  .ability-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 12px;
  }
  .ability-label {
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .ability-name {
    font-weight: 600;
    color: var(--accent);
  }
  .ability-desc {
    color: var(--text-dim);
  }
</style>
