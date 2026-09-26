<script lang="ts" generics="T extends string">
  import type { Snippet } from 'svelte';

  // A small dropdown whose options can carry an icon - a native <select>
  // can't show images. Keyboard: Up/Down to move, Enter/Space to pick,
  // Escape to close, a letter jumps to the next option starting with it.
  interface Option {
    value: T;
    label: string;
  }

  interface Props {
    value: T;
    options: Option[];
    /** Renders the icon for an option (omit for text-only). */
    icon?: Snippet<[T]>;
    label?: string;
  }

  let { value = $bindable(), options, icon, label = '' }: Props = $props();

  let open = $state(false);
  let active = $state(0);
  let root: HTMLDivElement | undefined = $state();
  // Unique ids so the button can point at the highlighted option.
  const uid = `icon-select-${Math.random().toString(36).slice(2, 8)}`;

  const selected = $derived(options.find((o) => o.value === value) ?? options[0]);

  function toggle() {
    open = !open;
    if (open) active = Math.max(0, options.findIndex((o) => o.value === value));
  }

  function pick(option: Option) {
    value = option.value;
    open = false;
  }

  function onKeydown(e: KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
      return;
    }
    if (e.key === 'ArrowDown') active = (active + 1) % options.length;
    else if (e.key === 'ArrowUp') active = (active - 1 + options.length) % options.length;
    else if (e.key === 'Enter' || e.key === ' ') pick(options[active]);
    else if (e.key === 'Escape') open = false;
    else if (e.key.length === 1) {
      const letter = e.key.toLowerCase();
      const next = options.findIndex((o, i) => i > active && o.label.toLowerCase().startsWith(letter));
      const wrap = options.findIndex((o) => o.label.toLowerCase().startsWith(letter));
      if (next !== -1 || wrap !== -1) active = next !== -1 ? next : wrap;
    } else return;
    e.preventDefault();
    e.stopPropagation(); // keep Escape from also closing a surrounding popup
  }

  // Close on a click anywhere else.
  $effect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (root && !root.contains(e.target as Node)) open = false;
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  });
</script>

<div class="icon-select" bind:this={root}>
  <button
    type="button"
    class="current"
    role="combobox"
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls="{uid}-list"
    aria-activedescendant={open ? `${uid}-${active}` : undefined}
    aria-label={label ? `${label}: ${selected.label}` : selected.label}
    onclick={toggle}
    onkeydown={onKeydown}
  >
    {#if icon && selected}<span class="icon">{@render icon(selected.value)}</span>{/if}
    <span class="text">{selected?.label}</span>
    <span class="caret">▾</span>
  </button>
  {#if open}
    <ul class="options" id="{uid}-list" role="listbox" aria-label={label}>
      {#each options as option, i (option.value)}
        <!-- Keys are handled on the button (focus stays there, pointing at
             the highlighted option via aria-activedescendant). -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li
          id="{uid}-{i}"
          role="option"
          aria-selected={option.value === value}
          class:active={i === active}
          class:chosen={option.value === value}
          onmousedown={(e) => e.preventDefault()}
          onclick={() => pick(option)}
          onmouseenter={() => (active = i)}
        >
          {#if icon}<span class="icon">{@render icon(option.value)}</span>{/if}
          {option.label}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .icon-select {
    position: relative;
    display: inline-block;
    text-transform: none;
    letter-spacing: 0;
  }
  .current {
    appearance: none;
    font: inherit;
    font-family: var(--mono);
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 96px;
    width: 100%;
    padding: 2px 6px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text-h);
    cursor: pointer;
    text-align: left;
  }
  .current:focus-visible {
    outline: 1px solid var(--accent);
  }
  .text {
    flex: 1;
  }
  .caret {
    font-size: 10px;
    color: var(--text-dim);
  }
  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
  .options {
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    z-index: 20;
    min-width: 100%;
    max-height: 280px;
    overflow-y: auto;
    margin: 0;
    padding: 3px 0;
    list-style: none;
    background: var(--panel);
    border: 1px solid var(--panel-border-strong);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
  }
  li {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    font-size: 12px;
    color: var(--text);
    white-space: nowrap;
    cursor: pointer;
  }
  li.active {
    background: var(--accent-soft);
    color: var(--text-h);
  }
  li.chosen {
    color: var(--accent);
  }
</style>
