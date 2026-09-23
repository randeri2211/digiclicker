<script lang="ts">
  import { inventory, ITEM_CATALOG } from '../game/state/game.svelte';

  interface Props {
    onClose: () => void;
  }

  const { onClose }: Props = $props();

  const catalogEntries = Object.values(ITEM_CATALOG);
  const ownedEntries = $derived(catalogEntries.filter((item) => inventory[item.id] > 0));

  $effect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div
  class="backdrop"
  onclick={onClose}
  onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onClose()}
  role="button"
  tabindex="0"
>
  <div
    class="panel"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="dialog"
    tabindex="-1"
  >
    <div class="panel-header">
      <div class="panel-title">Inventory</div>
      <button class="close-btn" onclick={onClose}>Close</button>
    </div>

    <div class="section">
      <div class="section-title">Owned Items</div>
      <div class="grid">
        {#if ownedEntries.length === 0}
          <div class="empty-note">No items yet.</div>
        {:else}
          {#each ownedEntries as item (item.id)}
            <div class="card">
              <div class="card-name">{item.name}</div>
              <div class="card-count">x{inventory[item.id]}</div>
              <div class="card-desc">{item.description}</div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(5, 7, 10, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  .panel {
    width: 92%;
    height: 88%;
    max-width: 1280px;
    background: var(--panel);
    border: 1px solid var(--panel-border-strong);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
  }
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .panel-title {
    font-family: var(--head);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-h);
  }
  .close-btn {
    appearance: none;
    font: inherit;
    font-family: var(--mono);
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    font-size: 12px;
    padding: 8px 14px;
    cursor: pointer;
  }
  .close-btn:hover {
    border-color: var(--panel-border-strong);
    color: var(--text-h);
  }
  .section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .section-title {
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }
  .empty-note {
    font-size: 13px;
    color: var(--text-dim);
    padding: 10px 0;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
  }
  .card-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-h);
  }
  .card-count {
    font-size: 12px;
    color: var(--pos);
  }
  .card-desc {
    font-size: 11px;
    color: var(--text-dim);
  }
</style>
