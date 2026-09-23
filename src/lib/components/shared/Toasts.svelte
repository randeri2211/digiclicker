<script lang="ts">
  import { notifications, dismissToast } from '../../game/state/game.svelte';

  // Each toast removes itself after a few seconds.
  const TOAST_MS = 5000;
  $effect(() => {
    const timers = notifications.toasts.map((toast) => setTimeout(() => dismissToast(toast.id), TOAST_MS));
    return () => timers.forEach(clearTimeout);
  });
</script>

<div class="toasts" role="status" aria-live="polite">
  {#each notifications.toasts as toast (toast.id)}
    <button class="toast" onclick={() => dismissToast(toast.id)}>
      <span class="toast-title">{toast.title}</span>
      <span class="toast-text">{toast.text}</span>
    </button>
  {/each}
</div>

<style>
  .toasts {
    position: absolute;
    right: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    appearance: none;
    font: inherit;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 220px;
    padding: 10px 14px;
    background: var(--panel);
    border: 1px solid var(--pos);
    cursor: pointer;
  }
  .toast-title {
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--pos);
  }
  .toast-text {
    font-size: 13px;
    color: var(--text-h);
  }
</style>
