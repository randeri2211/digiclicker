<script lang="ts">
  import {
    roster,
    currency,
    abilityRerollDialog,
    closeAbilityReroll,
    abilityRerollCost,
    startAbilityReroll,
    chooseRerolledAbility,
    currentActNumber,
    getAbility,
  } from '../game/state/game.svelte';
  import { getSpeciesName, getSpriteUrl } from '../game/images';
  import { systemProvider } from '../game/village/village';
  import { ABILITY_REROLL_COST_CAP_BY_ACT, ABILITY_REROLL_COST_GROWTH } from '../game/constants';
  import AbilityChip from './shared/AbilityChip.svelte';

  // Rerolling one Digimon's special ability (abilities/abilities.ts): pay,
  // then pick 1 of 3 new abilities or keep the current one. A paid offer
  // stays on the Digimon, so closing this doesn't lose it.

  const entry = $derived(abilityRerollDialog.speciesId ? roster[abilityRerollDialog.speciesId] : undefined);
  const cost = $derived(entry ? abilityRerollCost(entry) : 0);
  const offer = $derived(entry?.abilityOffer ?? null);
  const cap = $derived.by(() => {
    const caps = ABILITY_REROLL_COST_CAP_BY_ACT;
    return caps[Math.min(currentActNumber(), caps.length) - 1];
  });
  const provider = systemProvider('ability-rerolls');
  const sprite = $derived(entry ? getSpriteUrl(entry.speciesId) : null);

  $effect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeAbilityReroll();
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if entry}
  <div
    class="backdrop"
    onclick={closeAbilityReroll}
    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && closeAbilityReroll()}
    role="button"
    tabindex="0"
  >
    <div class="panel" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1" aria-label="Reroll ability">
      <div class="header">
        <div class="portrait">{#if sprite}<img src={sprite} alt="" />{/if}</div>
        <div class="who">
          <div class="title">Reroll ability</div>
          <div class="name">{getSpeciesName(entry.speciesId)}{provider ? ` · with ${provider.name}` : ''}</div>
        </div>
        <button class="close-btn" onclick={closeAbilityReroll}>Close</button>
      </div>

      <div class="current">
        <span class="label">Current</span>
        <AbilityChip abilityId={entry.abilityId} showDescription />
      </div>

      {#if offer}
        <div class="label">Pick one - or keep the current ability</div>
        <div class="offer">
          {#each offer as id (id)}
            {@const ability = getAbility(id)}
            <button class="choice tier-{ability?.tier}" onclick={() => chooseRerolledAbility(entry, id)}>
              <AbilityChip abilityId={id} />
              <span class="choice-desc">{ability?.description}</span>
            </button>
          {/each}
        </div>
        <button class="keep" onclick={() => chooseRerolledAbility(entry, null)}>
          Keep {getAbility(entry.abilityId)?.name ?? 'the current ability'}
        </button>
      {:else}
        <div class="reroll-row">
          <button class="reroll" disabled={currency.bits < cost} onclick={() => startAbilityReroll(entry)}>
            Reroll · {cost.toLocaleString()} Bits
          </button>
          <span class="note">
            Offers 3 new abilities to choose from. Each reroll on this Digimon costs ×{ABILITY_REROLL_COST_GROWTH} more{cap
              ? `, up to ${cap.toLocaleString()} Bits in Act ${currentActNumber()}`
              : ''}. Digivolving passes the ability on.
          </span>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(5, 7, 10, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 25;
  }
  .panel {
    width: 520px;
    max-width: 94%;
    background: var(--panel);
    border: 1px solid var(--panel-border-strong);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .portrait {
    width: 52px;
    height: 52px;
    flex-shrink: 0;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .portrait img {
    width: 84%;
    height: 84%;
    object-fit: contain;
  }
  .who {
    flex: 1;
    min-width: 0;
  }
  .title {
    font-family: var(--head);
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-h);
  }
  .name {
    font-size: 12px;
    color: var(--text);
  }
  .label {
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .current {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
  }
  .offer {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .choice {
    appearance: none;
    font: inherit;
    text-align: left;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 10px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
  }
  .choice:hover {
    border-color: var(--accent);
  }
  .choice.tier-3 {
    border-color: var(--warn);
  }
  .choice-desc {
    font-size: 11px;
    line-height: 1.4;
  }
  .reroll-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .note {
    font-size: 11px;
    color: var(--text-dim);
    line-height: 1.4;
  }
  .close-btn,
  .keep,
  .reroll {
    appearance: none;
    font: inherit;
    font-size: 12px;
    padding: 8px 14px;
    cursor: pointer;
    white-space: nowrap;
  }
  .close-btn,
  .keep {
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
  }
  .close-btn {
    align-self: flex-start;
  }
  .keep {
    align-self: flex-start;
  }
  .close-btn:hover,
  .keep:hover {
    border-color: var(--panel-border-strong);
    color: var(--text-h);
  }
  .reroll {
    letter-spacing: 1px;
    text-transform: uppercase;
    background: var(--accent-soft);
    border: 1px solid var(--accent);
    color: var(--accent);
  }
  .reroll:disabled {
    opacity: 0.4;
    cursor: default;
  }
  @media (max-width: 560px) {
    .offer {
      grid-template-columns: 1fr;
    }
  }
</style>
