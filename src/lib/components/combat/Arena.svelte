<script lang="ts">
  import EnemyTag from './EnemyTag.svelte';
  import HpBar from './HpBar.svelte';
  import ClickableSprite from './ClickableSprite.svelte';
  import TameReadout from './TameReadout.svelte';
  import { combat, team, handleClick } from '../../game/state/game.svelte';
  import { getSpecies, getSpriteUrl } from '../../game/images';
  import { levelForXp } from '../../game/combat/levelCurve';
  import { computeTameChancePercent } from '../../game/combat/spawn';

  const wild = $derived(combat.wild);
  const species = $derived(wild ? getSpecies(wild.speciesId) : undefined);
  const spriteUrl = $derived(wild ? getSpriteUrl(wild.speciesId) : null);

  const avgTeamLevel = $derived.by(() => {
    const members = [...team.activeMembers, ...team.trainingMembers];
    if (members.length === 0) return 1;
    const total = members.reduce((sum, m) => sum + levelForXp(m.xp), 0);
    return total / members.length;
  });

  const tameChance = $derived(wild ? computeTameChancePercent(avgTeamLevel, wild.level) : 0);
</script>

<div class="arena">
  {#if wild && species}
    <EnemyTag name={species.name} level={wild.level} />
    <HpBar current={wild.currentHp} max={wild.maxHp} />
    <ClickableSprite {spriteUrl} popup={combat.damagePopup} onClick={handleClick} />
    <TameReadout chancePercent={tameChance} />
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
