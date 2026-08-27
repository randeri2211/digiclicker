<script lang="ts">
  interface Props {
    chancePercent: number;
  }

  const { chancePercent }: Props = $props();
</script>

<div class="tame-readout">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1.6" />
  </svg>
  Tame chance on defeat: <b>{chancePercent}%</b>
</div>

<style>
  .tame-readout {
    margin-top: 22px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: var(--text);
  }
  .tame-readout b {
    color: var(--pos);
  }
</style>
