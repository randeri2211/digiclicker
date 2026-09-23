<script lang="ts">
  import type { Stage } from '../game/types';
  import { IN_GAME_STAGES } from '../game/constants';
  import { getSpecies, getSpeciesIdsByStage, getSpriteUrl } from '../game/images';
  import { getRosterList, isOwned } from '../game/state/game.svelte';

  interface Props {
    onClose: () => void;
  }

  const { onClose }: Props = $props();

  const STAGES = [...IN_GAME_STAGES] as Stage[];
  const SPECIES_IDS_BY_STAGE: Record<Stage, string[]> = Object.fromEntries(
    STAGES.map((stage) => [stage, getSpeciesIdsByStage(stage)])
  ) as Record<Stage, string[]>;
  const TOTAL_SPECIES_COUNT = STAGES.reduce((sum, stage) => sum + SPECIES_IDS_BY_STAGE[stage].length, 0);

  let selectedStage: Stage = $state(STAGES[0]);

  const speciesIds = $derived(SPECIES_IDS_BY_STAGE[selectedStage]);

  // Discovered = owned (see state/roster.svelte.ts). isOwned reads the
  // roster directly, so this recomputes whenever a new species is added
  // while the screen is open, not just on stage switch.
  function discoveredCountFor(stage: Stage): number {
    return SPECIES_IDS_BY_STAGE[stage].filter((id) => isOwned(id)).length;
  }

  const totalDiscovered = $derived(getRosterList().length);

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
      <div class="panel-title">Compendium</div>
      <div class="panel-total">{totalDiscovered}/{TOTAL_SPECIES_COUNT} discovered</div>
      <button class="close-btn" onclick={onClose}>Close</button>
    </div>

    <div class="stage-tabs">
      {#each STAGES as stage (stage)}
        <div
          class="stage-tab"
          class:active={stage === selectedStage}
          onclick={() => (selectedStage = stage)}
          onkeydown={(e) => e.key === 'Enter' && (selectedStage = stage)}
          role="button"
          tabindex="0"
        >
          {stage}
          <span class="tab-count">{discoveredCountFor(stage)}/{SPECIES_IDS_BY_STAGE[stage].length}</span>
        </div>
      {/each}
    </div>

    <div class="grid">
      {#each speciesIds as speciesId (speciesId)}
        {#if isOwned(speciesId)}
          {@const species = getSpecies(speciesId)}
          {@const sprite = getSpriteUrl(speciesId)}
          <div class="card">
            <div class="card-sprite">
              {#if sprite}
                <img src={sprite} alt="" />
              {/if}
            </div>
            <div class="card-name">{species?.name ?? speciesId}</div>
          </div>
        {:else}
          <div class="card locked">
            <div class="card-sprite">
              <span class="unknown">?</span>
            </div>
            <div class="card-name">???</div>
          </div>
        {/if}
      {/each}
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
    gap: 16px;
  }
  .panel-title {
    font-family: var(--head);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-h);
  }
  .panel-total {
    font-size: 12px;
    color: var(--text-dim);
    margin-left: auto;
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
  .stage-tabs {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .stage-tab {
    padding: 8px 16px;
    font-size: 12px;
    letter-spacing: 1px;
    text-transform: uppercase;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .stage-tab.active {
    color: var(--text-h);
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .tab-count {
    font-size: 10px;
    color: var(--text-dim);
  }
  .grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
    overflow-y: auto;
    align-content: start;
  }
  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 10px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
  }
  .card.locked {
    opacity: 0.5;
  }
  .card-sprite {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--panel);
    border: 1px solid var(--panel-border);
  }
  .card-sprite img {
    width: 82%;
    height: 82%;
    object-fit: contain;
  }
  .unknown {
    font-family: var(--head);
    font-size: 28px;
    font-weight: 700;
    color: var(--text-dim);
  }
  .card-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-h);
    text-align: center;
  }
  .card.locked .card-name {
    color: var(--text-dim);
  }
</style>
