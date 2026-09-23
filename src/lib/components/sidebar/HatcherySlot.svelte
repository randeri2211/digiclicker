<script lang="ts">
  interface Props {
    variant: 'filled' | 'empty' | 'locked';
    spriteUrl?: string | null;
    level?: number;
    /** True only for a Mystery Digi-Egg (bought from the Shop). */
    isMystery?: boolean;
  }

  const { variant, spriteUrl = null, level, isMystery = false }: Props = $props();
</script>

<div class="slot" class:empty={variant === 'empty'} class:locked={variant === 'locked'}>
  {#if variant === 'filled'}
    {#if spriteUrl}
      <img src={spriteUrl} alt="" />
    {/if}
    {#if level !== undefined}
      <span class="slot-lv">Lv {level}</span>
    {/if}
    {#if isMystery}
      <span class="slot-mystery">?</span>
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
