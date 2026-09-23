<script lang="ts">
  interface Props {
    variant: 'filled' | 'empty' | 'locked';
    spriteUrl?: string | null;
    level?: number;
    /** True only for a Mystery Digi-Egg (bought from the Shop). */
    isMystery?: boolean;
    /** Reached the hatch level - shown as ready, and clickable to hatch. */
    ready?: boolean;
    /** Label under a ready egg, e.g. "20 Data". */
    readyLabel?: string;
    /** Whether the player can pay to hatch it right now. */
    affordable?: boolean;
    onHatch?: () => void;
  }

  const { variant, spriteUrl = null, level, isMystery = false, ready = false, readyLabel = '', affordable = false, onHatch }: Props =
    $props();
</script>

{#snippet eggContent()}
  {#if spriteUrl}
    <img src={spriteUrl} alt="" />
  {/if}
  {#if ready}
    <span class="slot-ready">Ready · {readyLabel}</span>
  {:else if level !== undefined}
    <span class="slot-lv">Lv {level}</span>
  {/if}
  {#if isMystery}
    <span class="slot-mystery">?</span>
  {/if}
{/snippet}

{#if variant === 'filled' && ready}
  <button
    class="slot ready"
    class:unaffordable={!affordable}
    title={affordable ? `Hatch for ${readyLabel}` : `Needs ${readyLabel} to hatch`}
    onclick={onHatch}
  >
    {@render eggContent()}
  </button>
{:else}
  <div class="slot" class:empty={variant === 'empty'} class:locked={variant === 'locked'}>
    {#if variant === 'filled'}
      {@render eggContent()}
    {:else if variant === 'empty'}
      +
    {:else}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="currentColor" stroke-width="1.8" />
        <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" stroke-width="1.8" />
      </svg>
    {/if}
  </div>
{/if}

<style>
  .slot {
    aspect-ratio: 1;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .slot img {
    width: 78%;
    height: 78%;
    object-fit: contain;
  }
  .slot-lv {
    position: absolute;
    left: 4px;
    bottom: 4px;
    font-size: 10px;
    padding: 1px 5px;
    background: rgba(10, 14, 20, 0.85);
    color: var(--text-h);
    border: 1px solid var(--panel-border);
  }
  .slot-mystery {
    position: absolute;
    top: 4px;
    left: 4px;
    font-family: var(--head);
    font-size: 9px;
    font-weight: 800;
    color: var(--text-h);
    background: var(--accent-soft);
    border: 1px solid var(--accent);
    width: 13px;
    height: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .slot.ready {
    appearance: none;
    font: inherit;
    padding: 0;
    color: inherit;
    cursor: pointer;
    border-color: var(--pos);
    box-shadow: 0 0 8px rgba(57, 255, 136, 0.25);
  }
  .slot.ready.unaffordable {
    border-color: var(--panel-border-strong);
    box-shadow: none;
    cursor: not-allowed;
  }
  .slot.ready:focus-visible {
    outline: 1px solid var(--pos);
    outline-offset: 2px;
  }
  .slot-ready {
    position: absolute;
    left: 2px;
    right: 2px;
    bottom: 2px;
    font-size: 9px;
    padding: 1px 2px;
    text-align: center;
    background: rgba(10, 14, 20, 0.9);
    color: var(--pos);
    border: 1px solid var(--pos);
    white-space: nowrap;
  }
  .unaffordable .slot-ready {
    color: var(--text);
    border-color: var(--panel-border);
  }
  .slot.empty {
    color: var(--text-dim);
    font-size: 22px;
    border-style: dashed;
  }
  .slot.locked {
    color: var(--text-dim);
    font-size: 14px;
    border-style: dashed;
    opacity: 0.5;
  }
</style>
