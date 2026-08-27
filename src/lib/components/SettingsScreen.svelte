<script lang="ts">
  import { saveGame, exportSlotToFile, activeSlot } from '../game/state/game.svelte';

  interface Props {
    onClose: () => void;
    onBackToMenu: () => void;
  }

  const { onClose, onBackToMenu }: Props = $props();

  let savedFlash = $state(false);

  function handleSave() {
    saveGame();
    savedFlash = true;
    setTimeout(() => (savedFlash = false), 1500);
  }

  function handleExport() {
    if (activeSlot.id) exportSlotToFile(activeSlot.id);
  }

  $effect(() => {
    // A keydown handler on the backdrop element only fires while the
    // backdrop itself has focus - clicking anything inside the panel moves
    // focus there instead, silently breaking Escape-to-close. A
    // window-level listener works regardless of focus.
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
    <div class="panel-title">Settings</div>

    <div class="panel-buttons">
      <button class="panel-btn" onclick={handleSave}>
        Save
        {#if savedFlash}<span class="saved-tag">Saved</span>{/if}
      </button>
      <button class="panel-btn" onclick={handleExport}>Export Save</button>
      <button class="panel-btn danger" onclick={onBackToMenu}>Load (Back to Menu)</button>
    </div>

    <button class="close-btn" onclick={onClose}>Close</button>
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
    width: 320px;
    background: var(--panel);
    border: 1px solid var(--panel-border-strong);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .panel-title {
    font-family: var(--head);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-h);
  }
  .panel-buttons {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .panel-btn {
    appearance: none;
    font: inherit;
    font-family: var(--mono);
    text-align: left;
    position: relative;
    padding: 12px 14px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text-h);
    cursor: pointer;
  }
  .panel-btn:hover {
    border-color: var(--panel-border-strong);
  }
  .panel-btn.danger:hover {
    border-color: var(--danger);
    color: var(--danger);
  }
  .saved-tag {
    margin-left: 10px;
    font-size: 11px;
    color: var(--pos);
  }
  .close-btn {
    appearance: none;
    font: inherit;
    font-family: var(--mono);
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 12px;
    cursor: pointer;
    align-self: center;
  }
  .close-btn:hover {
    color: var(--text);
  }
</style>
