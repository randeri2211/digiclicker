<script lang="ts" module>
  export interface ContextMenuItem {
    label: string;
    onSelect: () => void;
    disabled?: boolean;
  }
</script>

<script lang="ts">
  interface Props {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
  }

  const { x, y, items, onClose }: Props = $props();

  let menuEl: HTMLDivElement | undefined = $state();

  // Clamp so the menu never renders off the right/bottom edge of the
  // viewport for slots clicked near an edge.
  const style = $derived.by(() => {
    const width = menuEl?.offsetWidth ?? 0;
    const height = menuEl?.offsetHeight ?? 0;
    const left = Math.min(x, window.innerWidth - width - 8);
    const top = Math.min(y, window.innerHeight - height - 8);
    return `left: ${Math.max(8, left)}px; top: ${Math.max(8, top)}px;`;
  });

  function selectItem(item: ContextMenuItem) {
    if (item.disabled) return;
    item.onSelect();
    onClose();
  }

  $effect(() => {
    function handleWindowClick(e: MouseEvent) {
      if (menuEl && !menuEl.contains(e.target as Node)) onClose();
    }
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('click', handleWindowClick);
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('click', handleWindowClick);
      window.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div class="menu" bind:this={menuEl} style={style} role="menu">
  {#each items as item (item.label)}
    <button
      class="menu-item"
      class:disabled={item.disabled}
      role="menuitem"
      disabled={item.disabled}
      onclick={() => selectItem(item)}
    >
      {item.label}
    </button>
  {/each}
</div>

<style>
  .menu {
    position: fixed;
    z-index: 30;
    min-width: 180px;
    background: var(--panel);
    border: 1px solid var(--panel-border-strong);
    display: flex;
    flex-direction: column;
    padding: 4px;
  }
  .menu-item {
    appearance: none;
    font: inherit;
    font-family: var(--mono);
    text-align: left;
    background: none;
    border: none;
    color: var(--text-h);
    font-size: 12px;
    padding: 8px 10px;
    cursor: pointer;
  }
  .menu-item:hover:not(.disabled) {
    background: var(--panel-2);
    color: var(--accent);
  }
  .menu-item.disabled {
    color: var(--text-dim);
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
