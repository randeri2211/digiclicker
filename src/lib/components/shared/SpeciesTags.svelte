<script lang="ts" module>
  // Re-exported for the components that import it from here.
  export { ELEMENT_COLOR } from './elementColors';
</script>

<script lang="ts">
  import { getSpecies } from '../../game/images';
  import ElementIcon from './ElementIcon.svelte';
  import AttributeIcon from './AttributeIcon.svelte';

  // The matchup triangle; every other attribute is neutral in boss fights.
  const MATCHUP_ATTRIBUTES = new Set(['Vaccine', 'Data', 'Virus']);

  interface Props {
    speciesId: string;
    /** Also show the stage, as the first chip (the Stats window). */
    showStage?: boolean;
  }

  const { speciesId, showStage = false }: Props = $props();

  const species = $derived(getSpecies(speciesId));
</script>

{#if species}
  <span class="tags">
    {#if showStage}<span class="tag stage" title="Stage">{species.stage}</span>{/if}
    <span
      class="tag"
      title={MATCHUP_ATTRIBUTES.has(species.attribute)
        ? 'Attribute - Vaccine beats Virus, Virus beats Data, Data beats Vaccine'
        : 'Attribute - neutral in matchups'}
    >
      <AttributeIcon attribute={species.attribute} size={12} />{species.attribute}
    </span>
    <span class="tag" title="Element">
      <ElementIcon element={species.element} size={12} />{species.element}
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
  .tag.stage {
    color: var(--text-h);
    border-color: var(--panel-border-strong);
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
</style>
