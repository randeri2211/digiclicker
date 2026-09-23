<script lang="ts">
  import { levelProgress } from '../../game/combat/levelCurve';

  interface Props {
    xp: number;
    /** Show "into / needed XP" under the bar (the Stats window); cards and
     * list rows keep just the bar. */
    showNumbers?: boolean;
  }

  const { xp, showNumbers = false }: Props = $props();

  const progress = $derived(levelProgress(xp));
  const percent = $derived(Math.round(progress.fraction * 100));
  const fmt = (n: number) => Math.floor(n).toLocaleString();
</script>

<div class="xp">
  <div
    class="track"
    class:max={progress.isMax}
    role="progressbar"
    aria-label={progress.isMax ? 'Max level' : `XP toward level ${progress.level + 1}`}
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={percent}
    title={progress.isMax ? 'Max level' : `${fmt(progress.into)} / ${fmt(progress.needed)} XP to Lv ${progress.level + 1}`}
  >
    <div class="fill" style="width: {percent}%"></div>
  </div>
  {#if showNumbers}
    <div class="numbers">
      {#if progress.isMax}
        Max level
      {:else}
        <span>{fmt(progress.into)} / {fmt(progress.needed)} XP</span>
        <span class="next">to Lv {progress.level + 1}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .xp {
    display: flex;
    flex-direction: column;
    gap: 3px;
    width: 100%;
  }
  .track {
    height: 4px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.25s ease-out;
  }
  .track.max .fill {
    background: var(--pos);
  }
  .numbers {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 10px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .next {
    color: var(--text-dim);
  }
  @media (prefers-reduced-motion: reduce) {
    .fill {
      transition: none;
    }
  }
</style>
