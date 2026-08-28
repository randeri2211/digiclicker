<script lang="ts">
  interface Props {
    onClick: () => void;
  }

  const { onClick }: Props = $props();
</script>

<div
  class="icon-btn"
  title="Digimon Hub"
  onclick={onClick}
  onkeydown={(e) => e.key === 'Enter' && onClick()}
  role="button"
  tabindex="0"
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.6" />
    <rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.6" />
    <rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.6" />
    <rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.6" />
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
