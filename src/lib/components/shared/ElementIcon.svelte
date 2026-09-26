<script lang="ts">
  import { getElementIconUrl } from '../../game/images';
  import { ELEMENT_COLOR } from './elementColors';
  import type { Element } from '../../game/types';

  // An element's icon, or its coloured dot where there's no icon (Neutral).
  interface Props {
    element: Element;
    size?: number;
  }

  const { element, size = 14 }: Props = $props();
  const url = $derived(getElementIconUrl(element));
</script>

{#if url}
  <img class="icon" src={url} alt="" width={size} height={size} title={element} />
{:else}
  <i class="dot" style:width="{Math.round(size * 0.5)}px" style:height="{Math.round(size * 0.5)}px" style:background={ELEMENT_COLOR[element] ?? ELEMENT_COLOR.Neutral} title={element}></i>
{/if}

<style>
  .icon {
    object-fit: contain;
    flex-shrink: 0;
  }
  .dot {
    display: inline-block;
    border-radius: 50%;
    flex-shrink: 0;
  }
</style>
