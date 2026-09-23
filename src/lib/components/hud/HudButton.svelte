<script lang="ts">
  import type { Snippet } from 'svelte';

  // A top-bar icon button with an optional count badge - the shared shape
  // behind the newer HUD buttons (Expeditions, Quests).
  interface Props {
    title: string;
    onClick: () => void;
    /** Shown as a badge when above 0. */
    badge?: number;
    children: Snippet;
  }

  const { title, onClick, badge = 0, children }: Props = $props();
</script>

<button class="icon-btn" {title} aria-label={badge > 0 ? `${title} (${badge})` : title} onclick={onClick}>
  {@render children()}
  {#if badge > 0}<span class="badge">{badge}</span>{/if}
</button>

<style>
  .icon-btn {
    appearance: none;
    font: inherit;
    position: relative;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    color: var(--text-h);
    cursor: pointer;
  }
  .icon-btn:hover {
    border-color: var(--panel-border-strong);
  }
  .icon-btn:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: 2px;
  }
  .badge {
    position: absolute;
    top: -7px;
    right: -7px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    background: var(--warn);
    color: #1a1300;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
  }
</style>
