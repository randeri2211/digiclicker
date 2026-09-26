<script lang="ts">
  import { getAttributeIconUrl } from '../../game/images';

  // An attribute's icon (Vaccine, Data, Virus, Free, Variable, Unknown,
  // No Data - the odd values in the data map to the last two).
  interface Props {
    attribute: string;
    size?: number;
  }

  const { attribute, size = 14 }: Props = $props();
</script>

<img class="icon" src={getAttributeIconUrl(attribute)} alt="" width={size} height={size} title={attribute} />

<style>
  .icon {
    object-fit: contain;
    flex-shrink: 0;
  }
</style>
