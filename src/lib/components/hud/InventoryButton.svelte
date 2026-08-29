<script lang="ts">
  interface Props {
    onClick: () => void;
  }

  const { onClick }: Props = $props();
</script>

<div
  class="icon-btn"
  title="Inventory"
  onclick={onClick}
  onkeydown={(e) => e.key === 'Enter' && onClick()}
  role="button"
  tabindex="0"
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M4 8L12 4L20 8V18C20 18.5523 19.5523 19 19 19H5C4.44772 19 4 18.5523 4 18V8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
    <path d="M4 8L12 12L20 8" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
    <path d="M12 12V19" stroke="currentColor" stroke-width="1.6" />
  </svg>
</div>

<style>
  .icon-btn {
    position: relative;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    color: var(--text-h);
    cursor: pointer;
  }
  .icon-btn:hover {
    border-color: var(--panel-border-strong);
  }
</style>
