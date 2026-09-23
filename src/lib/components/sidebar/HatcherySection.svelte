<script lang="ts">
  import HatcherySlot from './HatcherySlot.svelte';
  import { hatchery, currency, hatchEgg, isEggReady } from '../../game/state/game.svelte';
  import { getEggSpriteUrl } from '../../game/images';
  import { levelForXp } from '../../game/combat/levelCurve';
  import { EGG_HATCH_LEVEL, HATCH_DATA_COST } from '../../game/constants';

  const emptyCount = $derived(Math.max(0, hatchery.capacity - hatchery.incubating.length));
  const lockedCount = $derived(Math.max(0, hatchery.maxCapacity - hatchery.capacity));
</script>

<div class="side-section">
  <div class="side-head">
    <div class="side-title">Hatchery</div>
    <div class="side-count">{hatchery.incubating.length} / {hatchery.capacity}</div>
  </div>
  <div class="slot-grid">
    {#each hatchery.incubating as egg (egg.eggId)}
      <HatcherySlot
        variant="filled"
        spriteUrl={getEggSpriteUrl(egg.eggType)}
        level={levelForXp(egg.xp)}
        isMystery={egg.isMystery}
        ready={isEggReady(egg)}
        readyLabel="{HATCH_DATA_COST} Data"
        affordable={currency.data >= HATCH_DATA_COST}
        onHatch={() => hatchEgg(egg.eggId)}
      />
    {/each}
    {#each Array.from({ length: emptyCount }) as _, i (i)}
      <HatcherySlot variant="empty" />
    {/each}
    {#each Array.from({ length: lockedCount }) as _, i (i)}
      <HatcherySlot variant="locked" />
    {/each}
  </div>
  <div class="xp-note">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l2.4 7.4H22l-6.2 4.5L18 21l-6-4.4L6 21l2.2-7.1L2 9.4h7.6L12 2z"
        stroke="currentColor"
        stroke-width="1.3"
      />
    </svg>
    Ready at Lv {EGG_HATCH_LEVEL}, hatch for {HATCH_DATA_COST} Data{#if hatchery.stored.length > 0}&nbsp;· {hatchery.stored.length} waiting{/if}
  </div>
</div>

<style>
  .side-section {
    margin-bottom: 28px;
  }
  .side-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .side-title {
    font-family: var(--head);
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-h);
  }
  .side-count {
    font-size: 12px;
    color: var(--text-dim);
  }
  .slot-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .xp-note {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--text-dim);
    margin-top: 10px;
  }
</style>
