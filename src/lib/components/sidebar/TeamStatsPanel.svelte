<script lang="ts">
  import type { DigimonInstance, StatBlock } from '../../game/types';
  import { getSpecies } from '../../game/images';
  import {
    computeActiveTeamDps,
    computeMemberDps,
    computeInstanceStatValue,
    computeAttacksPerSecond,
    computeTeamDamagePerHit,
  } from '../../game/state/game.svelte';

  interface Props {
    members: DigimonInstance[];
  }

  const { members }: Props = $props();

  const totalDps = $derived(computeActiveTeamDps(members));
  const attacksPerSecond = $derived(computeAttacksPerSecond(members));
  const damagePerHit = $derived(computeTeamDamagePerHit(members));

  function teamStatTotal(statKey: keyof StatBlock): number {
    return members.reduce((sum, member) => sum + computeInstanceStatValue(member, statKey), 0);
  }

  // Speed and Attack/SpecialAttack both feed attacksPerSecond/damagePerHit
  // (see combat/damage.ts) - shown alongside each so the two DPS factors
  // (rate x damage/hit) are visible in context, not just the final number.
  const totals = $derived({
    attack: teamStatTotal('attack'),
    specialAttack: teamStatTotal('specialAttack'),
    speed: teamStatTotal('speed'),
    hp: teamStatTotal('hp'),
  });

  const memberDps = $derived(
    members.map((member) => ({
      instanceId: member.instanceId,
      name: getSpecies(member.speciesId)?.name ?? member.speciesId,
      dps: computeMemberDps(member, members),
    }))
  );

  const fmt = (n: number) => n.toFixed(1);
</script>

<div class="stats-panel">
  <div class="stats-head">
    <div class="stats-title">Team DPS</div>
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
  <div class="dmg-summary">Dmg/hit {fmt(damagePerHit)} &times; {fmt(attacksPerSecond)}/s</div>
  {#if memberDps.length > 0}
    <div class="stats-rows">
      {#each memberDps as row (row.instanceId)}
        <div class="stats-row">
          <span class="row-name">{row.name}</span>
          <span class="row-dps">{fmt(row.dps)}</span>
        </div>
      {/each}
    </div>
  {:else}
    <div class="stats-empty">No active Digimon.</div>
  {/if}
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
  .stats-empty {
    margin-top: 8px;
    font-size: 11px;
    color: var(--text-dim);
  }
</style>
