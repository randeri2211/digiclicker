<script lang="ts">
  import type { Snippet } from 'svelte';

  // A top-bar icon button with an optional count badge - the shared shape
  // behind the newer HUD buttons (Expeditions, Quests).
  interface Props {
    title: string;
    onClick: () => void;
    /** Shown as a badge when above 0. */
    badge?: number;
    /** A system not unlocked yet: dimmed with a lock, `title` explains. */
    locked?: boolean;
    children: Snippet;
  }

  const { title, onClick, badge = 0, locked = false, children }: Props = $props();
</script>

<button class="icon-btn" class:locked {title} aria-label={badge > 0 ? `${title} (${badge})` : title} onclick={onClick}>
  {@render children()}
  {#if locked}
    <svg class="lock" width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="1.5" fill="var(--bg)" stroke="currentColor" stroke-width="2" />
      <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" stroke-width="2" />
    </svg>
  {:else if badge > 0}<span class="badge">{badge}</span>{/if}
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
  .icon-btn.locked {
    color: var(--text-dim);
    border-style: dashed;
  }
  .lock {
    position: absolute;
    bottom: 3px;
    right: 3px;
    color: var(--text);
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
