<script lang="ts">
  interface Props {
    onClick: () => void;
  }

  const { onClick }: Props = $props();
</script>

<div
  class="icon-btn"
  title="Compendium"
  onclick={onClick}
  onkeydown={(e) => e.key === 'Enter' && onClick()}
  role="button"
  tabindex="0"
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M4 5.5C4 4.67157 4.67157 4 5.5 4H12V20H5.5C4.67157 20 4 19.3284 4 18.5V5.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
    <path d="M20 5.5C20 4.67157 19.3284 4 18.5 4H12V20H18.5C19.3284 20 20 19.3284 20 18.5V5.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
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
