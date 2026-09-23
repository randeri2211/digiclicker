<script lang="ts">
  import type { DigimonInstance, StatBlock, StatRangeBlock } from '../../game/types';
  import { getSpecies, getSpriteUrl, getEggSpriteUrl, getInstanceDisplayName, isMysteryEgg } from '../../game/images';
  import { levelForXp } from '../../game/combat/levelCurve';
  import {
    getDigivolveOptions,
    getDedigivolveOptions,
    digivolve,
    dedigivolve,
    ITEM_CATALOG,
    automation,
    setPreference,
    clearPreference,
  } from '../../game/state/game.svelte';
  import type { DigivolutionOption } from '../../game/state/game.svelte';
  import { getItemCount } from '../../game/state/inventory.svelte';
  import { MAX_LEVEL } from '../../game/constants';

  function formatStatBlock(block: StatBlock, signed: boolean): string {
    const fmt = (n: number) => (signed ? `${n >= 0 ? '+' : ''}${n}` : `${n}`);
    return `ATK ${fmt(block.attack)} · HP ${fmt(block.hp)} · SPD ${fmt(block.speed)} · SPA ${fmt(block.specialAttack)}`;
  }

  // Ranges are shown instead of a rolled number - the actual roll only
  // happens at the moment of commit (see digivolve.ts), so there's nothing
  // here for the player to preview-reroll by reopening the screen.
  function formatStatRange(block: StatRangeBlock, signed: boolean): string {
    const fmt = ([min, max]: [number, number]) => {
      const lo = Math.round(min);
      const hi = Math.round(max);
      const sign = signed && lo >= 0 ? '+' : '';
      return lo === hi ? `${sign}${lo}` : `${sign}${lo}–${hi}`;
    };
    return `ATK ${fmt(block.attack)} · HP ${fmt(block.hp)} · SPD ${fmt(block.speed)} · SPA ${fmt(block.specialAttack)}`;
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
  // An unhatched egg's speciesId is already resolved but hidden until it
  // hatches - show the per-type egg art/name instead of spoiling it.
  const currentSprite = $derived(instance.eggState ? getEggSpriteUrl(instance.eggState.eggType) : getSpriteUrl(instance.speciesId));
  const currentName = $derived(getInstanceDisplayName(instance));
  const currentStage = $derived(instance.eggState ? 'Egg' : (currentSpecies?.stage ?? 'Unknown'));

  function commitDigivolve(option: DigivolutionOption) {
    digivolve(instance, option.species.id);
  }

  function commitDedigivolve(option: DigivolutionOption) {
    dedigivolve(instance, option.species.id);
  }

  // Only one option can be mid-edit at a time (one preference per source
  // species anyway) - nothing is written to the real preference until
  // Confirm, so adjusting the level or backing out costs nothing.
  let pendingPinTargetId: string | null = $state(null);
  let pendingMinLevel: number = $state(0);

  function startPinEdit(option: DigivolutionOption, event: Event) {
    event.stopPropagation();
    const existing = automation.preferences[instance.speciesId];
    pendingPinTargetId = option.species.id;
    pendingMinLevel = existing?.targetSpeciesId === option.species.id ? existing.minLevel : (option.requirement?.minLevel ?? 0);
  }

  function cancelPinEdit(event: Event) {
    event.stopPropagation();
    pendingPinTargetId = null;
  }

  function unpin(event: Event) {
    event.stopPropagation();
    clearPreference(instance.speciesId);
    pendingPinTargetId = null;
  }

  // Confirm is the only moment a preference actually gets written - caps
  // the entered level to MAX_LEVEL, then checks eligibility right away
  // rather than silently waiting for the next kill: if this instance
  // already meets both the option's normal requirement and the level just
  // confirmed, digivolve immediately. digivolve() leaves a same-target
  // preference untouched, so the custom level just set survives it.
  function confirmPin(option: DigivolutionOption, event: Event) {
    event.stopPropagation();
    const clampedLevel = Math.min(Math.max(0, Math.round(pendingMinLevel) || 0), MAX_LEVEL);
    setPreference(instance.speciesId, option.species.id, clampedLevel);
    pendingPinTargetId = null;

    if (option.requirementMet && levelForXp(instance.xp) >= clampedLevel) {
      digivolve(instance, option.species.id);
    }
  }
</script>

{#snippet optionCard(option: DigivolutionOption, onCommit: (o: DigivolutionOption) => void, showPin: boolean)}
  {@const sprite = getSpriteUrl(option.species.id)}
  {@const pinnedPreference = showPin ? automation.preferences[instance.speciesId] : undefined}
  {@const isPinned = pinnedPreference?.targetSpeciesId === option.species.id}
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
    <div class="option-stage">{option.species.stage} · {option.species.statAffinity}</div>
    <div class="option-bonus">{formatStatRange(option.digivolutionStatsBonusRange, true)}</div>
    <div class="option-growth">Growth/lvl: {formatStatRange(option.growthPerLevelRange, false)}</div>
    <div class="option-req">
      {#if option.requirement?.itemId !== undefined}
        {@const count = option.requirement.itemCount ?? 1}
        {@const have = getItemCount(option.requirement.itemId)}
        Needs {count}x {ITEM_CATALOG[option.requirement.itemId].name} (have {have})
      {:else if option.requirement?.minLevel !== undefined}
        Requires Lv {option.requirement.minLevel}
      {:else}
        No requirements
      {/if}
    </div>
    {#if showPin}
      {@const isEditing = pendingPinTargetId === option.species.id}
      <div class="pin-row">
        {#if isEditing}
          <label class="pin-level">
            Min Lv
            <input
              type="number"
              min="0"
              max={MAX_LEVEL}
              bind:value={pendingMinLevel}
              onclick={(e) => e.stopPropagation()}
            />
          </label>
          <button class="pin-btn confirm" onclick={(e) => confirmPin(option, e)}>Confirm</button>
          <button class="pin-btn" onclick={cancelPinEdit}>Cancel</button>
        {:else if isPinned}
          <span class="pin-btn pinned">Pinned (Lv {pinnedPreference?.minLevel})</span>
          <button class="pin-btn" onclick={(e) => startPinEdit(option, e)}>Edit</button>
          <button class="pin-btn" onclick={unpin}>Unpin</button>
        {:else}
          <button class="pin-btn" onclick={(e) => startPinEdit(option, e)}>Pin</button>
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

<div class="graph">
  <div class="tier-label">Digivolves to</div>
  <div class="tier-row">
    {#if digivolveOptions.length === 0}
      <div class="empty-note">No further digivolutions available.</div>
    {:else}
      {#each digivolveOptions as option (option.species.id)}
        {@render optionCard(option, commitDigivolve, true)}
      {/each}
    {/if}
  </div>

  <div class="stem"></div>

  <div class="current-card">
    <div class="current-sprite">
      {#if currentSprite}
        <img src={currentSprite} alt="" />
      {:else}
        <span class="no-sprite">{currentName}</span>
      {/if}
      {#if isMysteryEgg(instance)}
        <span class="mystery-badge">?</span>
      {/if}
    </div>
    <div class="current-name">{currentName}</div>
    <div class="current-meta">
      {currentStage} · Lv {levelForXp(instance.xp)}
    </div>
    <div class="current-stats">Digivolution stats: {formatStatBlock(instance.digivolutionStats, false)}</div>
  </div>

  <div class="stem"></div>

  <div class="tier-row">
    {#if dedigivolveOptions.length === 0}
      <div class="empty-note">No prior forms in the evolution graph.</div>
    {:else}
      {#each dedigivolveOptions as option (option.species.id)}
        {@render optionCard(option, commitDedigivolve, false)}
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
  .pin-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
  }
  .pin-btn {
    appearance: none;
    font: inherit;
    font-family: var(--mono);
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text-dim);
    font-size: 9px;
    padding: 3px 8px;
    cursor: pointer;
  }
  .pin-btn.pinned {
    color: var(--text-h);
    border-color: var(--accent);
    background: var(--accent-soft);
    cursor: default;
  }
  .pin-btn.confirm {
    color: var(--pos);
    border-color: var(--pos);
  }
  .pin-level {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 9px;
    color: var(--text-dim);
  }
  .pin-level input {
    width: 42px;
    font: inherit;
    font-family: var(--mono);
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text-h);
    padding: 2px 4px;
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
    position: relative;
    width: 96px;
    height: 96px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
  }
  .mystery-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    font-family: var(--head);
    font-size: 12px;
    font-weight: 800;
    color: var(--text-h);
    background: var(--accent-soft);
    border: 1px solid var(--accent);
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
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
