<script lang="ts">
  import {
    FILTER_STAGES,
    FILTER_ELEMENTS,
    FILTER_ATTRIBUTES,
    SORT_KEYS,
    DEFAULT_ROSTER_FILTER,
    isFilterActive,
  } from '../../game/roster/rosterFilter';
  import type { RosterFilter, RosterSortKey } from '../../game/roster/rosterFilter';

  // The shared stage / element / attribute / sort dropdowns - inline on the
  // Roster screen, stacked inside the sidebar's filter popup.
  interface Props {
    filter: RosterFilter;
    layout?: 'row' | 'stack';
  }

  let { filter = $bindable(), layout = 'row' }: Props = $props();
  const sortKeys = Object.keys(SORT_KEYS) as RosterSortKey[];

  function reset() {
    filter = { ...DEFAULT_ROSTER_FILTER, sort: filter.sort };
  }
</script>

<div class="controls {layout}">
  <label>
    Stage
    <select bind:value={filter.stage}>
      <option value="Any">Any</option>
      {#each FILTER_STAGES as stage (stage)}<option value={stage}>{stage}</option>{/each}
    </select>
  </label>
  <label>
    Element
    <select bind:value={filter.element}>
      <option value="Any">Any</option>
      {#each FILTER_ELEMENTS as element (element)}<option value={element}>{element}</option>{/each}
    </select>
  </label>
  <label>
    Attribute
    <select bind:value={filter.attribute}>
      <option value="Any">Any</option>
      {#each FILTER_ATTRIBUTES as attribute (attribute)}<option value={attribute}>{attribute}</option>{/each}
    </select>
  </label>
  <label>
    Sort by
    <select bind:value={filter.sort}>
      {#each sortKeys as key (key)}<option value={key}>{SORT_KEYS[key]}</option>{/each}
    </select>
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
  select {
    font: inherit;
    font-family: var(--mono);
    font-size: 12px;
    text-transform: none;
    letter-spacing: 0;
    padding: 2px 4px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text-h);
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
