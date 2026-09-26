<script lang="ts">
  import { getAttributeIconUrl } from '../../game/images';

  // An attribute value's icon (data/typeIcons.json maps odd values, e.g.
  // Unidentified -> Unknown, None -> No Data); nothing if it has none.
  interface Props {
    attribute: string;
    size?: number;
  }

  const { attribute, size = 14 }: Props = $props();
  const url = $derived(getAttributeIconUrl(attribute));
</script>

{#if url}
  <img class="icon" src={url} alt="" width={size} height={size} title={attribute} />
{/if}

<style>
  .icon {
    object-fit: contain;
    flex-shrink: 0;
  }
</style>
