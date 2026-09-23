<script lang="ts" module>
  import type { Element } from '../../game/types';

  // Identity dots only - chip text stays in the normal text color, so a
  // hue never has to carry readability on the dark panels.
  export const ELEMENT_COLOR: Record<Element, string> = {
    Fire: '#e8663d',
    Water: '#3a8fe8',
    Plant: '#3fae5a',
    Electric: '#e6c229',
    Earth: '#b08452',
    Wind: '#7fd1c7',
    Metal: '#9aa7b0',
    Light: '#f1e7b0',
    Dark: '#9a7be0',
    Neutral: '#6d878c',
  };

  const MATCHUP_ATTRIBUTES = new Set(['Vaccine', 'Data', 'Virus']);
</script>

<script lang="ts">
  import { getSpecies } from '../../game/images';

  interface Props {
    speciesId: string;
  }

  const { speciesId }: Props = $props();

  const species = $derived(getSpecies(speciesId));
</script>

{#if species}
  <span class="tags">
    {#if MATCHUP_ATTRIBUTES.has(species.attribute)}
      <span class="tag" title="Attribute - Vaccine beats Virus, Virus beats Data, Data beats Vaccine">{species.attribute}</span>
    {/if}
    <span class="tag" title="Element">
      <i class="dot" style="background: {ELEMENT_COLOR[species.element] ?? ELEMENT_COLOR.Neutral}"></i>{species.element}
    </span>
  </span>
{/if}

<style>
  .tags {
    display: inline-flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
  }
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 6px;
    font-size: 9px;
    letter-spacing: 0.5px;
    color: var(--text);
    background: var(--panel);
    border: 1px solid var(--panel-border);
    white-space: nowrap;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
</style>
