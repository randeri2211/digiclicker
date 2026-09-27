<script lang="ts">
  import type { EggType } from '../game/types';
  import {
    currency,
    inventory,
    ITEM_CATALOG,
    buyItem,
    canAffordItem,
    buyMysteryEgg,
    isSystemUnlocked,
    lockedHint,
    MEAT_IDS,
    BOOSTS,
    boostRemainingMs,
    boostCost,
    canExtendBoost,
    buyBoost,
    UPGRADES,
    upgradeCost,
    buyUpgrade,
    shop,
    getDeals,
    isDealBought,
    buyDeal,
    dealWindowEndsAt,
  } from '../game/state/game.svelte';
  import type { BoostId } from '../game/types';
  import { MYSTERY_EGG_WEIGHTS } from '../game/eggs/mysteryEggs';
  import { getEggSpriteUrl } from '../game/images';
  import { MYSTERY_EGG_COST_BITS, SHOP_BOOST_MINUTES, SHOP_BOOST_MAX_BANKED_MINUTES } from '../game/constants';

  interface Props {
    onClose: () => void;
  }

  const { onClose }: Props = $props();

  // A 1s clock for boost timers and the deal countdown (deals also roll
  // over while the Shop is open).
  let now = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(id);
  });

  const shopOpen = $derived(isSystemUnlocked('shop'));
  // Boost deal prices follow the boost's own price, so re-read on purchases.
  const deals = $derived.by(() => {
    void [shop.boostPurchases.xp, shop.boostPurchases.bits, shop.boostPurchases.egg];
    return getDeals(now);
  });
  const eggTypes = Object.keys(MYSTERY_EGG_WEIGHTS) as EggType[];

  function formatMs(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m ${sec.toString().padStart(2, '0')}s`;
  }
  const bits = (n: number) => `${n.toLocaleString()} bits`;

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
  <div class="panel" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
    <div class="panel-header">
      <div class="panel-title">Shop</div>
      <div class="bits-note">You have {bits(Math.floor(currency.bits))}.</div>
      <button class="close-btn" onclick={onClose}>Close</button>
    </div>

    {#if !shopOpen}
      <div class="locked-note">🔒 {lockedHint('shop')}</div>
    {:else}
      <div class="section">
        <div class="section-title">Deals <span class="dim">- new ones in {formatMs(dealWindowEndsAt(now) - now)}; each can be bought once</span></div>
        <div class="grid">
          {#each deals as deal, i (i)}
            {@const bought = isDealBought(i, now)}
            {@const blocked = bought || currency.bits < deal.price || (deal.kind === 'boost' && !canExtendBoost(deal.id as BoostId, now))}
            <div class="card deal" class:bought class:chip={deal.kind === 'chip'}>
              <div class="card-name">{deal.name}</div>
              <div class="card-desc">{deal.description}</div>
              <div class="card-cost">{bits(deal.price)}</div>
              <button class="buy-btn" class:blocked disabled={blocked} onclick={() => buyDeal(i, now)}>
                {bought ? 'Bought' : 'Buy'}
              </button>
            </div>
          {/each}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Digi-Meat <span class="dim">- feed it from a Digimon's menu</span></div>
        <div class="grid">
          {#each MEAT_IDS as id (id)}
            {@const item = ITEM_CATALOG[id]}
            {@const affordable = canAffordItem(id)}
            <div class="card">
              <div class="card-name">{item.name} <span class="owned">×{inventory[id]}</span></div>
              <div class="card-desc">{item.description}</div>
              <div class="card-cost">{bits(item.costBits ?? 0)}</div>
              <button class="buy-btn" class:blocked={!affordable} disabled={!affordable} onclick={() => buyItem(id)}>Buy</button>
            </div>
          {/each}
        </div>
      </div>

      <div class="section">
        <div class="section-title">
          Boosts <span class="dim">- +{SHOP_BOOST_MINUTES} min each, up to {SHOP_BOOST_MAX_BANKED_MINUTES / 60}h banked; they keep running while you're away</span>
        </div>
        <div class="grid">
          {#each BOOSTS as boost (boost.id)}
            {@const left = boostRemainingMs(boost.id, now)}
            {@const cost = boostCost(boost.id)}
            {@const full = !canExtendBoost(boost.id, now)}
            <div class="card" class:running={left > 0}>
              <div class="card-name">{boost.name}</div>
              <div class="card-desc">{boost.description} for {SHOP_BOOST_MINUTES} min.</div>
              <div class="timer">{left > 0 ? `Running · ${formatMs(left)} left` : 'Not running'}</div>
              <div class="card-cost">{bits(cost)}</div>
              <button
                class="buy-btn"
                class:blocked={full || currency.bits < cost}
                disabled={full || currency.bits < cost}
                onclick={() => buyBoost(boost.id, now)}
              >
                {full ? 'Fully banked' : left > 0 ? 'Extend' : 'Buy'}
              </button>
            </div>
          {/each}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Upgrades <span class="dim">- permanent</span></div>
        <div class="grid">
          {#each UPGRADES as upgrade (upgrade.id)}
            {@const cost = upgradeCost(upgrade.id)}
            {@const tier = shop.upgrades[upgrade.id]}
            <div class="card">
              <div class="card-name">
                {upgrade.name}{#if upgrade.maxTier > 1}&nbsp;<span class="owned">{tier}/{upgrade.maxTier}</span>{/if}
              </div>
              <div class="card-desc">{upgrade.description}</div>
              <div class="card-cost">{cost === null ? 'Owned' : bits(cost)}</div>
              <button
                class="buy-btn"
                class:blocked={cost === null || currency.bits < cost}
                disabled={cost === null || currency.bits < cost}
                onclick={() => buyUpgrade(upgrade.id)}
              >
                {cost === null ? 'Maxed' : 'Buy'}
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="section">
      <div class="section-title">Digi-Eggs</div>
      {#if !isSystemUnlocked('mystery-eggs')}
        <div class="locked-note">🔒 {lockedHint('mystery-eggs')}</div>
      {:else}
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
              <div class="card-cost">{bits(MYSTERY_EGG_COST_BITS)}</div>
              <button class="buy-btn" class:blocked={!affordable} disabled={!affordable} onclick={() => buyMysteryEgg(eggType)}>Buy</button>
            </div>
          {/each}
        </div>
      {/if}
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
  .locked-note {
    font-size: 12px;
    color: var(--text-dim);
    padding: 10px 0;
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
  .dim {
    color: var(--text-dim);
    letter-spacing: 0;
    text-transform: none;
  }
  .owned {
    font-size: 11px;
    font-weight: 400;
    color: var(--text-dim);
  }
  .timer {
    font-size: 11px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .card.running {
    border-color: var(--pos);
  }
  .card.running .timer {
    color: var(--pos);
  }
  .card.deal {
    border-color: var(--accent);
  }
  .card.deal.chip {
    border-color: var(--warn);
  }
  .card.deal.bought {
    opacity: 0.55;
  }
</style>
