<script lang="ts">
  import { AREA_LABEL, AREA_NAME } from '../../game/roster/starterRoster';
</script>

<div class="area-label">{AREA_LABEL}</div>
<div class="area-name">{AREA_NAME}</div>

<style>
  .area-label {
    font-size: 12px;
    letter-spacing: 3px;
    color: var(--text-dim);
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .area-name {
    font-family: var(--head);
    font-size: 22px;
    font-weight: 700;
    color: var(--text-h);
    letter-spacing: 1px;
    margin-bottom: 20px;
  }
</style>
