<script lang="ts">
  import type { Stage } from '../../game/types';
  import { IN_GAME_STAGES } from '../../game/constants';
  import { debugSpawn, applyDebugSpawn } from '../../game/state/game.svelte';
  import { addItem } from '../../game/state/inventory.svelte';
  import { BOSS_CHIP_STATS } from '../../game/state/combat.svelte';
  import type { ItemId } from '../../game/types';

  // Dev shortcut for testing quests / boss prep: one of every boss chip.
  function grantChips() {
    for (const id of Object.keys(BOSS_CHIP_STATS) as ItemId[]) addItem(id, 1);
  }

  const STAGES = [...IN_GAME_STAGES] as Stage[];

  $effect(() => {
    // Re-runs whenever enabled/stage/level changes - keeps the current
    // wild in sync with the panel live, no separate "apply" action needed.
    void debugSpawn.enabled;
    void debugSpawn.stage;
    void debugSpawn.level;
    applyDebugSpawn();
  });
</script>

<div class="debug-panel">
  <label class="debug-toggle">
    <input type="checkbox" bind:checked={debugSpawn.enabled} />
    <span class="debug-label">DEBUG SPAWN</span>
  </label>
  <select bind:value={debugSpawn.stage} disabled={!debugSpawn.enabled}>
    {#each STAGES as s (s)}
      <option value={s}>{s}</option>
    {/each}
  </select>
  <input type="number" min="1" bind:value={debugSpawn.level} disabled={!debugSpawn.enabled} />
  <button class="debug-grant" onclick={grantChips}>+1 each chip</button>
</div>

<style>
  .debug-panel {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: rgba(255, 80, 80, 0.08);
    border: 1px dashed var(--danger, #ff5050);
    font-size: 11px;
  }
  .debug-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .debug-label {
    font-family: var(--head);
    letter-spacing: 1px;
    color: var(--danger, #ff5050);
    font-weight: 700;
  }
  .debug-grant {
    margin-left: auto;
    cursor: pointer;
  }
  select,
  input,
  .debug-grant {
    font: inherit;
    font-family: var(--mono);
    background: var(--panel);
    border: 1px solid var(--panel-border);
    color: var(--text-h);
    padding: 4px 6px;
  }
  select:disabled,
  input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  input {
    width: 60px;
  }
</style>
