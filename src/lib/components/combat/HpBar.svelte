<script lang="ts">
  interface Props {
    current: number;
    max: number;
  }

  const { current, max }: Props = $props();
  const percent = $derived(max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0);
</script>

<div class="hp-bar-wrap">
  <div class="hp-bar-track">
    <div class="hp-bar-fill" style:width="{percent}%"></div>
  </div>
  <div class="hp-text">
    <span>HP</span>
    <span>{Math.max(0, Math.round(current))} / {max}</span>
  </div>
</div>

<style>
  .hp-bar-wrap {
    width: 340px;
    margin-bottom: 26px;
  }
  .hp-bar-track {
    height: 14px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    position: relative;
    overflow: hidden;
  }
  .hp-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--pos), #1fce6e);
    box-shadow: 0 0 10px rgba(57, 255, 136, 0.5);
    transition: width 150ms linear;
  }
  .hp-text {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text);
    margin-top: 6px;
  }
</style>
