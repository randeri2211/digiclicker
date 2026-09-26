<script lang="ts">
  import EnemyTag from './EnemyTag.svelte';
  import HpBar from './HpBar.svelte';
  import TimerBar from './TimerBar.svelte';
  import ClickableSprite from './ClickableSprite.svelte';
  import { combat, handleClick, retreatBossFight, dismissBossResult } from '../../game/state/game.svelte';
  import { getSpecies, getSpriteUrl, getSpeciesName } from '../../game/images';
  import { formatMultiplier, multiplierTone } from '../shared/matchup';

  const wild = $derived(combat.wild);
  const species = $derived(wild ? getSpecies(wild.speciesId) : undefined);
  const spriteUrl = $derived(wild ? getSpriteUrl(wild.speciesId) : null);
  const result = $derived(combat.lastBossResult);

  // The victory/defeat banner clears itself after a few seconds.
  $effect(() => {
    if (!result) return;
    const id = result.id;
    const timeout = setTimeout(() => {
      if (combat.lastBossResult?.id === id) dismissBossResult();
    }, 6000);
    return () => clearTimeout(timeout);
  });
</script>

<div class="arena" class:boss={combat.boss} data-tip="arena">
  {#if result}
    <div class="result" class:won={result.won} role="status">
      <span class="result-title">{result.won ? `${getSpeciesName(result.speciesId)} defeated!` : "Time's up"}</span>
      <span class="result-detail">
        {#if result.won}
          +{result.bits} bits · +{result.data} Data{result.firstClear ? ' · Area cleared' : ''}
        {:else}
          {getSpeciesName(result.speciesId)} held on - try a different squad.
        {/if}
      </span>
      <button class="result-close" onclick={dismissBossResult} aria-label="Dismiss">×</button>
    </div>
  {/if}

  {#if wild && species}
    <div class="tag-row">
      {#if combat.boss}<span class="boss-badge">Boss</span>{/if}
      <EnemyTag name={species.name} level={wild.level} />
    </div>
    <HpBar current={wild.currentHp} max={wild.maxHp} />
    {#if wild.timeLimitMs !== null}
      <TimerBar {wild} />
    {/if}
    <ClickableSprite {spriteUrl} popup={combat.damagePopup} onClick={handleClick} />

    {#if combat.boss}
      <div class="squad">
        {#each combat.boss.squad as member (member.speciesId)}
          {@const sprite = getSpriteUrl(member.speciesId)}
          <div class="squad-member" title="{getSpeciesName(member.speciesId)} - stats x{member.multiplier}">
            {#if sprite}<img src={sprite} alt="" />{/if}
            <span class="mult {multiplierTone(member.multiplier)}">{formatMultiplier(member.multiplier)}</span>
          </div>
        {/each}
        <button class="retreat" onclick={retreatBossFight}>Retreat</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  /* Sized by the space left over, never by its content (basis 0, explicit
     min-height): the arena empties for a moment between kills and grows a
     timer bar in boss fights, and a content-sized arena made the map below
     jump. It shares the column with the map 3:2; the sprite shrinks to fit
     (container query units, see ClickableSprite). */
  .arena {
    flex: 3 1 0;
    min-height: 0;
    overflow: hidden;
    container-type: size;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: radial-gradient(ellipse 500px 300px at 50% 60%, rgba(34, 211, 238, 0.08), transparent 70%);
    border: 1px solid var(--panel-border);
  }
  .arena.boss {
    background: radial-gradient(ellipse 500px 300px at 50% 60%, rgba(255, 59, 92, 0.1), transparent 70%);
    border-color: rgba(255, 59, 92, 0.45);
  }
  .tag-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .boss-badge {
    font-family: var(--head);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--danger);
    border: 1px solid var(--danger);
    padding: 2px 8px;
  }
  .squad {
    position: absolute;
    left: 16px;
    bottom: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .squad-member {
    position: relative;
    width: 48px;
    height: 48px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .squad-member img {
    width: 80%;
    height: 80%;
    object-fit: contain;
  }
  .mult {
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 10px;
    padding: 0 4px;
    background: var(--bg);
    border: 1px solid currentColor;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .mult.good {
    color: var(--pos);
  }
  .mult.neutral {
    color: var(--text);
  }
  .mult.bad {
    color: var(--danger);
  }
  .retreat {
    appearance: none;
    font: inherit;
    font-size: 11px;
    margin-left: 8px;
    padding: 6px 12px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
  }
  .retreat:hover {
    border-color: var(--danger);
    color: var(--danger);
  }
  .result {
    position: absolute;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 10px 36px 10px 20px;
    background: var(--panel);
    border: 1px solid var(--danger);
    text-align: center;
  }
  .result.won {
    border-color: var(--pos);
  }
  .result-title {
    font-family: var(--head);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--text-h);
  }
  .result-detail {
    font-size: 11px;
    color: var(--text);
  }
  .result-close {
    position: absolute;
    top: 4px;
    right: 6px;
    appearance: none;
    border: none;
    background: none;
    color: var(--text-dim);
    font-size: 16px;
    cursor: pointer;
  }
</style>
