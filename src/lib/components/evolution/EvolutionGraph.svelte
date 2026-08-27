<script lang="ts">
  import type { DigimonInstance, StatBlock } from '../../game/types';
  import { getSpecies, getSpriteUrl } from '../../game/images';
  import { levelForXp } from '../../game/combat/levelCurve';
  import {
    getDigivolveOptions,
    getDedigivolveOptions,
    digivolve,
    dedigivolve,
  } from '../../game/state/game.svelte';
  import type { DigivolutionOption } from '../../game/state/game.svelte';

  function formatStatBlock(block: StatBlock, signed: boolean): string {
    const fmt = (n: number) => (signed ? `${n >= 0 ? '+' : ''}${n}` : `${n}`);
    return `ATK ${fmt(block.attack)} · DEF ${fmt(block.defense)} · SPD ${fmt(block.speed)} · SPA ${fmt(block.specialAttack)}`;
  }

  interface Props {
    instance: DigimonInstance;
  }

  const { instance }: Props = $props();

  let digivolveOptions: DigivolutionOption[] = $state([]);
  let dedigivolveOptions: DigivolutionOption[] = $state([]);

  $effect(() => {
    // Depends only on speciesId (and formHistory, which only ever changes
    // in lockstep with speciesId) - deliberately never reads instance.xp,
    // so the combat tick loop's constant XP mutation doesn't re-roll these
    // previews while the graph just sits open.
    void instance.speciesId;
    digivolveOptions = getDigivolveOptions(instance);
    dedigivolveOptions = getDedigivolveOptions(instance);
  });

  const currentSpecies = $derived(getSpecies(instance.speciesId));

  function commitDigivolve(option: DigivolutionOption) {
    digivolve(instance, option.species.id, option.digivolutionStatsBonus, option.growthPerLevelPreview);
  }

  function commitDedigivolve(option: DigivolutionOption) {
    dedigivolve(instance, option.species.id, option.digivolutionStatsBonus, option.growthPerLevelPreview);
  }
</script>

{#snippet optionCard(option: DigivolutionOption, onCommit: (o: DigivolutionOption) => void)}
  {@const sprite = getSpriteUrl(option.species.id)}
  <div
    class="option-card"
    class:blocked={!option.requirementMet}
    onclick={() => option.requirementMet && onCommit(option)}
    onkeydown={(e) => e.key === 'Enter' && option.requirementMet && onCommit(option)}
    role="button"
    tabindex="0"
  >
    <div class="option-sprite">
      {#if sprite}
        <img src={sprite} alt="" />
      {:else}
        <span class="no-sprite">{option.species.name}</span>
      {/if}
    </div>
    <div class="option-name">{option.species.name}</div>
    <div class="option-stage">{option.species.stage} · {option.species.statType}</div>
    <div class="option-bonus">{formatStatBlock(option.digivolutionStatsBonus, true)}</div>
    <div class="option-growth">New growth/lvl: {formatStatBlock(option.growthPerLevelPreview, false)}</div>
    <div class="option-req">{option.requirement ? 'Requirements apply' : 'No requirements'}</div>
  </div>
{/snippet}

<div class="graph">
  <div class="tier-label">Digivolves to</div>
  <div class="tier-row">
    {#if digivolveOptions.length === 0}
      <div class="empty-note">No further digivolutions available.</div>
    {:else}
      {#each digivolveOptions as option (option.species.id)}
        {@render optionCard(option, commitDigivolve)}
      {/each}
    {/if}
  </div>

  <div class="stem"></div>

  <div class="current-card">
    <div class="current-sprite">
      {#if getSpriteUrl(instance.speciesId)}
        <img src={getSpriteUrl(instance.speciesId)} alt="" />
      {:else}
        <span class="no-sprite">{currentSpecies?.name ?? instance.speciesId}</span>
      {/if}
    </div>
    <div class="current-name">{currentSpecies?.name ?? instance.speciesId}</div>
    <div class="current-meta">
      {currentSpecies?.stage ?? 'Unknown'} · Lv {levelForXp(instance.xp)}
    </div>
    <div class="current-stats">Digivolution stats: {formatStatBlock(instance.digivolutionStats, false)}</div>
  </div>

  <div class="stem"></div>

  <div class="tier-row">
    {#if dedigivolveOptions.length === 0}
      <div class="empty-note">No prior forms in the evolution graph.</div>
    {:else}
      {#each dedigivolveOptions as option (option.species.id)}
        {@render optionCard(option, commitDedigivolve)}
      {/each}
    {/if}
  </div>
  <div class="tier-label">De-digivolves to</div>
</div>

<style>
  .graph {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    overflow: hidden;
  }
  .tier-label {
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-dim);
    margin: 6px 0;
  }
  .tier-row {
    display: flex;
    gap: 14px;
    padding: 4px 8px 12px;
    overflow-x: auto;
    max-width: 100%;
    border-top: 1px solid var(--panel-border);
  }
  .tier-row:last-of-type {
    border-top: none;
    border-bottom: 1px solid var(--panel-border);
  }
  .stem {
    width: 1px;
    height: 18px;
    background: var(--panel-border-strong);
  }
  .empty-note {
    font-size: 12px;
    color: var(--text-dim);
    padding: 10px;
  }

  .option-card {
    flex-shrink: 0;
    width: 168px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    cursor: pointer;
    text-align: center;
  }
  .option-card:hover {
    border-color: var(--accent);
  }
  .option-card.blocked {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .option-sprite {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
  }
  .option-sprite img {
    width: 82%;
    height: 82%;
    object-fit: contain;
  }
  .no-sprite {
    font-size: 10px;
    color: var(--text-dim);
    padding: 4px;
    word-break: break-word;
  }
  .option-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-h);
  }
  .option-stage {
    font-size: 10px;
    color: var(--accent);
  }
  .option-bonus {
    font-size: 10px;
    color: var(--pos);
  }
  .option-growth {
    font-size: 9px;
    color: var(--accent);
  }
  .option-req {
    font-size: 9px;
    color: var(--text-dim);
  }

  .current-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 14px;
    background: var(--accent-soft);
    border: 1px solid var(--panel-border-strong);
  }
  .current-sprite {
    width: 96px;
    height: 96px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
  }
  .current-sprite img {
    width: 82%;
    height: 82%;
    object-fit: contain;
  }
  .current-name {
    font-family: var(--head);
    font-size: 16px;
    font-weight: 700;
    color: var(--text-h);
  }
  .current-meta {
    font-size: 12px;
    color: var(--text);
  }
  .current-stats {
    font-size: 11px;
    color: var(--pos);
  }
</style>
