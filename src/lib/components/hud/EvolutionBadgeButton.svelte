<script lang="ts">
  import { team, isReadyToDigivolve } from '../../game/state/game.svelte';

  interface Props {
    onClick: () => void;
  }

  const { onClick }: Props = $props();

  const readyCount = $derived(
    [...team.activeMembers, ...team.trainingMembers].filter(isReadyToDigivolve).length
  );
</script>

<div
  class="icon-btn"
  title="Ready to digivolve"
  onclick={onClick}
  onkeydown={(e) => e.key === 'Enter' && onClick()}
  role="button"
  tabindex="0"
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="2.3" r="1" stroke="currentColor" stroke-width="1.4" />
    <rect x="6" y="3.6" width="12" height="17" rx="6" stroke="currentColor" stroke-width="1.6" />
    <rect x="8.7" y="7" width="6.6" height="5" rx="1" stroke="currentColor" stroke-width="1.4" />
    <path
      d="M10.3 10.2l1.7-1.9 1.7 1.9"
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle cx="9.3" cy="16.3" r="0.9" stroke="currentColor" stroke-width="1.3" />
    <circle cx="14.7" cy="16.3" r="0.9" stroke="currentColor" stroke-width="1.3" />
  </svg>
  <span class="badge">{readyCount}</span>
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
  .badge {
    position: absolute;
    top: -7px;
    right: -7px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    background: var(--warn);
    color: #1a1300;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
  }
</style>
