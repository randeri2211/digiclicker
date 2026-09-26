<script lang="ts">
  import { getRosterList, isReadyToDigivolve } from '../../game/state/game.svelte';

  interface Props {
    onClick: () => void;
  }

  const { onClick }: Props = $props();

  const readyCount = $derived(getRosterList().filter(isReadyToDigivolve).length);
</script>

<button class="evolve-btn" class:inactive={readyCount === 0} onclick={onClick} data-tip="evolve">
  <span class="evolve-icon">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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
  </span>
  <span class="evolve-copy">
    <span class="evolve-label">Evolution</span>
    <span class="evolve-sub">{readyCount} ready to digivolve</span>
  </span>
  <span class="evolve-chevron">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </span>
</button>

<style>
  .evolve-btn {
    appearance: none;
    font: inherit;
    font-family: var(--mono);
    text-align: left;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 14px;
    margin-bottom: 24px;
    background: var(--pos-soft);
    border: 1px solid rgba(57, 255, 136, 0.4);
    color: var(--text-h);
    cursor: pointer;
  }
  .evolve-btn:hover {
    border-color: var(--pos);
  }
  .evolve-btn.inactive {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .evolve-btn .evolve-icon {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--pos);
  }
  .evolve-btn .evolve-copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
  .evolve-btn .evolve-label {
    font-family: var(--head);
    font-size: 13px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  .evolve-btn .evolve-sub {
    font-size: 11px;
    color: var(--pos);
  }
  .evolve-btn .evolve-chevron {
    margin-left: auto;
    color: var(--text-dim);
  }
</style>
