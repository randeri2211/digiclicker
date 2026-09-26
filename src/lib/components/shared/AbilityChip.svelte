<script lang="ts">
  import type { AbilityContext } from '../../game/types';
  import { getAbility } from '../../game/abilities/abilityCatalog';

  // A Digimon's special ability as a small chip - where it works (icon and
  // color), its name, and its description on hover.

  interface Props {
    abilityId: string | null | undefined;
    /** Show the description next to the chip (the Stats window). */
    showDescription?: boolean;
    /** Dim abilities that don't work in this context (e.g. the boss prep
     * list dims roster auras and expedition abilities). */
    relevantIn?: AbilityContext;
  }

  const { abilityId, showDescription = false, relevantIn }: Props = $props();

  const ability = $derived(getAbility(abilityId));
  const CONTEXT = {
    roster: { icon: '✦', label: 'Roster aura - works while in the roster' },
    boss: { icon: '♛', label: 'Boss squad - works only in boss fights' },
    expedition: { icon: '⌖', label: 'Expedition - works only on an expedition party' },
  } as const;
</script>

{#if ability}
  <span class="ability" class:with-desc={showDescription}>
    <span
      class="chip {ability.context} tier-{ability.tier}"
      class:dim={relevantIn !== undefined && relevantIn !== ability.context}
      title="{ability.description} ({CONTEXT[ability.context].label})"
    >
      <span class="icon" aria-hidden="true">{CONTEXT[ability.context].icon}</span>{ability.name}
    </span>
    {#if showDescription}<span class="desc">{ability.description}</span>{/if}
  </span>
{/if}

<style>
  .ability {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .ability.with-desc {
    flex-wrap: wrap;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 6px;
    font-size: 9px;
    letter-spacing: 0.5px;
    white-space: nowrap;
    color: var(--text-h);
    background: var(--panel);
    border: 1px solid var(--panel-border);
  }
  .chip.roster .icon {
    color: var(--accent);
  }
  .chip.boss .icon {
    color: var(--warn);
  }
  .chip.expedition .icon {
    color: var(--pos);
  }
  /* Rarer tiers stand out. */
  .chip.tier-2 {
    border-color: var(--panel-border-strong);
  }
  .chip.tier-3 {
    border-color: var(--warn);
    box-shadow: 0 0 6px rgba(255, 176, 32, 0.25);
  }
  .chip.dim {
    opacity: 0.45;
  }
  .desc {
    font-size: 11px;
    color: var(--text);
    line-height: 1.4;
  }
</style>
