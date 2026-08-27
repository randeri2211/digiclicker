<script lang="ts">
  import {
    listSlots,
    loadSlotIntoLiveState,
    startNewGameInSlot,
    deleteSlot,
    exportSlotToFile,
    importSlotFromFile,
  } from '../game/state/game.svelte';

  interface Props {
    onEnterGame: () => void;
  }

  const { onEnterGame }: Props = $props();

  let slots = $state(listSlots());
  let fileInput: HTMLInputElement | undefined = $state();
  let importError = $state(false);

  function refresh() {
    slots = listSlots();
  }

  function handleLoad(id: string) {
    loadSlotIntoLiveState(id);
    onEnterGame();
  }

  function handleNewGame() {
    startNewGameInSlot();
    onEnterGame();
  }

  function handleDelete(id: string, event: MouseEvent) {
    event.stopPropagation();
    deleteSlot(id);
    refresh();
  }

  function handleExport(id: string, event: MouseEvent) {
    event.stopPropagation();
    exportSlotToFile(id);
  }

  function triggerImport() {
    fileInput?.click();
  }

  async function handleFileChosen(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const slot = await importSlotFromFile(file);
    importError = slot === null;
    if (slot) refresh();
  }
</script>

<div class="menu">
  <div class="logo"><span class="dot"></span>DIGICLICKER</div>

  <div class="slots">
    {#if slots.length === 0}
      <div class="empty">No saved games yet.</div>
    {/if}
    {#each slots as slot (slot.id)}
      <div
        class="slot-card"
        onclick={() => handleLoad(slot.id)}
        onkeydown={(e) => e.key === 'Enter' && handleLoad(slot.id)}
        role="button"
        tabindex="0"
      >
        <div class="slot-info">
          <div class="slot-name">{slot.name}</div>
          <div class="slot-meta">
            {new Date(slot.savedAt).toLocaleString()} · {slot.data.currency.bits.toLocaleString()} Bits
          </div>
        </div>
        <div class="slot-actions">
          <button class="slot-btn" onclick={(e) => handleExport(slot.id, e)}>Export</button>
          <button class="slot-btn danger" onclick={(e) => handleDelete(slot.id, e)}>Delete</button>
        </div>
      </div>
    {/each}
  </div>

  <div class="actions">
    <button class="primary-btn" onclick={handleNewGame}>New Game</button>
    <button class="secondary-btn" onclick={triggerImport}>Import Save</button>
    <input
      bind:this={fileInput}
      type="file"
      accept=".json"
      class="hidden-input"
      onchange={handleFileChosen}
    />
  </div>
  {#if importError}
    <div class="import-error">Couldn't read that save file.</div>
  {/if}
</div>

<style>
  .menu {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 28px;
    padding: 40px;
  }
  .logo {
    font-family: var(--head);
    font-weight: 800;
    font-size: 32px;
    letter-spacing: 3px;
    color: var(--text-h);
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo .dot {
    width: 10px;
    height: 10px;
    background: var(--pos);
    box-shadow: 0 0 10px var(--pos);
  }

  .slots {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 420px;
    max-height: 320px;
    overflow-y: auto;
  }
  .empty {
    color: var(--text-dim);
    font-size: 13px;
    text-align: center;
    padding: 16px;
  }
  .slot-card {
    appearance: none;
    font: inherit;
    font-family: var(--mono);
    text-align: left;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 14px 16px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    color: var(--text-h);
    cursor: pointer;
  }
  .slot-card:hover {
    border-color: var(--panel-border-strong);
  }
  .slot-name {
    font-size: 14px;
    font-weight: 600;
  }
  .slot-meta {
    font-size: 11px;
    color: var(--text-dim);
    margin-top: 4px;
  }
  .slot-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
  .slot-btn {
    appearance: none;
    font: inherit;
    font-family: var(--mono);
    background: none;
    font-size: 11px;
    padding: 6px 10px;
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
  }
  .slot-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .slot-btn.danger:hover {
    border-color: var(--danger);
    color: var(--danger);
  }

  .actions {
    display: flex;
    gap: 12px;
  }
  .primary-btn,
  .secondary-btn {
    appearance: none;
    font: inherit;
    font-family: var(--head);
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    font-size: 13px;
    padding: 12px 22px;
    cursor: pointer;
  }
  .primary-btn {
    background: var(--pos-soft);
    border: 1px solid rgba(57, 255, 136, 0.4);
    color: var(--pos);
  }
  .primary-btn:hover {
    border-color: var(--pos);
  }
  .secondary-btn {
    background: var(--panel);
    border: 1px solid var(--panel-border);
    color: var(--text-h);
  }
  .secondary-btn:hover {
    border-color: var(--panel-border-strong);
  }
  .hidden-input {
    display: none;
  }
  .import-error {
    font-size: 12px;
    color: var(--danger);
  }
</style>
