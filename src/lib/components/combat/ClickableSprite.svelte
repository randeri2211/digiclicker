<script lang="ts">
  import DamagePopup from './DamagePopup.svelte';
  import type { DamagePopupState } from '../../game/types';

  interface Props {
    spriteUrl: string | null;
    popup: DamagePopupState | null;
    onClick: () => void;
  }

  const { spriteUrl, popup, onClick }: Props = $props();
</script>

<button class="sprite-click-target" onclick={onClick} aria-label="Attack">
  <div class="sprite-ring"></div>
  {#if spriteUrl}
    <img src={spriteUrl} alt="wild digimon" />
  {/if}
  <DamagePopup {popup} />
</button>

<style>
  .sprite-click-target {
    appearance: none;
    background: none;
    border: none;
    padding: 0;
    position: relative;
    cursor: pointer;
  }
  /* Fills what the arena has left after the name tag, HP and timer bars
     (~150px), capped at 220px - cqh is the arena's height. */
  .sprite-click-target img {
    width: clamp(64px, calc(100cqh - 150px), 220px);
    height: clamp(64px, calc(100cqh - 150px), 220px);
    object-fit: contain;
    filter: drop-shadow(0 0 24px rgba(34, 211, 238, 0.25));
  }
  .sprite-ring {
    position: absolute;
    inset: -18px;
    border: 1px dashed var(--panel-border-strong);
    border-radius: 50%;
  }
</style>
