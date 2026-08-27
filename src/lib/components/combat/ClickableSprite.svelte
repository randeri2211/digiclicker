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
  .sprite-click-target img {
    width: 220px;
    height: 220px;
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
