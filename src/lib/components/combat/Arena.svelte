<script lang="ts">
  import EnemyTag from './EnemyTag.svelte';
  import HpBar from './HpBar.svelte';
  import TimerBar from './TimerBar.svelte';
  import ClickableSprite from './ClickableSprite.svelte';
  import { combat, handleClick } from '../../game/state/game.svelte';
  import { getSpecies, getSpriteUrl } from '../../game/images';

  const wild = $derived(combat.wild);
  const species = $derived(wild ? getSpecies(wild.speciesId) : undefined);
  const spriteUrl = $derived(wild ? getSpriteUrl(wild.speciesId) : null);
</script>

<div class="arena">
  {#if wild && species}
    <EnemyTag name={species.name} level={wild.level} />
    <HpBar current={wild.currentHp} max={wild.maxHp} />
    <TimerBar {wild} />
    <ClickableSprite {spriteUrl} popup={combat.damagePopup} onClick={handleClick} />
  {/if}
</div>

<style>
  .arena {
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: radial-gradient(ellipse 500px 300px at 50% 60%, rgba(34, 211, 238, 0.08), transparent 70%);
    border: 1px solid var(--panel-border);
  }
</style>
