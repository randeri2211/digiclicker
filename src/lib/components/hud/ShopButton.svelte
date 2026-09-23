<script lang="ts">
  interface Props {
    onClick: () => void;
  }

  const { onClick }: Props = $props();
</script>

<div
  class="icon-btn"
  title="Shop"
  onclick={onClick}
  onkeydown={(e) => e.key === 'Enter' && onClick()}
  role="button"
  tabindex="0"
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M4 9L5.5 4H18.5L20 9" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
    <path d="M4 9V19C4 19.5523 4.44772 20 5 20H19C19.5523 20 20 19.5523 20 19V9" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
    <path d="M4 9H20" stroke="currentColor" stroke-width="1.6" />
    <path d="M9 20V14H15V20" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
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
