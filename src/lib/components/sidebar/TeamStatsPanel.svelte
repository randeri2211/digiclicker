<script lang="ts">
  import type { DigimonInstance } from '../../game/types';
  import { getSpecies } from '../../game/images';
  import { computeActiveTeamDps, computeMemberDps } from '../../game/state/game.svelte';

  interface Props {
    members: DigimonInstance[];
  }

  const { members }: Props = $props();

  const totalDps = $derived(computeActiveTeamDps(members));
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
