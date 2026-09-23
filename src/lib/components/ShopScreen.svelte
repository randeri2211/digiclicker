<script lang="ts">
  import type { EggType, ItemId } from '../game/types';
  import { currency, buyItem, canAffordItem, ITEM_CATALOG, buyMysteryEgg } from '../game/state/game.svelte';
  import { MYSTERY_EGG_WEIGHTS } from '../game/eggs/mysteryEggs';
  import { getEggSpriteUrl } from '../game/images';
  import { MYSTERY_EGG_COST_BITS } from '../game/constants';

  interface Props {
    onClose: () => void;
  }

  const { onClose }: Props = $props();

  const itemEntries = Object.values(ITEM_CATALOG);
  const eggTypes = Object.keys(MYSTERY_EGG_WEIGHTS) as EggType[];

  function handleBuyItem(id: ItemId) {
    buyItem(id);
  }

  function handleBuyEgg(eggType: EggType) {
    buyMysteryEgg(eggType);
  }

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
      <div class="panel-title">Shop</div>
      <div class="bits-note">You have {currency.bits} bits.</div>
      <button class="close-btn" onclick={onClose}>Close</button>
    </div>

    <div class="section">
      <div class="section-title">Items</div>
      <div class="grid">
        {#each itemEntries as item (item.id)}
          {@const affordable = canAffordItem(item.id)}
          <div class="card">
            <div class="card-name">{item.name}</div>
            <div class="card-desc">{item.description}</div>
            <div class="card-cost">{item.costBits} bits</div>
            <button
              class="buy-btn"
              class:blocked={!affordable}
              disabled={!affordable}
              onclick={() => handleBuyItem(item.id)}
            >
              Buy
            </button>
          </div>
        {/each}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Digi-Eggs</div>
      <div class="grid">
        {#each eggTypes as eggType (eggType)}
          {@const affordable = currency.bits >= MYSTERY_EGG_COST_BITS}
          <div class="card">
            <div class="card-sprite">
              <img src={getEggSpriteUrl(eggType)} alt="" />
              <span class="mystery-badge">?</span>
            </div>
            <div class="card-name">Mystery {eggType} Digi-Egg</div>
            <div class="card-desc">Hatches into a random {eggType}-flavored Fresh Digimon.</div>
            <div class="card-cost">{MYSTERY_EGG_COST_BITS} bits</div>
            <button
              class="buy-btn"
              class:blocked={!affordable}
              disabled={!affordable}
              onclick={() => handleBuyEgg(eggType)}
            >
              Buy
            </button>
          </div>
        {/each}
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
  .bits-note {
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
  .card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
  }
  .card-sprite {
    position: relative;
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    align-self: center;
  }
  .card-sprite img {
    width: 82%;
    height: 82%;
    object-fit: contain;
  }
  .mystery-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    font-family: var(--head);
    font-size: 11px;
    font-weight: 800;
    color: var(--text-h);
    background: var(--accent-soft);
    border: 1px solid var(--accent);
    width: 15px;
    height: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .card-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-h);
  }
  .card-desc {
    font-size: 11px;
    color: var(--text-dim);
  }
  .card-cost {
    font-size: 12px;
    color: var(--accent);
  }
  .buy-btn {
    appearance: none;
    font: inherit;
    font-family: var(--mono);
    background: var(--panel);
    border: 1px solid var(--panel-border);
    color: var(--text-h);
    font-size: 12px;
    padding: 8px 12px;
    cursor: pointer;
    margin-top: auto;
  }
  .buy-btn:hover:not(.blocked) {
    border-color: var(--accent);
  }
  .buy-btn.blocked {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
