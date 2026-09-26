<script lang="ts">
  import { tips, dismissTip, skipAllTips } from '../game/state/tips.svelte';
</script>

<!-- One onboarding tip at a time (state/tips.svelte.ts) - small and out of
     the way; the game keeps running. -->
{#if tips.current}
  <div class="tip" role="status">
    <div class="title"><span class="bulb">💡</span>{tips.current.title}</div>
    <div class="text">{tips.current.text}</div>
    <div class="actions">
      <button class="primary" onclick={dismissTip}>Got it</button>
      <button class="quiet" onclick={skipAllTips} title="Settings can turn them back on">Skip all tips</button>
    </div>
  </div>
{/if}

<style>
  .tip {
    position: absolute;
    left: 24px;
    bottom: 24px;
    z-index: 9; /* under the menu screens (10+) */
    width: 330px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px;
    background: var(--panel);
    border: 1px solid var(--accent);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
  }
  .title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--head);
    font-size: 13px;
    letter-spacing: 1px;
    color: var(--text-h);
  }
  .bulb {
    font-size: 14px;
  }
  .text {
    font-size: 12px;
    line-height: 1.5;
    color: var(--text);
  }
  .actions {
    display: flex;
    gap: 6px;
  }
  button {
    appearance: none;
    font: inherit;
    font-size: 11px;
    padding: 5px 12px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
  }
  button.primary {
    border-color: var(--accent);
    color: var(--text-h);
  }
  button.quiet {
    border-color: transparent;
    color: var(--text-dim);
  }
</style>
