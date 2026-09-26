<script lang="ts">
  import {
    FILTER_STAGES,
    FILTER_ELEMENTS,
    FILTER_ATTRIBUTES,
    SORT_KEYS,
    DEFAULT_ROSTER_FILTER,
    ATTRIBUTE_LABEL,
    isFilterActive,
  } from '../../game/roster/rosterFilter';
  import type { RosterFilter, RosterSortKey } from '../../game/roster/rosterFilter';
  import type { Element } from '../../game/types';
  import IconSelect from './IconSelect.svelte';
  import { ABILITY_FAMILIES } from '../../game/abilities/abilityCatalog';
  import ElementIcon from './ElementIcon.svelte';
  import AttributeIcon from './AttributeIcon.svelte';

  // The shared stage / element / attribute / sort dropdowns - inline on the
  // Roster screen, stacked inside the sidebar's filter popup.
  interface Props {
    filter: RosterFilter;
    layout?: 'row' | 'stack';
  }

  let { filter = $bindable(), layout = 'row' }: Props = $props();
  const sortKeys = Object.keys(SORT_KEYS) as RosterSortKey[];

  const any = { value: 'Any' as const, label: 'Any' };
  const stageOptions = [any, ...FILTER_STAGES.map((s) => ({ value: s, label: s }))];
  const elementOptions = [any, ...FILTER_ELEMENTS.map((e) => ({ value: e, label: e }))];
  const attributeOptions = [any, ...FILTER_ATTRIBUTES.map((a) => ({ value: a, label: ATTRIBUTE_LABEL[a] }))];
  const abilityOptions = [any, ...ABILITY_FAMILIES.map((a) => ({ value: a, label: a }))];
  const sortOptions = sortKeys.map((k) => ({ value: k, label: SORT_KEYS[k] }));

  function reset() {
    filter = { ...DEFAULT_ROSTER_FILTER, sort: filter.sort };
  }
</script>

{#snippet elementIcon(value: string)}
  {#if value !== 'Any'}<ElementIcon element={value as Element} size={16} />{/if}
{/snippet}

{#snippet attributeIcon(value: string)}
  {#if value !== 'Any'}<AttributeIcon attribute={value} size={16} />{/if}
{/snippet}

<div class="controls {layout}">
  <label>
    Stage
    <IconSelect bind:value={filter.stage} options={stageOptions} label="Stage" />
  </label>
  <label>
    Element
    <IconSelect bind:value={filter.element} options={elementOptions} icon={elementIcon} label="Element" />
  </label>
  <label>
    Attribute
    <IconSelect bind:value={filter.attribute} options={attributeOptions} icon={attributeIcon} label="Attribute" />
  </label>
  <label>
    Ability
    <IconSelect bind:value={filter.ability} options={abilityOptions} label="Special ability" />
  </label>
  <label>
    Sort by
    <IconSelect bind:value={filter.sort} options={sortOptions} label="Sort by" />
  </label>
  {#if isFilterActive(filter)}
    <button class="reset" onclick={reset}>Reset filters</button>
  {/if}
</div>

<style>
  .controls {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    align-items: center;
  }
  .controls.stack {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-dim);
  }
  .stack label {
    flex-direction: column;
    align-items: stretch;
    gap: 3px;
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .reset {
    appearance: none;
    font: inherit;
    font-size: 11px;
    padding: 3px 8px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
  }
</style>
