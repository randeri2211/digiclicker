<script lang="ts">
  import DigimonList from './DigimonList.svelte';
  import EvolutionGraph from './EvolutionGraph.svelte';
  import { roster, getRosterList, isReadyToDigivolve } from '../../game/state/game.svelte';

  interface Props {
    /** Opens with this entry selected (e.g. from a roster menu's
     * "Digivolve…" action) instead of the default pick. */
    initialSpeciesId?: string | null;
    onClose: () => void;
  }

  const { initialSpeciesId = null, onClose }: Props = $props();

  const entries = $derived(getRosterList());

  function pickDefaultSelection(): string | null {
    if (initialSpeciesId && roster[initialSpeciesId]) return initialSpeciesId;
    const ready = entries.find(isReadyToDigivolve);
    return (ready ?? entries[0])?.speciesId ?? null;
  }

  let selectedSpeciesId: string | null = $state(pickDefaultSelection());

  const selectedEntry = $derived(selectedSpeciesId ? (roster[selectedSpeciesId] ?? null) : null);

  $effect(() => {
    // A keydown handler on the backdrop element only fires while the
    // backdrop itself has focus - clicking anything inside the panel
    // (e.g. an option card) moves focus there instead, silently breaking
    // Escape-to-close. A window-level listener works regardless of focus.
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
      <div class="panel-title">Evolution</div>
      <button class="close-btn" onclick={onClose}>Close</button>
    </div>

    <div class="body">
      <div class="list-pane">
        <DigimonList {entries} {selectedSpeciesId} onSelect={(id) => (selectedSpeciesId = id)} />
      </div>
      <div class="graph-pane">
        {#if selectedEntry}
          {#key selectedEntry.speciesId}
            <EvolutionGraph entry={selectedEntry} />
          {/key}
        {:else}
          <div class="empty-note">No Digimon to show.</div>
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
  .body {
    flex: 1;
    display: flex;
    gap: 20px;
    min-height: 0;
  }
  .list-pane {
    width: 300px;
    flex-shrink: 0;
    overflow-y: auto;
  }
  .graph-pane {
    flex: 1;
    min-width: 0;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    overflow: auto;
  }
  .empty-note {
    font-size: 13px;
    color: var(--text-dim);
    padding: 20px;
  }
</style>
