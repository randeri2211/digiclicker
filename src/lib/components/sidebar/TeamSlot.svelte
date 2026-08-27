<script lang="ts">
  interface Props {
    variant: 'filled' | 'empty' | 'locked';
    spriteUrl?: string | null;
    level?: number;
    /** Digivolution-eligibility indicator. */
    ready?: boolean;
    isActive?: boolean;
  }

  const { variant, spriteUrl = null, level, ready = false, isActive = false }: Props = $props();
</script>

<div class="slot" class:active-slot={isActive} class:empty={variant === 'empty'} class:locked={variant === 'locked'}>
  {#if variant === 'filled'}
    {#if spriteUrl}
      <img src={spriteUrl} alt="" />
    {/if}
    {#if level !== undefined}
      <span class="slot-lv">Lv {level}</span>
    {/if}
    {#if ready}
      <span class="slot-ready"></span>
    {/if}
  {:else if variant === 'empty'}
    +
  {:else}
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="currentColor" stroke-width="1.8" />
      <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" stroke-width="1.8" />
    </svg>
  {/if}
</div>

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
  .slot.active-slot {
    border-color: var(--panel-border-strong);
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
  .slot-ready {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 8px;
    height: 8px;
    background: var(--warn);
    box-shadow: 0 0 6px var(--warn);
    border-radius: 50%;
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
