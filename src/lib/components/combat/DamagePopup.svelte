<script lang="ts">
  import type { DamagePopupState } from '../../game/types';

  interface Props {
    popup: DamagePopupState | null;
  }

  const { popup }: Props = $props();
</script>

{#if popup}
  {#key popup.id}
    <div class="dmg-pop">-{Math.round(popup.amount)}</div>
  {/key}
{/if}

<style>
  .dmg-pop {
    position: absolute;
    top: 20px;
    right: -10px;
    font-family: var(--head);
    font-size: 26px;
    font-weight: 800;
    color: var(--warn);
    text-shadow: 0 0 10px rgba(255, 176, 32, 0.6);
    animation: float-fade 600ms ease-out forwards;
    pointer-events: none;
  }

  @keyframes float-fade {
    0% {
      opacity: 1;
      transform: translateY(0);
    }
    100% {
      opacity: 0;
      transform: translateY(-18px);
    }
  }
</style>
